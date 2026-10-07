# Déploiement des corrections de sécurité

Les corrections sont dans le code local. Aucun déploiement, changement de secret ni modification de la base de production n'a été effectué.

## Mise en service d'un site HTTP existant

Le mode de compatibilité HTTP est explicite ; le comportement par défaut en production reste HTTPS. Ce mode conserve les contrôles de session, les rôles, la validation, les limites de débit et la protection d'origine, mais n'apporte aucun chiffrement de transport. Un attaquant sur le réseau peut intercepter les mots de passe et sessions.

Après récupération des changements, dans `api`, lancer `npm run setup:http -- --restart`. La commande demande l'adresse HTTP complète réellement utilisée dans le navigateur, avec son port éventuel (exemple `http://IP:3000`). Elle valide l'origine et écrit une configuration dans `.env.local`, fichier ignoré par Git et protégé par des permissions 600. Elle ne modifie pas `.env` ni l'URI MongoDB existante. Une clé JWT aléatoire est créée uniquement si la clé configurée est absente ou trop courte ; une clé forte existante est conservée. Aucun secret n'est affiché.

La commande définit `NODE_ENV=production`, `ALLOW_INSECURE_HTTP=true`, `APP_ORIGINS` et la clé JWT, puis redémarre le processus PM2 nommé `api` avec l'environnement mis à jour. Cette mise à jour évite qu'une ancienne clé courte conservée par PM2 ne prenne le dessus sur le fichier. Si le processus backend porte un autre nom, adapter le script ou provisionner les variables avec votre procédure habituelle. Les autres réglages présents dans `.env.local` sont préservés et une sauvegarde privée est créée avant modification.

Pour le frontend, exécuter `npm run build`, puis redémarrer son propre processus PM2 (identifier son nom avec `pm2 list`). Un serveur Next encore démarré sur un ancien build peut demander des chunks supprimés par la compilation, provoquant du CSS manquant ou une erreur de chargement. Actualiser le navigateur après le redémarrage.

L'API reste sur `127.0.0.1:5002`. Le frontend utilise des requêtes de même origine via les réécritures Next ou le proxy ; ne pas ouvrir une connexion directe du navigateur au port API. Les cookies restent HttpOnly et SameSite=Strict ; l'attribut Secure et HSTS sont désactivés uniquement quand ce mode HTTP est explicitement activé.

Pour passer ensuite à HTTPS, changer l'origine configurée et désactiver `ALLOW_INSECURE_HTTP` dans le fichier et l'environnement PM2, puis redémarrer le backend. Les ACL MQTT et clés de dispositifs restent nécessaires ; le mode MQTT anonyme demeure interdit en production.

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

Configurer un domaine, un certificat TLS valide, la redirection HTTP vers HTTPS et HSTS au proxy frontal. Transmettre `Host`, `Origin`, `X-Forwarded-Proto` et les cookies. Écraser les en-têtes forwarded fournis par le client ; transmettre correctement les upgrades WebSocket. Ne pas exposer le port API directement à Internet. Par défaut, l'API refuse HTTP en mode production ; un proxy interne HTTPS est autorisé avec la confiance explicite ci-dessus. Le mode HTTP existant exige l'opt-in documenté plus haut.

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

- Les utilisateurs doivent se reconnecter : les anciens JWT ne sont plus acceptés. La session est un cookie HttpOnly, Secure en production HTTPS et SameSite=Strict ; elle expire après 15 minutes. Aucun renouvellement automatique n'est ajouté.
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
