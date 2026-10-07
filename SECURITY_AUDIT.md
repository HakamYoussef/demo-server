# Analyse de sécurité du backend et du frontend

Date : 7 octobre 2026. Projet examiné : `/workspace/demo-server`.

## État après corrections locales

Les constats ci-dessous décrivent le code avant correction. Les changements du 7 octobre 2026 ajoutent les contrôles d'accès HTTP/Socket.IO, les clés de dispositifs, des sessions HttpOnly de 15 minutes avec révocation, la validation des entrées, les limites de débit, la pagination et les en-têtes. Le frontend utilise la même origine et ne conserve plus de jeton dans localStorage. Les dépendances vulnérables ont été mises à jour ; les audits npm des deux projets ne signalent plus de vulnérabilité connue. La compilation de production du frontend réussit.

La configuration TLS, le proxy, le provisionnement des clés et les ACL du broker restent à appliquer en déploiement. Consulter [SECURITY_DEPLOYMENT.md](SECURITY_DEPLOYMENT.md) pour les changements de comportement et les limites de vérification. Aucun déploiement n'a été effectué.

## Périmètre et méthode

Revue du code Express/Mongoose, des routes HTTP, de Socket.IO, du service MQTT, de l'authentification Next.js et des versions des fichiers package-lock.json. Vérifications locales avec modèles MongoDB simulés, sans écrire dans une base réelle ni envoyer de requêtes au serveur public. Aucun code applicatif modifié.

Les constats concernent le code disponible. L'exposition réelle dépend du déploiement, du reverse proxy et des règles réseau, non vérifiés ici. Les niveaux ci-dessous sont des priorités qualitatives, pas des scores CVSS.

## Constats prioritaires

### 1. Élevé — Modification des seuils sans authentification

Preuve : `api/routes/admin.mjs:13`, `api/controllers/value-controller.mjs:32`.

`POST /api/admin/threshold` appelle directement `updateThreshold` ; les middlewares d'authentification et de rôle sont commentés. Une personne pouvant atteindre l'API peut modifier `temperatureThreshold`. Le contrôleur ne fixe aucune borne métier et le modèle n'impose qu'un nombre requis. L'interface envoie elle-même cette modification sans Authorization (`frontend/src/app/settings/page.jsx:193`).

Correction : imposer `verifyToken` puis un contrôle de rôle administrateur côté serveur ; valider un nombre fini et des bornes adaptées ; journaliser les modifications. Vérifier qu'un appel anonyme obtient 401, un utilisateur ordinaire 403 et un administrateur peut appliquer une valeur valide.

### 2. Élevé — Identifiants et jetons transmis en HTTP

Preuve : `frontend/src/app/singin/page.jsx:34`, `frontend/src/app/components/ControlButton.jsx:20`, `frontend/src/app/settings/page.jsx:148`.

Le frontend contient des URL `http://213.199.35.129:5002` pour la connexion et les appels authentifiés. Sur ces chemins, un observateur réseau peut lire les mots de passe et les Bearer tokens ; un attaquant actif peut modifier le trafic. Une page HTTPS risque également le blocage de ces requêtes par le navigateur. Les connexions Socket.IO utilisent aussi HTTP par défaut.

Correction : utiliser HTTPS et WSS, une URL d'API centralisée ou un proxy de même origine, et retirer les URL HTTP codées en dur. Vérifier le TLS et HSTS du déploiement. La présence éventuelle d'un proxy HTTPS ne corrige pas les URL HTTP explicites du client.

### 3. Élevé — Insertion de mesures sans identité de dispositif

Preuve : `api/routes/arduino-routes.mjs:8`, `api/controllers/arduino-controller.mjs:30`.

`POST /api/v1/readings` est public. Un appelant peut enregistrer des mesures fabriquées et choisir leur date. Les valeurs sont testées pour leur caractère fini, mais sans bornes métier ; `parseFloat` accepte aussi des chaînes comportant un suffixe. L'absence de limitation de débit facilite le remplissage de la collection.

Correction : authentifier chaque dispositif, séparer les droits d'ingestion de ceux des utilisateurs, imposer des limites de débit et des contraintes de valeurs et d'horodatage. Utiliser une validation numérique stricte. Vérifier le refus d'un dispositif inconnu et de valeurs hors plage.

### 4. Élevé — Jetons sans expiration et déconnexion incomplète

Preuve : `api/controllers/user-controller.mjs:60`, `frontend/src/app/context/authContext.jsx:41`, `frontend/src/app/singin/page.jsx:43`.

`jwt.sign` ne reçoit aucun `expiresIn` : les jetons n'ont pas de claim `exp`. Un jeton volé reste utilisable tant que la clé et les règles de vérification restent valides. La déconnexion supprime `authToken` et `authId`, mais conserve `userInfo`, qui contient une copie du token retourné lors de la connexion. Aucun mécanisme de révocation n'est visible.

Le cookie token n'a pas les attributs explicites `httpOnly`, `secure` et `sameSite`. L'option `expire` est incorrecte : Express attend `expires` ou `maxAge`. Le middleware JWT visible lit les Bearer tokens ; aucune lecture de ce cookie n'est configurée.

Correction : jetons de courte durée, stratégie de renouvellement/révocation adaptée, suppression de toutes les copies à la déconnexion, et choix d'un mécanisme de session cohérent. Si des cookies authentifient les requêtes, utiliser HttpOnly/Secure/SameSite et une protection CSRF appropriée.

### 5. Moyen à élevé — Opérateurs MongoDB acceptés lors de la connexion

Preuve : `api/controllers/user-controller.mjs:42`, `api/models/user.mjs:25`.

La fonction de validation de connexion est définie mais jamais appelée. Le contrôleur transmet directement `req.body.email` au filtre MongoDB avant de vérifier sa présence. Une vérification locale avec `User.findOne` simulé confirme que `{email: {$ne: null}}` est transmis comme opérateur à la requête.

Cela permet de modifier le critère de sélection du compte. Le contrôle bcrypt reste présent : ce constat ne démontre pas une connexion sans mot de passe ni une prise de compte administrateur.

Correction : valider email et password comme chaînes avant toute requête, utiliser les valeurs normalisées produites par la validation, rejeter les objets et les clés inattendues ; ajouter une défense contre les filtres injectés. Vérifier qu'un email objet obtient 400 avant tout accès à la base.

### 6. Moyen — Mesures et flux temps réel accessibles anonymement

Preuve : `api/routes/capteurs-routes.mjs:6`, `api/routes/arduino-routes.mjs:7`, `api/app.mjs:53`.

L'historique des capteurs et des mesures Arduino ne requiert aucun token. Socket.IO ne configure aucun middleware d'authentification et transmet les données dès la connexion, puis les diffuse à tous les clients. Les gardes React ne protègent donc pas ces données. Si elles sont destinées à être publiques, documenter ce choix ; sinon, il s'agit d'une exposition non autorisée.

Correction : authentifier HTTP et Socket.IO, contrôler l'accès aux stations/dispositifs et utiliser des rooms autorisées. Limiter le nombre de connexions. Vérifier qu'un client anonyme ne reçoit aucun événement de données.

### 7. Moyen — Absence de limitation visible contre la force brute et les abus

Preuve : `api/app.mjs:37`, `api/routes/user-routes.mjs:9`, `api/controllers/user-controller.mjs:46`.

Aucun rate limiter n'est visible pour la connexion, l'inscription ou l'ingestion. Les erreurs différentes `invalid Email` et `invalid Password` permettent d'identifier des comptes existants. Les deux routes d'inscription, y compris `/api/admin/register`, sont publiques. Elles créent des utilisateurs ordinaires : le modèle fixe `isAdmin` à false et le contrôleur n'accepte pas ce champ ; aucune élévation automatique de privilèges n'est démontrée.

Correction : limiter les tentatives par IP et compte, adopter un message générique, et réserver l'inscription aux administrateurs ou à un flux d'invitation si le service est privé. Vérifier aussi les éventuelles limites du reverse proxy.

### 8. Moyen — Requêtes d'historique sans pagination

Preuve : `api/controllers/capteurs-controller.mjs:40`, `api/controllers/arduino-controller.mjs:82`.

Ces routes publiques chargent toute la collection. Le contrôleur Arduino transforme puis trie aussi le résultat en mémoire. Le coût augmente avec le volume et peut épuiser mémoire, CPU et bande passante lors d'appels répétés.

Correction : pagination avec une limite maximale, plages temporelles bornées, projections et index adaptés. Vérifier le volume maximal retourné. La route radiation distincte dispose déjà d'une limite de 100.

### 9. Moyen — Hash du mot de passe renvoyé après inscription

Preuve : `api/controllers/user-controller.mjs:31`.

`res.json(result)` sérialise le document utilisateur complet, incluant le hash bcrypt. Vérification locale confirmée avec `save` simulé. Cela expose inutilement une donnée d'authentification, notamment aux outils réseau et aux journaux ; le mot de passe en clair n'est pas renvoyé. L'interface settings stocke la réponse d'inscription dans localStorage.

Correction : retourner un objet limité aux champs utiles, exclure password dans la sérialisation du modèle et éviter de stocker la réponse complète.

### 10. Moyen — Protection du frontend fondée sur la présence de valeurs locales

Preuve : `frontend/src/app/components/protectedRoute.jsx:12`, `frontend/src/app/context/authContext.jsx:19`.

Le garde vérifie uniquement la présence de `authId` et `authToken`. Des valeurs arbitraires dans localStorage suffisent à afficher les pages gardées. Ce contrôle est une aide de navigation, pas une autorisation serveur. Les tokens stockés dans localStorage sont lisibles par JavaScript et seraient accessibles en cas de XSS ; aucune XSS exploitable n'a été démontrée par cette revue.

Correction : valider la session et les rôles côté serveur, traiter 401/403 dans le client et privilégier une session en cookie HttpOnly lorsque l'architecture le permet.

### 11. Moyen — Middleware d'autorisation jamais exécuté sur le chemin normal

Preuve : `api/middlewares/authorization.mjs:14`, `api/routes/admin.mjs:11`, `api/routes/radiation-routes.mjs:7`.

`authorization(err, req, res, next)` a quatre paramètres : Express le traite comme gestionnaire d'erreurs et le saute lors des requêtes normales. Le test d'appartenance au compte n'est donc pas exécuté. Sur les routes actuelles concernées, `verifyToken` et `isAdmin` restent présents : ce problème ne démontre pas un contournement du rôle administrateur. Les routes actuelles n'ont pas de paramètre `:id`, ce qui rend en outre le test de propriétaire inadapté.

Sur le chemin d'erreur, `next(err)` est suivi d'un autre traitement pouvant rappeler next ou envoyer une réponse.

Correction : séparer le gestionnaire d'erreurs JWT du middleware normal à trois paramètres. Appliquer `verifyToken, isAdmin` aux routes administratives et un contrôle de propriétaire uniquement aux routes comportant une ressource utilisateur.

### 12. Faible à moyen — CORS permissif, erreurs internes et en-têtes à renforcer

Preuve : `api/app.mjs:29`, `api/app.mjs:39`, `api/app.mjs:97`, `api/controllers/arduino-controller.mjs:62`, `frontend/next.config.mjs:2`.

L'API et Socket.IO autorisent toutes les origines. Cela facilite la lecture depuis des sites tiers des endpoints déjà publics ; CORS n'est pas un mécanisme d'authentification. Plusieurs contrôleurs renvoient les objets d'erreur, et le gestionnaire global expose error.message. Aucune CSP ou politique d'en-têtes de sécurité n'est visible dans la configuration applicative ; le proxy peut en ajouter, ce qui reste à vérifier.

Correction : liste d'origines explicite, erreurs publiques génériques avec identifiants de suivi et détails internes réservés aux journaux, CSP adaptée, protection contre l'intégration en iframe et en-têtes de sécurité vérifiés sur le déploiement.

## Autre défaut empêchant une vérification complète

`api/controllers/radiation-controller.mjs:3` importe `../models/ArduinoReading.mjs`, alors que le fichier disponible est `api/models/arduino-reading.mjs`. Sur le système Linux examiné, cet import ne correspond à aucun fichier et peut empêcher le démarrage de l'API. Corriger ce chemin avant les essais HTTP intégrés.

## Contrôles favorables

- Les mots de passe sont hachés avec bcrypt, coût 10 ; la réponse de connexion exclut le hash.
- La vérification JWT limite les algorithmes à HS256.
- Le contrôleur d'actionneurs utilise une liste explicite de champs et impose des booléens.
- Le service MQTT impose mqtts, la vérification du certificat, une limite de payload de 64 KiB, des champs numériques connus et des identifiants bornés. Il ignore les messages retained et déduplique par messageId. Les ACL par dispositif et les limites du broker ne sont pas fournies ; elles restent à vérifier. Le mode anonyme est possible uniquement via une option explicite.

## Dépendances et vérifications effectuées

Versions issues des lockfiles : Next 14.2.32, Express 4.21.2, Mongoose 8.18.1, Axios 1.12.2, jsonwebtoken 9.0.2, Socket.IO 4.8.0 et jsPDF 3.0.2. Il faut les confronter aux avis de sécurité actuels et mettre à jour les versions vulnérables avec vérification de compatibilité.

Les deux commandes npm audit ont échoué avec `connect EPERM` vers le proxy. Aucun résultat exploitable sur les vulnérabilités des dépendances : une liste vide dans la sortie d'erreur ne signifie pas zéro vulnérabilité.

`node --test tests/*.test.mjs` échoue avant les assertions : module mqtt absent de l'installation locale. Les suites existantes n'ont donc pas validé le comportement.

Les simulations locales confirment le passage d'un opérateur MongoDB à findOne et la présence du hash dans la réponse d'inscription. L'absence d'expiration est établie par l'appel jwt.sign sans options et une génération locale équivalente. Aucun test d'exploitation sur le serveur public, aucune mutation de base et aucune analyse des secrets de l'environnement n'ont été réalisés.

## Ordre de correction recommandé

1. Fermer les écritures anonymes de seuils et authentifier les dispositifs ; déployer HTTPS/WSS et centraliser l'URL de l'API.
2. Fixer une expiration des sessions, corriger la déconnexion et le stockage ; valider strictement les entrées de connexion et retirer le hash des réponses.
3. Authentifier les lectures privées et Socket.IO ; ajouter limites de débit, pagination et contraintes métier.
4. Corriger les middlewares et l'import radiation, rétablir les dépendances, puis exécuter des tests 401/403, des tests de session et npm audit dans un environnement avec accès réseau.
5. Vérifier en déploiement TLS, règles réseau, accès MongoDB, ACL MQTT, en-têtes et journalisation. Ces éléments ne sont pas prouvés par cette revue du code.
