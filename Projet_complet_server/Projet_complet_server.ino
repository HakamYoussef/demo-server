#include <SoftwareSerial.h>

// ===================== CONFIG SIM900 =====================
const int SIM_RX = 7;   // Arduino RX <= SIM900 TX
const int SIM_TX = 8;   // Arduino TX => SIM900 RX
SoftwareSerial sim900(SIM_RX, SIM_TX);

const char SIM_PIN[] = "8256";
const char APN1[]    = "iamgprs1.ma";
const char APN2[]    = "internet";

const unsigned long CMD_TIMEOUT    = 8000;
const unsigned long ACTION_TIMEOUT = 30000;
const unsigned long STEP_PERIOD_MS = 15000;  // 15s entre pas

// === API (Node server on port 5002) ===
const char CFG_URL[]  = "http://213.199.35.129:5002/api/v1/config";
const char POST_URL[] = "http://213.199.35.129:5002/api/v1/readings";
// ========================================================


// ===================== X9C CONFIG =====================
const int INC = 2;
const int UD  = 3;
const int CS1 = 4;   // Haut  (Vh)
const int CS2 = 6;   // Delta (delta)
const int CS3 = 10;  // Bas   (Vb)

// Bornes mesurées (tes valeurs originales)
const float Vmin_CS3 = 0.2477, Vmax_CS3 = 1.8489; // Bas
const float Vmin_CS1 = 0.9419, Vmax_CS1 = 4.5122; // Haut
const float Vmin_CS2 = 0.0,    Vmax_CS2 = 5.0;    // Delta

int pos1 = -1, pos2 = -1, pos3 = -1;  // mémoires positions X9C
// ========================================================


// ==================== FORWARD DECLS =====================
bool httpInit();
bool api_read_config(float &Vb, float &Vh, float &delta);
bool api_post_comptage(unsigned int pulses);
// ========================================================


// ==================== SIM900 HELPERS ====================
String readAll(unsigned long timeout = CMD_TIMEOUT) {
  unsigned long t0 = millis();
  String resp;
  while (millis() - t0 < timeout) {
    while (sim900.available()) {
      resp += (char)sim900.read();
    }
    delay(5); // laisser le temps de remplir le buffer
  }
  return resp;
}

void sendAT(const char* cmd) {
  Serial.print(F(">> "));
  Serial.println(cmd);
  sim900.println(cmd);
}

bool waitFor(const char* token, unsigned long timeout = CMD_TIMEOUT) {
  unsigned long t0 = millis();
  String buf;
  while (millis() - t0 < timeout) {
    while (sim900.available()) {
      char c = sim900.read();
      buf += c;
      if (buf.indexOf(token) >= 0) return true;
    }
    delay(2);
  }
  return false;
}

bool sendWaitOK(const char* cmd, unsigned long timeout = CMD_TIMEOUT) {
  sendAT(cmd);
  return waitFor("OK", timeout);
}

bool waitBearerIP(unsigned long ms = 15000) {
  unsigned long t0 = millis();
  while (millis() - t0 < ms) {
    sendAT("AT+SAPBR=2,1");                // Query bearer state + IP
    String s = readAll(1200);
    if (s.indexOf("+SAPBR: 1,1") >= 0 && s.indexOf("0.0.0.0") < 0) {
      Serial.print(F("[SAPBR] ")); Serial.println(s);
      return true;
    }
    delay(500);
  }
  Serial.println(F("[SAPBR] No IP yet"));
  return false;
}

void printCSQOnce() {
  sendAT("AT+CSQ");
  String s = readAll(1200);
  Serial.print(F("[CSQ] ")); Serial.println(s);
}

bool httpInit() {
  sendAT("AT+HTTPTERM"); waitFor("OK", 500);  // clean
  sendAT("AT+HTTPINIT");
  if (!waitFor("OK", 3000)) { Serial.println(F("[HTTPINIT FAIL]")); return false; }

  sendAT("AT+HTTPPARA=\"CID\",1");
  if (!waitFor("OK", 2000)) { Serial.println(F("[HTTPPARA CID FAIL]")); return false; }

  sendAT("AT+HTTPSSL=0");              waitFor("OK", 500);   // HTTP only
  sendAT("AT+HTTPPARA=\"REDIR\",1");   waitFor("OK", 500);   // follow 30x
  return true;
}

// Lecture GET robuste avec longueur
bool httpGET(int &status, int &length, String &body) {
  status = -1; length = -1; body = "";

  sendAT("AT+HTTPACTION=0");
  String buf = "";
  unsigned long t0 = millis();
  while (millis() - t0 < ACTION_TIMEOUT) {
    while (sim900.available()) buf += (char)sim900.read();
    int p = buf.lastIndexOf("+HTTPACTION:");
    if (p >= 0) {
      int end = buf.indexOf('\n', p);
      if (end > 0) {
        String line = buf.substring(p, end);
        String compact = line; compact.replace(" ", "");
        int c1 = compact.indexOf(','), c2 = compact.indexOf(',', c1 + 1);
        if (c1 > 0 && c2 > c1) {
          status = compact.substring(c1 + 1, c2).toInt();
          length = compact.substring(c2 + 1).toInt();
        }
        break;
      }
    }
    delay(5);
  }
  if (status < 200 || status >= 300) return false;

  // Lire exactement 'length' octets avec timeout مرن
  char cmd[48];
  snprintf(cmd, sizeof(cmd), "AT+HTTPREAD=0,%d", length);
  sendAT(cmd);
  unsigned long timeout = (3000UL + (unsigned long)length * 10UL);
  if (timeout > 12000UL) timeout = 12000UL;
  String resp = readAll(timeout);

  // Enlever l'entête "<len>\r\n"
  int p = resp.indexOf("\r\n");
  if (p >= 0) resp = resp.substring(p + 2);
  // Enlever le suffixe "\r\nOK"
  int q = resp.lastIndexOf("\r\nOK");
  if (q > 0) resp = resp.substring(0, q);
  resp.trim();

  body = resp;
  return body.length() > 0;
}
// ========================================================


// ==================== X9C helpers ====================
void pulseINC() {
  digitalWrite(INC, LOW);  delayMicroseconds(3);
  digitalWrite(INC, HIGH); delayMicroseconds(3);
}

void x9cInit(int cs) {
  pinMode(UD, OUTPUT);
  pinMode(INC, OUTPUT);
  pinMode(cs, OUTPUT);
  digitalWrite(INC, HIGH);
  digitalWrite(cs, HIGH);
}

// Homing: forcer à 0 (butee basse)
void x9cHome(int cs, int &posRef) {
  digitalWrite(cs, LOW);
  digitalWrite(UD, LOW); // descendre vers 0
  for (int i = 0; i < 110; i++) pulseINC();
  digitalWrite(cs, HIGH);
  posRef = 0;
}

void x9cGoTo(int target, int cs, int &posRef) {
  target = constrain(target, 0, 99);
  if (posRef < 0) posRef = 0;
  int delta = target - posRef; if (delta == 0) return;
  digitalWrite(cs, LOW);
  if (delta > 0) { digitalWrite(UD, HIGH); for (int i = 0; i < delta; i++) pulseINC(); }
  else           { digitalWrite(UD, LOW);  for (int i = 0; i < -delta; i++) pulseINC(); }
  digitalWrite(cs, HIGH);
  posRef = target;
}

int voltageToPos(float V, float Vmin, float Vmax) {
  if (Vmax < Vmin) { float t = Vmin; Vmin = Vmax; Vmax = t; }
  if (V <= Vmin) return 0; if (V >= Vmax) return 99;
  return int(((V - Vmin) * 99.0) / (Vmax - Vmin) + 0.5);
}
// ========================================================


// ==================== PULSE COUNTER ====================
// Timer1 external clock on D5 (T1), rising edge
void initPulseCounter() {
  pinMode(5, INPUT);
  TCCR1A = 0; TCCR1B = 0; TCNT1 = 0;
  // External clock source on T1 pin. Rising edge: CS12:CS11:CS10 = 111
  TCCR1B |= (1 << CS12) | (1 << CS11) | (1 << CS10);
}

// Lire TCNT1 de façon atomique (éviter lecture déchirée)
unsigned int readPulsesAtomic() {
  uint8_t s = SREG; cli();
  uint16_t v = TCNT1;
  SREG = s;
  return v;
}
// ========================================================


// ==================== API (Contabo) ====================
// Parseur minimal: extrait un nombre après "key":
bool jsonExtractNumber(const String& json, const char* key, float &outVal) {
  int k = json.indexOf(String("\"") + key + "\"");
  if (k < 0) return false;
  k = json.indexOf(':', k);
  if (k < 0) return false;
  int e = k + 1;
  while (e < (int)json.length() && (json[e] == ' ')) e++;
  int end = e;
  while (end < (int)json.length() &&
         (isDigit(json[end]) || json[end] == '.' || json[end] == '-')) end++;
  outVal = json.substring(e, end).toFloat();
  return true;
}

// GET /api/v1/config  -> {"Vbas":x,"Vhaut":y,"delta":z}
bool api_read_config(float &Vb, float &Vh, float &delta) {
  Serial.println(F("\n=== GET /api/v1/config ==="));
  if (!httpInit()) { Serial.println(F("[ERROR] httpInit")); return false; }

  // URL
  {
    char url[240];
    snprintf(url, sizeof(url), "AT+HTTPPARA=\"URL\",\"%s\"", CFG_URL);
    sendAT(url);
    if (!waitFor("OK", 5000)) { Serial.println(F("[ERROR] URL not OK")); return false; }
  }

  int status = -1, length = -1; String body = "";
  Serial.println(F("[STEP] HTTPACTION=0 (GET)..."));
  bool ok = httpGET(status, length, body);

  sendAT("AT+HTTPTERM"); waitFor("OK", 800);

  if (!ok) {
    Serial.print(F("[HTTP] ECHEC - status=")); Serial.println(status);
    return false;
  }

  // Debug court pour éviter la fragmentation RAM
  Serial.print(F("[RESP 1st160B] "));
  Serial.println(body.length() > 160 ? body.substring(0, 160) + "..." : body);

  // trouver JSON net (sécurité)
  int lb = body.indexOf('{');
  int rb = body.lastIndexOf('}');
  if (lb < 0 || rb <= lb) { Serial.println(F("[ERROR] JSON not found")); return false; }
  String json = body.substring(lb, rb + 1);

  float _Vbas = 0, _Vhaut = 0, _d = 0;
  bool ok1 = jsonExtractNumber(json, "Vbas", _Vbas);
  bool ok2 = jsonExtractNumber(json, "Vhaut", _Vhaut);
  bool ok3 = jsonExtractNumber(json, "delta", _d);

  Serial.print(F("[PARSED] Vbas=")); Serial.print(_Vbas);
  Serial.print(F(" Vhaut=")); Serial.print(_Vhaut);
  Serial.print(F(" delta=")); Serial.println(_d);

  if (!(ok1 || ok2 || ok3)) return false;

  Vb    = ok1 ? _Vbas : Vb;
  Vh    = ok2 ? _Vhaut : Vh;
  delta = ok3 ? _d  : delta;

  return true;
}

// POST /api/v1/readings  body: {"comptage":<pulses>}
bool api_post_comptage(unsigned int pulses) {
  Serial.println(F("\n=== POST /api/v1/readings ==="));
  if (!httpInit()) { Serial.println(F("[ERROR] httpInit")); return false; }

  // URL + CONTENT
  {
    char url[240];
    snprintf(url, sizeof(url), "AT+HTTPPARA=\"URL\",\"%s\"", POST_URL);
    sendAT(url);
    if (!waitFor("OK", 5000)) { Serial.println(F("[ERROR] URL not OK")); return false; }
  }
  sendAT("AT+HTTPPARA=\"CONTENT\",\"application/json\"");
  if (!waitFor("OK", 2000)) { Serial.println(F("[ERROR] CONTENT not OK")); return false; }

  // body JSON
  String body = String("{\"comptage\":") + String(pulses) + "}";

  // Upload body
  {
    String dataCmd = String("AT+HTTPDATA=") + String(body.length()) + ",10000";
    sendAT(dataCmd.c_str());
    if (!waitFor("DOWNLOAD", 1500)) { Serial.println(F("[ERROR] no DOWNLOAD")); return false; }
    sim900.print(body);
    if (!waitFor("OK", 12000)) { Serial.println(F("[ERROR] body not OK")); return false; }
  }

  // POST
  sendAT("AT+HTTPACTION=1");
  String buf = ""; unsigned long t0 = millis(); int status = -1, length = -1;
  while (millis() - t0 < ACTION_TIMEOUT) {
    while (sim900.available()) buf += (char)sim900.read();
    int p = buf.lastIndexOf("+HTTPACTION:");
    if (p >= 0) {
      int end = buf.indexOf('\n', p);
      if (end > 0) {
        String line = buf.substring(p, end);
        String compact = line; compact.replace(" ", "");
        int c1 = compact.indexOf(','), c2 = compact.indexOf(',', c1 + 1);
        if (c1 > 0 && c2 > c1) {
          status = compact.substring(c1 + 1, c2).toInt();
          length = compact.substring(c2 + 1).toInt();
        }
        break;
      }
    }
    delay(5);
  }

  // Lire le corps مع timeout مرن لكن بدون min<...>
  if (length > 0) {
    char cmd[48];
    snprintf(cmd, sizeof(cmd), "AT+HTTPREAD=0,%d", length);
    sendAT(cmd);
    unsigned long timeout = (2000UL + (unsigned long)length * 10UL);
    if (timeout > 8000UL) timeout = 8000UL;
    String resp = readAll(timeout);
    Serial.print(F("[HTTP read] "));
    Serial.println(resp.length() > 160 ? resp.substring(0, 160) + "..." : resp);
  } else {
    sendAT("AT+HTTPREAD");
    String resp = readAll(4000);
    Serial.print(F("[HTTP read] "));
    Serial.println(resp.length() > 160 ? resp.substring(0, 160) + "..." : resp);
  }

  sendAT("AT+HTTPTERM"); waitFor("OK", 800);

  Serial.print(F("[HTTP status] ")); Serial.println(status);
  return status >= 200 && status < 300;
}
// ========================================================


// ==================== GLOBALS ====================
int rampDir = +1;
int rampPos1 = 0, rampPos3 = 0;
unsigned long lastStep = 0;

// Pour publier delta par intervalle (au lieu du cumul)
bool POST_DELTA = true;
unsigned int lastPulses = 0;
// ========================================================


void setup() {
  Serial.begin(9600);
  sim900.begin(9600);
  delay(2000);

  Serial.println(F("== SIM900 Contabo API: Rampe triangulaire & lecture fin cycle =="));

  // (optionnel) PIN SIM
  if (SIM_PIN[0]) {
    sendAT("AT+CPIN?");
    if (!waitFor("READY", 3000)) {
      String pinCmd = String("AT+CPIN=\"") + SIM_PIN + "\"";
      sendAT(pinCmd.c_str());
      waitFor("OK", 5000);
    }
  }

  // APN via SAPBR (simple)
  sendWaitOK("AT");   delay(200);
  sendWaitOK("ATE0"); delay(200);
  sendWaitOK("AT+CFUN=1"); delay(1000);

  // Bearer
  sendWaitOK("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\"");
  {
    String apn = String("AT+SAPBR=3,1,\"APN\",\"") + APN1 + "\"";
    if (!sendWaitOK(apn.c_str())) {
      apn = String("AT+SAPBR=3,1,\"APN\",\"") + APN2 + "\"";
      sendWaitOK(apn.c_str());
    }
  }
  sendWaitOK("AT+SAPBR=1,1");    // open
  waitBearerIP(15000);           // <— assure IP obtenue
  sendWaitOK("AT+SAPBR=2,1");    // query

  printCSQOnce();                // info signal

  // X9C init + homing
  x9cInit(CS1); x9cInit(CS2); x9cInit(CS3);
  x9cHome(CS1, pos1); x9cHome(CS2, pos2); x9cHome(CS3, pos3);

  // Pulse counter on D5
  initPulseCounter();

  // ---- 1) Lire config depuis API et positionner les 3 X9C ----
  float Vb = 0, Vh = 0, delta = 0;
  if (api_read_config(Vb, Vh, delta)) {
    int target_CS3 = voltageToPos(Vb,    Vmin_CS3, Vmax_CS3); // Bas
    int target_CS1 = voltageToPos(Vh,    Vmin_CS1, Vmax_CS1); // Haut
    int target_CS2 = voltageToPos(delta, Vmin_CS2, Vmax_CS2); // Delta
    x9cGoTo(target_CS3, CS3, pos3);
    x9cGoTo(target_CS1, CS1, pos1);
    x9cGoTo(target_CS2, CS2, pos2);
    rampPos3 = target_CS3;
    rampPos1 = target_CS1;
  } else {
    Serial.println(F("[WARN] api_read_config failed; starting with defaults (positions unchanged)."));
  }
}

void loop() {
  if (millis() - lastStep < STEP_PERIOD_MS) return;
  lastStep = millis();

  // --- Rampe triangulaire sur CS1/CS3 ---
  rampPos1 += rampDir * 15;
  rampPos3 += rampDir * 15;

  if (rampPos1 >= 99 || rampPos3 >= 99) { rampPos1 = 99; rampPos3 = 99; rampDir = -1; }
  if (rampPos1 <= 0  || rampPos3 <= 0 ) {
    rampPos1 = 0; rampPos3 = 0; rampDir = +1;

    // Fin de cycle -> relire CONFIG depuis API
    float Vb = 0, Vh = 0, d = 0;
    if (api_read_config(Vb, Vh, d)) {
      int t3 = voltageToPos(Vb, Vmin_CS3, Vmax_CS3);
      int t1 = voltageToPos(Vh, Vmin_CS1, Vmax_CS1);
      int t2 = voltageToPos(d,  Vmin_CS2, Vmax_CS2);
      pos3 = t3; pos1 = t1;
      x9cGoTo(t2, CS2, pos2);
      Serial.println(F("[Cycle terminé] Nouvelle init depuis API"));
    } else {
      Serial.println(F("[Cycle terminé] API config FAILED, keeping last values"));
    }
  }

  x9cGoTo(rampPos1, CS1, pos1);
  x9cGoTo(rampPos3, CS3, pos3);

  // Lire compteur de pulses (atomic)
  unsigned int now = readPulsesAtomic();
  unsigned int toSend = now;

  // Publier الدلتا لكل فترة (يمكن تعطيله بتغيير POST_DELTA=false)
  static bool first = true;
  if (POST_DELTA) {
    if (first) { lastPulses = now; first = false; }
    unsigned int delta = (now >= lastPulses) ? (now - lastPulses)
                                             : (65536u - lastPulses + now);
    toSend = delta;
    lastPulses = now;
    // خيار: تصفير العداد كل فترة
    // cli(); TCNT1 = 0; sei();
  }

  Serial.print(F("[Ramp] CS1=")); Serial.print(rampPos1);
  Serial.print(F(" CS3=")); Serial.print(rampPos3);
  Serial.print(F(" Pulses=")); Serial.println(now);

  // ---- Envoyer les pulses (comptage) à l'API ----
  api_post_comptage(toSend);
}
