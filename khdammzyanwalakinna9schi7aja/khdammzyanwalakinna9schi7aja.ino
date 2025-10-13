#include <SoftwareSerial.h>
#include <string.h>
#include <stdlib.h>
#include <avr/interrupt.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ================= LCD =================
#define LCD_ADDR 0x27
LiquidCrystal_I2C lcd(LCD_ADDR, 20, 4);

// ================= SIM900 =================
const uint8_t SIM_RX = 7;      // Arduino RX <= SIM900 TX
const uint8_t SIM_TX = 8;      // Arduino TX => SIM900 RX
SoftwareSerial sim900(SIM_RX, SIM_TX);

// APN (primary + fallback)
const char APN1[] = "iamgprs1.ma";
const char APN2[] = "internet";

// Periods
const unsigned long MEASURE_PERIOD_MS = 1000;  // measure window: 1 s
const unsigned long POST_PERIOD_MS    = 3000;  // post every 3 s

// API (HTTP only)
const char POST_URL[] = "http://213.199.35.129:5002/api/v1/readings";
const char CFG_URL[]  = "http://213.199.35.129:5002/api/v1/config";

// ================= X9C =================
const uint8_t INC = 2;
const uint8_t UD  = 3;
const uint8_t CS1 = 4;   // Vh
const uint8_t CS2 = 6;   // Delta (unused here)
const uint8_t CS3 = 10;  // Vb

// Your calibrated voltage ranges
const float Vmin_CS3 = 0.2477f, Vmax_CS3 = 1.8489f; // Low  (CS3 -> Vb)
const float Vmin_CS1 = 0.9419f, Vmax_CS1 = 4.5122f; // High (CS1 -> Vh)

// Positions
int pos1=-1,pos2=-1,pos3=-1;                  // actual X9C positions
int rampDir=+1; int rampPos1=0, rampPos3=0;   // ramp targets

// ================= Pulse counter on T1 (D5) =================
void initPulseCounter(){
  pinMode(5, INPUT);
  TCCR1A=0; TCCR1B=0; TCNT1=0;
  // external clock on T1 pin, rising edge
  TCCR1B |= (1<<CS12)|(1<<CS11)|(1<<CS10);
}
unsigned int readPulsesAtomic(){
  uint8_t s=SREG; cli();
  uint16_t v=TCNT1;
  SREG=s;
  return v;
}

// ================= Serial RX buffer helpers =================
#define RXBUF_SZ 512
static char rxbuf[RXBUF_SZ];
static uint16_t rxi=0;

inline void rxReset(){ rxi=0; rxbuf[0]='\0'; }
inline void rxAppend(char c){ if (rxi < RXBUF_SZ-1){ rxbuf[rxi++]=c; rxbuf[rxi]='\0'; } }
inline bool rxContains(const char* t){ return strstr(rxbuf,t)!=nullptr; }

void sendAT(const char* cmd){ sim900.println(cmd); }

bool pumpUntil(const char* token){
  while (sim900.available()) rxAppend((char)sim900.read());
  return token ? rxContains(token) : (rxi>0);
}

bool waitForTok(const char* tok, unsigned long tmo){
  unsigned long t0 = millis();
  rxReset();
  while (millis() - t0 < tmo){
    if (pumpUntil(tok)) return true;
    delay(2);
  }
  return false;
}

void rxTrimIfHuge(){
  if (rxi > RXBUF_SZ-64){
    memmove(rxbuf, rxbuf + (RXBUF_SZ-128), 128);
    rxi = 128; rxbuf[rxi]='\0';
  }
}

// ================= Voltage helpers =================
float posToVoltage(int pos, float Vmin, float Vmax) {
  if (Vmax < Vmin) { float t=Vmin; Vmin=Vmax; Vmax=t; }
  if (pos < 0) pos = 0; if (pos > 99) pos = 99;
  return Vmin + (Vmax - Vmin) * (float)pos / 99.0f;
}
int voltageToPos(float V,float Vmin,float Vmax){
  if (Vmax < Vmin) { float t=Vmin; Vmin=Vmax; Vmax=t; }
  if (V <= Vmin) return 0; if (V >= Vmax) return 99;
  return (int)((((double)V - Vmin)*99.0)/(Vmax - Vmin) + 0.5);
}

// ================= LCD =================
void updateLCD(unsigned int pps, int posVh, int posVb, const char* api){
  float Vh = posToVoltage(posVh, Vmin_CS1, Vmax_CS1);
  float Vb = posToVoltage(posVb, Vmin_CS3, Vmax_CS3);
  float Vm = (Vb + Vh)/2;
  lcd.setCursor(0,0); lcd.print("Rad-Monitoting");
  lcd.setCursor(0,1); lcd.print("Intensity:"); lcd.print(pps); lcd.print("CPS");
  lcd.setCursor(0,2);
  lcd.print("HLD:"); lcd.print(Vh, 2); lcd.print("V ");
  lcd.print("LLD:"); lcd.print(Vb, 2); lcd.print("V ");
  lcd.setCursor(0,3);
  lcd.print("V:"); lcd.print(Vm, 2); lcd.print("V  "); 
  lcd.print("API: "); lcd.print(api);
  static bool b=false; b=!b; lcd.setCursor(19,3); lcd.print(b?"*":" ");
}

// ================= X9C helpers =================
void pulseINC(){ digitalWrite(INC,LOW); delayMicroseconds(5); digitalWrite(INC,HIGH); delayMicroseconds(5); }
void x9cInit(uint8_t cs){ pinMode(UD,OUTPUT); pinMode(INC,OUTPUT); pinMode(cs,OUTPUT); digitalWrite(INC,HIGH); digitalWrite(cs,HIGH); }
void x9cHome(uint8_t cs, int &posRef){ digitalWrite(cs,LOW); digitalWrite(UD,LOW); for(int i=0;i<110;i++) pulseINC(); digitalWrite(cs,HIGH); posRef=0; }
void x9cGoTo(int target, uint8_t cs, int &posRef){
  target=constrain(target,0,99); if(posRef<0) posRef=0; int d=target-posRef; if(d==0) return;
  digitalWrite(cs,LOW);
  if(d>0){ digitalWrite(UD,HIGH); for(int i=0;i< d ;i++) pulseINC(); }
  else    { digitalWrite(UD,LOW ); for(int i=0;i<-d ;i++) pulseINC(); }
  digitalWrite(cs,HIGH); posRef=target;
}

// ================= parse +HTTPACTION =================
bool parseHTTPACTION(int &status, int &length){
  status=-1; length=-1;
  const char* last=nullptr; const char* p=rxbuf;
  while (true){ const char* q=strstr(p, "+HTTPACTION:"); if(!q) break; last=q; p=q+12; }
  if (!last) return false;
  const char* lineEnd = strchr(last, '\n'); if(!lineEnd) return false;
  char line[96]; size_t n=(size_t)(lineEnd-last); if(n>=sizeof(line)) n=sizeof(line)-1;
  memcpy(line,last,n); line[n]='\0';
  for(size_t i=0,j=0;i<=n;++i){ if(line[i]!=' ') line[j++]=line[i]; }
  const char* c1=strchr(line, ','); const char* c2=c1?strchr(c1+1, ','):nullptr; if(!c1||!c2) return false;
  status=atoi(c1+1); length=atoi(c2+1); return true;
}

// ================= Non-blocking HTTP POST FSM =================
enum PostState : uint8_t {
  P_IDLE=0, P_WAIT_SAPBR,
  P_WAIT_HTTPINIT_OK,
  P_WAIT_CID_OK,
  P_WAIT_URL_OK,
  P_WAIT_CONTENT_OK,
  P_WAIT_DOWNLOAD,
  P_WAIT_DATA_OK,
  P_WAIT_ACTION,
  P_DONE_OK, P_DONE_ERR
};

PostState pstate = P_IDLE;
unsigned long pstateStart=0, ptimeout=0;
unsigned int  wantPPS=0;

const unsigned long T_SAPBR   = 2000;
const unsigned long T_STDOK   = 4000;
const unsigned long T_DOWNLOAD= 2000;
const unsigned long T_ACTION  = 12000;

char postBody[48];

void startPost(unsigned int pps){
  snprintf(postBody, sizeof(postBody), "{\"comptage\":%u}", (unsigned)pps);
  rxReset();
  sim900.listen();
  sendAT("AT+SAPBR=2,1");
  pstate      = P_WAIT_SAPBR;
  pstateStart = millis();
  ptimeout    = T_SAPBR;
  wantPPS     = pps;
}
void abortPost(bool error){
  sendAT("AT+HTTPTERM"); // best effort
  pstate = error ? P_DONE_ERR : P_DONE_OK;
  ptimeout = 0;
}

void postStep(){
  pumpUntil(nullptr); rxTrimIfHuge();
  unsigned long now = millis();
  if (pstate==P_IDLE || pstate==P_DONE_OK || pstate==P_DONE_ERR) return;
  if (ptimeout && (now - pstateStart) > ptimeout){ abortPost(true); return; }

  switch(pstate){
    case P_WAIT_SAPBR:
      if (rxContains("+SAPBR: 1,1") && !rxContains("0.0.0.0")){
        rxReset(); sendAT("AT+HTTPINIT");
        pstate=P_WAIT_HTTPINIT_OK; pstateStart=now; ptimeout=T_STDOK;
      } else if ((now - pstateStart) > ptimeout){
        rxReset(); sendAT("AT+HTTPINIT");
        pstate=P_WAIT_HTTPINIT_OK; pstateStart=now; ptimeout=T_STDOK;
      }
      break;
    case P_WAIT_HTTPINIT_OK:
      if (rxContains("OK")){ rxReset(); sendAT("AT+HTTPPARA=\"CID\",1"); pstate=P_WAIT_CID_OK; pstateStart=now; ptimeout=T_STDOK; }
      break;
    case P_WAIT_CID_OK:
      if (rxContains("OK")){
        rxReset(); char cmd[240];
        snprintf(cmd,sizeof(cmd),"AT+HTTPPARA=\"URL\",\"%s\"", POST_URL);
        sendAT(cmd); pstate=P_WAIT_URL_OK; pstateStart=now; ptimeout=T_STDOK;
      }
      break;
    case P_WAIT_URL_OK:
      if (rxContains("OK")){ rxReset(); sendAT("AT+HTTPPARA=\"CONTENT\",\"application/json\""); pstate=P_WAIT_CONTENT_OK; pstateStart=now; ptimeout=T_STDOK; }
      break;
    case P_WAIT_CONTENT_OK:
      if (rxContains("OK")){
        rxReset(); char cmd[40];
        snprintf(cmd,sizeof(cmd),"AT+HTTPDATA=%u,10000",(unsigned)strlen(postBody));
        sendAT(cmd); pstate=P_WAIT_DOWNLOAD; pstateStart=now; ptimeout=T_DOWNLOAD;
      }
      break;
    case P_WAIT_DOWNLOAD:
      if (rxContains("DOWNLOAD")){ sim900.print(postBody); pstate=P_WAIT_DATA_OK; pstateStart=now; ptimeout=T_STDOK; }
      break;
    case P_WAIT_DATA_OK:
      if (rxContains("OK")){ rxReset(); sendAT("AT+HTTPACTION=1"); pstate=P_WAIT_ACTION; pstateStart=now; ptimeout=T_ACTION; }
      break;
    case P_WAIT_ACTION: {
      int st=-1,len=-1;
      if (parseHTTPACTION(st,len)){
        if (len>0){ rxReset(); sendAT("AT+HTTPREAD"); /* best-effort */ }
        rxReset(); sendAT("AT+HTTPTERM");
        pstate=P_DONE_OK;
      }
    } break;
    default: break;
  }
}

// ================= GET helpers (robust, with logs) =================
bool bearerReadyQuick() {
  rxReset();
  sendAT("AT+SAPBR=2,1");
  waitForTok("+SAPBR:", 1200);
  return (strstr(rxbuf, "+SAPBR: 1,1") && !strstr(rxbuf, "0.0.0.0"));
}
bool ensureBearerOpen(unsigned long totalTmoMs = 7000) {
  unsigned long t0 = millis();
  if (bearerReadyQuick()) return true;
  sendAT("AT+SAPBR=1,1");
  while (millis() - t0 < totalTmoMs) {
    if (bearerReadyQuick()) return true;
    delay(200);
  }
  return false;
}

bool httpGET_CFG(char* bodyOut, size_t bodyOutSz, int &status){
  status = -1; rxReset(); sim900.listen();

  Serial.println(F("[GET] start /api/v1/config"));

  if (!ensureBearerOpen(8000)) {
    Serial.println(F("[GET] Bearer not ready"));
    return false;
  }
  Serial.println(F("[GET] Bearer OK"));

  sendAT("AT+HTTPTERM"); waitForTok("OK", 300);
  Serial.println(F("[GET] HTTPTERM (cleanup)"));

  // Try HTTPINIT twice if needed
  const uint8_t GET_RETRIES = 2;
  bool inited = false;
  for (uint8_t a=0; a<GET_RETRIES && !inited; ++a) {
    sendAT("AT+HTTPINIT");
    if (waitForTok("OK", 5000)) { inited = true; break; }
    Serial.println(F("[GET] HTTPINIT not OK, retrying..."));
    sendAT("AT+HTTPTERM"); waitForTok("OK", 300);
    delay(200);
  }
  if (!inited) { Serial.println(F("[GET] HTTPINIT FAIL")); return false; }
  Serial.println(F("[GET] HTTPINIT OK"));

  sendAT("AT+HTTPPARA=\"CID\",1"); if(!waitForTok("OK", 1200)){ Serial.println(F("[GET] CID FAIL")); return false; }
  Serial.println(F("[GET] CID OK"));

  char cmd[240];
  snprintf(cmd,sizeof(cmd),"AT+HTTPPARA=\"URL\",\"%s\"", CFG_URL);
  sendAT(cmd);                      if(!waitForTok("OK", 2000)){ Serial.println(F("[GET] URL SET FAIL")); return false; }
  Serial.print(F("[GET] URL OK: ")); Serial.println(CFG_URL);

  sendAT("AT+HTTPACTION=0");
  if(!waitForTok("+HTTPACTION:", 12000)){ Serial.println(F("[GET] ACTION TIMEOUT")); return false; }
  int length=-1; if(!parseHTTPACTION(status,length)){ Serial.println(F("[GET] ACTION PARSE FAIL")); return false; }
  Serial.print(F("[GET] ACTION status=")); Serial.print(status);
  Serial.print(F(" length=")); Serial.println(length);

  if (status!=200 || length<=0){
    sendAT("AT+HTTPTERM"); waitForTok("OK", 300);
    Serial.println(F("[GET] BAD STATUS or ZERO LENGTH"));
    return false;
  }

  char rcmd[40]; snprintf(rcmd,sizeof(rcmd),"AT+HTTPREAD=0,%d", length);
  sendAT(rcmd);
  if(!waitForTok("\r\nOK", 6000)) { 
    sendAT("AT+HTTPTERM"); waitForTok("OK", 300); 
    Serial.println(F("[GET] HTTPREAD TIMEOUT"));
    return false; 
  }

  char* p = strstr(rxbuf, "\r\n"); if(!p){ sendAT("AT+HTTPTERM"); waitForTok("OK", 300); Serial.println(F("[GET] BODY START NOT FOUND")); return false; }
  p += 2;
  char* okp = strstr(p, "\r\nOK"); if(!okp){ sendAT("AT+HTTPTERM"); waitForTok("OK", 300); Serial.println(F("[GET] BODY END NOT FOUND")); return false; }
  size_t blen = (size_t)(okp - p);
  if (blen >= bodyOutSz) blen = bodyOutSz-1;
  memmove(bodyOut, p, blen); bodyOut[blen]='\0';

  sendAT("AT+HTTPTERM");           waitForTok("OK", 300);
  Serial.print(F("[GET] READ OK, bytes=")); Serial.println(blen);
  size_t n = blen; if (n>120) n=120;
  Serial.print(F("[GET body] "));
  for (size_t i=0;i<n;i++){ char c=bodyOut[i]; Serial.print((c=='\r'||c=='\n')?' ':c); }
  if (blen>n) Serial.print(F(" ..."));
  Serial.println();
  Serial.println(F("[GET] DONE"));
  return true;
}

bool jsonGetNumber(const char* json, const char* key, float &out){
  char pat[32]; snprintf(pat,sizeof(pat),"\"%s\"",key);
  const char* k=strstr(json, pat); if(!k) return false;
  const char* c=strchr(k, ':'); if(!c) return false;
  do{ ++c; } while(*c==' ');
  char num[24]; size_t i=0;
  while(*c && i<sizeof(num)-1){
    char ch=*c;
    if((ch>='0'&&ch<='9')||ch=='.'||ch=='+'||ch=='-'||ch=='e'||ch=='E'){ num[i++]=ch; ++c; }
    else break;
  }
  num[i]='\0'; if(i==0) return false; out=atof(num); return true;
}

bool api_read_config(float &Vb, float &Vh, float &delta){
  char body[256]; int status=-1;
  if(!httpGET_CFG(body, sizeof(body), status)) {
    Serial.println(F("[GET parsed] FAIL"));
    return false;
  }
  const char* lb = strchr(body,'{'); const char* rb = strrchr(body,'}');
  if(!lb || !rb || rb<=lb) { Serial.println(F("[GET parsed] JSON BOUNDS FAIL")); return false; }
  float _Vb=0,_Vh=0,_d=0; bool k1=false,k2=false,k3=false;
  k1 = jsonGetNumber(lb,"Vb",_Vb);
  k2 = jsonGetNumber(lb,"Vh",_Vh);
  k3 = jsonGetNumber(lb,"delta",_d);

  Serial.print(F("[GET parsed] ")); 
  if(k1){ Serial.print(F("Vb=")); Serial.print(_Vb,3); Serial.print(' '); }
  if(k2){ Serial.print(F("Vh=")); Serial.print(_Vh,3); Serial.print(' '); }
  if(k3){ Serial.print(F("delta=")); Serial.print(_d,3); }
  Serial.println();

  if(!(k1||k2||k3)) return false;
  if(k1) Vb=_Vb; if(k2) Vh=_Vh; if(k3) delta=_d;

  int t1 = voltageToPos(Vh, Vmin_CS1, Vmax_CS1);
  int t3 = voltageToPos(Vb, Vmin_CS3, Vmax_CS3);
  Serial.print(F("[GET parsed] targets -> VhPos=")); Serial.print(t1);
  Serial.print(F(" VbPos=")); Serial.println(t3);

  return true;
}

// ================= Coordination: queue GET after each triangular ramp =================
bool getInProgress = false;     // true only while GET is executing
bool pendingGet    = false;     // set at bottom; cleared once GET runs

// ================= MAIN =================
unsigned int lastPulses=0, lastMeasuredPPS=0;
unsigned long lastMeasureMs=0, nextMeasureMs=0, nextPostMs=0;
unsigned long httpEnableAtMs=0;
unsigned long postCount=0;

void setup(){
  Serial.begin(9600);
  sim900.begin(9600);

  Wire.begin(); Wire.setClock(100000);
  lcd.init(); lcd.backlight(); lcd.clear();
  lcd.setCursor(0,0); lcd.print("   INITIALISATION  ");
  lcd.setCursor(0,1); lcd.print("    SIM900 + X9C    ");
  lcd.setCursor(0,2); lcd.print("  Patientez SVP...  ");
  delay(600);

  // Modem bring-up (no HTTP yet)
  sim900.listen();
  sendAT("AT+CPIN?");  delay(200);
  sendAT("ATE0");      delay(200);
  sendAT("AT+CFUN=1"); delay(800);

  sendAT("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\""); delay(150);
  // Try both APNs; module keeps last that succeeds
  char apn[64];
  snprintf(apn,sizeof(apn),"AT+SAPBR=3,1,\"APN\",\"%s\"",APN1); sim900.println(apn); delay(150);
  snprintf(apn,sizeof(apn),"AT+SAPBR=3,1,\"APN\",\"%s\"",APN2); sim900.println(apn);

  sendAT("AT+SAPBR=1,1"); delay(500);
  sendAT("AT+SAPBR=2,1"); delay(400);
  sendAT("AT+CSQ");       delay(500);

  httpEnableAtMs = millis() + 8000UL; // warm-up

  // X9C + pulses
  x9cInit(CS1); x9cInit(CS2); x9cInit(CS3);
  x9cHome(CS1,pos1); x9cHome(CS2,pos2); x9cHome(CS3,pos3);
  initPulseCounter();

  lastMeasureMs = millis();
  nextMeasureMs = lastMeasureMs + MEASURE_PERIOD_MS;
  nextPostMs    = millis() + POST_PERIOD_MS;

  lcd.clear();
  lcd.setCursor(0,1); lcd.print("   SYSTEME PRET!   ");
  delay(500); lcd.clear();

  Serial.println(F("== 1s measure / 3s POST (FSM) + GET /config after each triangle, volts on LCD =="));
}

void loop(){
  unsigned long now = millis();

  // ---- 1) Tick each 1 s: ramp + apply + measure + LCD
  if ((long)(now - nextMeasureMs) >= 0){
    // Ramp
    rampPos1 += rampDir * 15; rampPos3 += rampDir * 15;
    if (rampPos1 >= 99 || rampPos3 >= 99){ rampPos1=99; rampPos3=99; rampDir=-1; }
    if (rampPos1 <= 0  || rampPos3 <= 0 ){
      rampPos1=0;  rampPos3=0;  rampDir=+1;
      // Finished a full triangle -> queue GET
      if (!pendingGet){
        pendingGet = true;
        Serial.println(F("[Loop] bottom reached -> queue GET"));
      }
    }

    // Apply to pots
    x9cGoTo(rampPos1, CS1, pos1);
    x9cGoTo(rampPos3, CS3, pos3);

    // Measure pulses/s
    unsigned int nowCount = readPulsesAtomic();
    unsigned long dt_ms   = now - lastMeasureMs; if (dt_ms==0) dt_ms=1;

    unsigned int delta;
    static bool first=true;
    if (first){ lastPulses=nowCount; first=false; delta=0; }
    else { delta = (nowCount>=lastPulses)? (nowCount-lastPulses) : (65536u-lastPulses+nowCount); }
    lastPulses=nowCount; lastMeasureMs=now;

    unsigned long pps_ul = ((unsigned long)delta * 1000UL + (dt_ms/2)) / dt_ms;
    if (pps_ul>65535UL) pps_ul=65535UL;
    lastMeasuredPPS = (unsigned int)pps_ul;

    // LCD: show state
    if (pstate==P_IDLE || pstate==P_DONE_OK || pstate==P_DONE_ERR)
      updateLCD(lastMeasuredPPS, pos1, pos3, "WAIT");
    else
      updateLCD(lastMeasuredPPS, pos1, pos3, "POST");

    nextMeasureMs += MEASURE_PERIOD_MS;
    if ((long)(now - nextMeasureMs) >= 0) nextMeasureMs = now + MEASURE_PERIOD_MS;

    // Debug tick (only when not inside HTTP FSM)
    if (pstate==P_IDLE || pstate==P_DONE_OK || pstate==P_DONE_ERR){
      Serial.print(F("[Tick] dt(ms)=")); Serial.print(dt_ms);
      Serial.print(F(" delta=")); Serial.print(delta);
      Serial.print(F(" pps=")); Serial.print(lastMeasuredPPS);
      Serial.print(F(" VhPos=")); Serial.print(pos1);
      Serial.print(F(" VbPos=")); Serial.println(pos3);
    }
  }

  // ---- 2) POST schedule every 3 s (only if idle, warmed up, and not in GET)
  if (millis() >= httpEnableAtMs &&
      (long)(now - nextPostMs) >= 0 &&
      (pstate==P_IDLE || pstate==P_DONE_OK || pstate==P_DONE_ERR) &&
      !getInProgress)
  {
    postCount++;
    Serial.print(F("[POST tick] #")); Serial.println(postCount);

    startPost(lastMeasuredPPS);
    updateLCD(lastMeasuredPPS, pos1, pos3, "POST");
    nextPostMs += POST_PERIOD_MS;
    if ((long)(now - nextPostMs) >= 0) nextPostMs = now + POST_PERIOD_MS;
  }

  // ---- 3) Advance POST FSM
  if (pstate!=P_IDLE && pstate!=P_DONE_OK && pstate!=P_DONE_ERR){
    postStep();
  }

  // ---- 4) POST completion -> if a triangle finished, run GET now
  if (pstate==P_DONE_OK || pstate==P_DONE_ERR){
    // show result
    updateLCD(lastMeasuredPPS, pos1, pos3, (pstate==P_DONE_OK) ? "OK " : "ERR");
    pstate = P_IDLE;

    // If a triangle requested a GET, do it *now* (no overlap with POST)
    if (pendingGet && !getInProgress && millis() >= httpEnableAtMs){
      getInProgress = true;
      pendingGet = false;
      updateLCD(lastMeasuredPPS, pos1, pos3, "CFG");
      Serial.println(F("[Loop] GET /config now (after POST)"));

      float Vb=0, Vh=0, d=0;
      if (api_read_config(Vb, Vh, d)) {
        int t1 = voltageToPos(Vh, Vmin_CS1, Vmax_CS1);
        int t3 = voltageToPos(Vb, Vmin_CS3, Vmax_CS3);
        rampPos1 = t1; rampPos3 = t3;          // update targets
        x9cGoTo(rampPos1, CS1, pos1);          // apply immediately
        x9cGoTo(rampPos3, CS3, pos3);
        updateLCD(lastMeasuredPPS, pos1, pos3, "CFG");
        Serial.println(F("[Loop] Applied config to X9C"));
      } else {
        Serial.println(F("[Loop] GET /config failed (keeping previous targets)"));
      }

      // Push the next POST out so spacing stays clean
      nextPostMs = millis() + POST_PERIOD_MS;
      getInProgress = false;
    }
  }

  delay(2);
}
