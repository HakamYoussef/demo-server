# Simuler un ESP32 sur PC avec MQTTS

Chemin : simulateur Python sur PC → Mosquitto (TLS, port 8883) → Node.js → MongoDB → Socket.IO → cartes Live.
Le simulateur ne se connecte jamais à MongoDB. Les mesures sont fictives, destinées aux pages air/eau/sol, pas à la radiation.
Le serveur renvoie `devices/esp32-sim-01/ack` après sauvegarde. Ce retour confirme la réception et la sauvegarde, pas une action matérielle.

## 1. Installer le broker sur le VPS Ubuntu/Debian

Récupérer cette modification GitHub en conservant vos modifications locales, comme pour la PR précédente.
Depuis `/var/www/demo` :

```bash
apt update
apt install -y mosquitto mosquitto-clients openssl
install -d -m 750 -o root -g mosquitto /etc/mosquitto/certs
install -d -m 700 /root/demo-mqtt-ca
```

Créer une autorité de certification privée. Sa clé reste sur le VPS ; seul `ca.crt` sera copié sur le PC.
Les commandes ci-dessous sont à exécuter une fois ; ne remplacez pas une CA déjà utilisée.

```bash
openssl req -x509 -newkey rsa:3072 -nodes -sha256 -days 3650 \
  -keyout /root/demo-mqtt-ca/ca.key \
  -out /root/demo-mqtt-ca/ca.crt -subj '/CN=Demo MQTT CA'
chmod 600 /root/demo-mqtt-ca/ca.key

openssl req -newkey rsa:3072 -nodes \
  -keyout /etc/mosquitto/certs/server.key \
  -out /root/demo-mqtt-ca/server.csr -subj '/CN=213.199.35.129'
cat > /root/demo-mqtt-ca/server.ext <<'EXT'
subjectAltName=IP:213.199.35.129,DNS:ders-udi.net
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
EXT
openssl x509 -req -sha256 -days 365 \
  -in /root/demo-mqtt-ca/server.csr \
  -CA /root/demo-mqtt-ca/ca.crt -CAkey /root/demo-mqtt-ca/ca.key -CAcreateserial \
  -extfile /root/demo-mqtt-ca/server.ext -out /etc/mosquitto/certs/server.crt
install -m 644 /root/demo-mqtt-ca/ca.crt /etc/mosquitto/certs/ca.crt
chown root:mosquitto /etc/mosquitto/certs/server.key
chmod 640 /etc/mosquitto/certs/server.key
chmod 644 /etc/mosquitto/certs/server.crt
```

Si l'adresse du VPS change, adapter aussi le SAN du certificat et les fichiers `.env`.
Le certificat serveur expire après un an ; renouveler le certificat avant cette date et redémarrer Mosquitto.

Créer deux comptes avec deux mots de passe différents, saisis aux invites :

```bash
# -c crée un fichier : utiliser cette option seulement à la première création.
mosquitto_passwd -c /etc/mosquitto/demo-passwords sensor-server
mosquitto_passwd /etc/mosquitto/demo-passwords esp32-sim-01
chown root:mosquitto /etc/mosquitto/demo-passwords
chmod 640 /etc/mosquitto/demo-passwords
cp /var/www/demo/mqtt/acl /etc/mosquitto/demo-acl
cp /var/www/demo/mqtt/mosquitto.conf /etc/mosquitto/conf.d/demo-mqtt.conf
systemctl enable mosquitto
systemctl restart mosquitto
systemctl status mosquitto --no-pager
```

Ouvrir **TCP 8883** dans le pare-feu du VPS et celui du fournisseur. Si UFW est déjà actif :

```bash
ufw allow 8883/tcp
```

La configuration fournie n'ouvre pas de listener MQTT public non chiffré. Vérifier les autres configurations Mosquitto si le broker était déjà installé.

## 2. Activer la réception dans Node.js sur le VPS

```bash
cd /var/www/demo/api
npm install
```

Ajouter les lignes de `mqtt/server.env.example` à **api/.env**, sans écraser les réglages existants.
Renseigner le mot de passe du compte `sensor-server`. Garder `MONGODB_URI` défini.
`MQTT_CA_FILE=/etc/mosquitto/certs/ca.crt` doit être lisible par le compte qui lance Node.
Redémarrer le backend avec votre gestionnaire habituel (PM2 ou systemd).
Le journal doit afficher : `MQTTS connected; listening for sensor telemetry`.

Les filtres oxygène eau et pH sol ont été corrigés ; reconstruire le frontend et le redémarrer :

```bash
cd /var/www/demo/frontend
npm run build
```

Arrêter l'ancien `chart-data-generator.py` pour que ses insertions ne remplacent pas les dernières mesures MQTT dans les cartes.

## 3. Lancer le simulateur sur votre PC

Récupérer le dépôt sur le PC. Copier **uniquement** `/etc/mosquitto/certs/ca.crt` depuis le VPS vers le dossier `simulator/`.
Vous pouvez utiliser SFTP ou, depuis le dossier simulator sur le PC :

```bash
scp root@213.199.35.129:/etc/mosquitto/certs/ca.crt .
```

### Linux / macOS

```bash
cd simulator
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

### Windows PowerShell

```powershell
cd simulator
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Dans `simulator/.env`, renseigner le mot de passe MQTT de **esp32-sim-01**, pas celui du serveur.
Pour éviter les problèmes de chemins relatifs, utiliser un chemin absolu pour `MQTT_CA_FILE` (par exemple `C:/Users/USER/demo-server/simulator/ca.crt` sur Windows).
Puis lancer :

```bash
python esp32_mqtt_simulator.py
```

Sous Windows, utiliser ` .\.venv\Scripts\python.exe esp32_mqtt_simulator.py`.
Le simulateur envoie toutes les cinq secondes, attend la confirmation du broker et affiche aussi la confirmation de sauvegarde du serveur.
Ctrl+C l'arrête. Aucune option ne désactive la vérification du certificat TLS.

## Contrat des messages

Topic : `devices/esp32-sim-01/telemetry`, QoS 1, **retain=false** :

```json
{"messageId":"unique-id-001","sentAt":"2026-10-06T22:00:00Z","values":{"T_A1":23.5,"H_A1":62,"T_S1":21,"H_S1":55,"PH_S1":6.8,"PH_eau":7,"LEVEL_eau":72,"O_eau":7.5}}
```

`messageId` est requis et doit rester identique en cas de réémission du même message. Un index MongoDB unique empêche de sauvegarder deux fois le même message par appareil.
Le serveur horodate la réception en UTC. Les clés numériques doivent exister dans le schéma des mesures ; il rejette JSON incorrect, valeurs non numériques et messages de plus de 64 KiB.
Les messages retained sont ignorés pour éviter de traiter une ancienne mesure comme récente.

Retour après sauvegarde :

```json
{"deviceId":"esp32-sim-01","messageId":"unique-id-001","status":"stored"}
```

Pour cette simulation, garder le serveur et le broker actifs. QoS 1 confirme le transport MQTT, pas la sauvegarde MongoDB ; seule la confirmation `stored` indique la sauvegarde. Le simulateur ne conserve pas de file durable sur disque et la session serveur est propre : les mesures pendant une indisponibilité peuvent être perdues. Le protocole de commandes d'actionneurs reste à définir lors du passage au véritable ESP32.

## Diagnostic

- Pas de connexion : vérifier TCP 8883 et `journalctl -u mosquitto -n 50 --no-pager`.
- Erreur TLS : vérifier le chemin de `ca.crt`, l'adresse couverte par le SAN et l'heure du PC.
- Not authorized : vérifier les mots de passe et les comptes définis dans l'ACL.
- Confirmation du broker sans `stored` : vérifier la connexion MQTT du backend et ses logs MongoDB.
- `stored` mais cartes vides : vérifier le redémarrage du frontend et sa connexion Socket.IO à l'API.

Vérifications backend : `cd api && npm run test:mqtt`.
