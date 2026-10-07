# Déploiement des corrections de sécurité

Les corrections sont dans le code local. Aucun déploiement, changement de secret ni modification de la base de production n'a été effectué.

## Configuration nécessaire

Utiliser Node.js 20.9 ou plus récent. Installer chaque projet avec `npm ci`, exécuter `npm test` dans chaque projet, puis `npm run build` dans frontend. L'API se lance avec `npm start` dans api ; elle écoute par défaut uniquement sur 127.0.0.1:5002.

Dans api/.env ou les variables du service, définir :

- `NODE_ENV=production`.
- `MONGODB_URI` : URI de la base et d'un compte à privilèges minimaux.
- `JWT_SECRET_KEY` : secret aléatoire d'au moins 32 octets, distinct des clés de dispositifs. Le serveur refuse une clé trop courte. Générer la valeur avec un gestionnaire de secrets ; ne pas la committer.
- `APP_ORIGINS=https://votre-domaine.example` : origine exacte du frontend, sans barre finale. Plusieurs origines peuvent être séparées par des virgules.
- `TRUST_PROXY_HOPS=1` uniquement si un proxy de confiance se trouve devant l'API et si le port 5002 est inaccessible directement. Ajuster au nombre réel de proxies ; ne pas activer une confiance universelle.
- `DEVICE_API_KEYS` : objet JSON `{ "esp32-01": "cle-aleatoire-de-32-caracteres-ou-plus" }`. Une clé aléatoire distincte par appareil. Cet exemple n'est pas une clé à utiliser.
- MQTT : `MQTT_URL=mqtts://...`, `MQTT_USERNAME`, `MQTT_PASSWORD` et, si nécessaire, `MQTT_CA_FILE`. Le mode anonyme est refusé en production.

Dans le service frontend : `API_UPSTREAM=http://127.0.0.1:5002` si Next et l'API partagent le serveur. Cette URL est interne ; le navigateur utilise exclusivement la même origine que le site. En production, le proxy frontal doit diriger directement `/api/` et `/socket.io/` vers l'API, et le reste vers Next.

## HTTPS et proxy

Configurer un domaine, un certificat TLS valide, la redirection HTTP vers HTTPS et HSTS au proxy frontal. Transmettre `Host`, `Origin`, `X-Forwarded-Proto` et les cookies. Écraser les en-têtes forwarded fournis par le client ; transmettre correctement les upgrades WebSocket. Ne pas exposer le port API directement à Internet. L'API refuse HTTP en mode production ; un proxy interne est autorisé uniquement avec la confiance explicite ci-dessus.

Exemple de routage Nginx à intégrer au serveur TLS existant :

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:5002;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $remote_addr;
}
location /socket.io/ {
    proxy_pass http://127.0.0.1:5002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Changements de comportement à prévoir

- Les utilisateurs doivent se reconnecter : les anciens JWT ne sont plus acceptés. La session est un cookie HttpOnly, Secure en production et SameSite=Strict ; elle expire après 15 minutes. Aucun renouvellement automatique n'est ajouté.
- La déconnexion révoque toutes les sessions du compte et coupe ses connexions Socket.IO. Les anciennes copies de tokens dans localStorage sont supprimées à l'ouverture de l'application et à la déconnexion.
- La création de comptes exige désormais un administrateur. Préserver un compte existant dont `isAdmin` vaut true. Si aucun n'existe, utiliser la procédure interne de provisionnement dans MongoDB ; il n'y a pas de route publique de création du premier administrateur.
- `POST /api/admin/threshold` est réservé aux administrateurs. Le seuil doit être un nombre entre -50 et 100 °C ; valider ces bornes avec les besoins du site avant déploiement.
- Les capteurs HTTP doivent appeler `GET /api/v1/config` et `POST /api/v1/readings` en HTTPS avec `X-Device-Id` et `X-Device-Key`. Utiliser des nombres JSON, pas des chaînes. Si une date est envoyée, elle doit être une chaîne valide à moins de 24 heures de l'heure serveur ; elle peut être omise pour utiliser l'heure de réception. Adapter le firmware avant bascule, vérifier le certificat serveur et ne pas désactiver TLS.
- Les historiques HTTP nécessitent une session et retournent au plus 1000 mesures par requête. `limit` et `page` permettent la pagination ; les filtres de dates exigent deux dates ordonnées sur au plus 31 jours. Les graphiques existants affichent le dernier lot, et l'export d'historique porte sur le lot chargé.
- Les interfaces Next/React, PDF et Tailwind ont été mises à jour pour éliminer les avis de sécurité des dépendances. Vérifier visuellement les graphiques et exports PDF sur les données réelles avant mise en production.

## Protections restant à configurer ou vérifier

Les limites de débit intégrées sont en mémoire et par processus. Pour plusieurs instances, ajouter un limiteur partagé ou des limites au proxy. Le code limite Socket.IO à 1000 connexions transport et 10 connexions simultanées par compte. Configurer aussi au proxy le nombre de connexions par IP, les timeouts et les limites Socket.IO pour réduire les abus de connexions authentifiées. Vérifier les index MongoDB ajoutés aux dates, les sauvegardes et les droits de la base.

Sur le broker MQTT, limiter chaque dispositif à la publication sur son propre topic `devices/<id>/telemetry` et à la lecture de son propre accusé `devices/<id>/ack`. Le backend ne peut pas vérifier l'identité du publieur à partir du seul topic ; l'ACL du broker est indispensable. Fixer également des quotas d'ingestion et des limites de messages. Le service conserve la limite de payload, la validation des champs, la vérification TLS et la déduplication.

La CSP ajoutée interdit les objets, les bases étrangères et l'intégration en iframe. Elle ne contient pas encore de politique script-src restrictive avec nonces ; prévoir cette étape après validation des bibliothèques de graphiques. HttpOnly réduit l'exfiltration du cookie, mais une XSS pourrait encore effectuer des actions au nom de la session : ne pas considérer cette modification comme une protection complète contre XSS.

Les audits npm établissent les vulnérabilités connues du registre à leur date d'exécution, pas une garantie de sécurité. Les tests utilisent des modèles MongoDB simulés ; un essai intégré avec base et dispositifs de test reste nécessaire avant déploiement.
