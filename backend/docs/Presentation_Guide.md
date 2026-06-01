# 🎤 Guide de Présentation Finale — Traffic Platform

Durée recommandée : **15 minutes** + 5 min questions

---

## 📑 Plan des slides (12 slides)

### Slide 1 — Page de titre
- Titre : **Plateforme Intelligente de Gestion du Trafic Urbain**
- Sous-titre : Architecture Microservices + API Gateway GraphQL
- Module : Web Services
- TEK-UP University — 2024/2025

---

### Slide 2 — Problématique (30 sec)
> "La gestion du trafic urbain nécessite de superviser des véhicules en temps réel,
> détecter des incidents, analyser la circulation et notifier les opérateurs. Une
> architecture monolithique ne peut pas gérer cette complexité. On a donc choisi
> une **architecture microservices** avec une **API Gateway GraphQL** comme point
> d'entrée unique."

---

### Slide 3 — Architecture globale (2 min)
Montrer le schéma d'architecture avec :
- Client → Gateway GraphQL (port 4000)
- Gateway distribue vers 5 microservices (3001 à 3005)
- Chaque service a sa propre base MySQL

**Points clés à mentionner :**
- Chaque service est **indépendant**
- Si un service tombe, les autres continuent
- Le Gateway centralise l'authentification

---

### Slide 4 — Service Authentification (1.5 min)
- Inscription avec **bcrypt** (mot de passe haché)
- Connexion → génération **JWT** (24h)
- Deux rôles : **ADMIN** et **OPERATOR**
- Vérification du token sur chaque requête

Montrer un petit bout de code de login.

---

### Slide 5 — Service Véhicules (1 min)
- CRUD des véhicules
- Enregistrement positions GPS
- Historique des 50 dernières positions

---

### Slide 6 — Service Trafic (1.5 min)
**Classification automatique** :
- Faible : < 20 véhicules
- Moyen : 20-49
- Élevé : ≥ 50

→ Détection automatique des zones congestionnées

---

### Slide 7 — Services Incidents + Notifications (1.5 min)
**Communication inter-services** :
- Quand un incident est déclaré → notification automatique
- 4 types d'incidents, 3 statuts

Montrer le code qui appelle automatiquement le service Notifications.

---

### Slide 8 — GraphQL Gateway (2 min)
- Apollo Server v4
- **Un seul endpoint** : http://localhost:4000
- Schéma unifié (types, queries, mutations)
- Gestion du token JWT dans le contexte

**Avantage GraphQL vs REST** :
> "Avec GraphQL, le client demande exactement les champs qu'il veut. Pas de
> sur-fetching. Un seul endpoint au lieu de dizaines de routes REST."

---

### Slide 9 — Base de données (1 min)
Montrer le schéma avec 5 bases isolées :
- db_auth (users)
- db_vehicles (vehicles, gps_positions)
- db_traffic (zones, traffic_measures)
- db_incidents (incidents)
- db_notifications (notifications)

> "Chaque service est maître de ses données — principe **database per service**."

---

### Slide 10 — Démonstration LIVE (3-4 min)
**Ordre de la démo** :
1. Lancer `start-all.bat` (montrer les 6 services qui démarrent)
2. Ouvrir http://localhost:4000 (Apollo Sandbox)
3. **Register** → **Login** (copier le token)
4. Mettre le token dans Headers
5. **addVehicle** → **getVehicles** (montrer le résultat)
6. **reportIncident** → **getNotifications** (montrer la notif auto !)
7. **updateIncidentStatus**
8. Ouvrir **phpMyAdmin** → montrer les données dans la base

---

### Slide 11 — Stack technique (30 sec)
| Catégorie | Technologie |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| GraphQL | Apollo Server v4 |
| Base de données | MySQL (XAMPP) |
| Authentification | JWT + bcryptjs |
| Communication | Axios (HTTP) |
| Versioning | Git / GitHub |

---

### Slide 12 — Conclusion
**Ce que j'ai appris** :
- Architecture microservices
- GraphQL vs REST
- JWT et sécurité des APIs
- Communication inter-services
- MySQL avec Node.js
- Gestion d'un projet Git

**Améliorations futures possibles** :
- Docker Compose
- WebSocket pour temps réel
- Frontend React avec carte interactive
- Tests unitaires
- CI/CD

---

## ❓ Questions probables du prof

### Q : Pourquoi GraphQL plutôt que REST ?
**R** : "GraphQL permet au client de demander exactement les champs dont il a besoin, évite le sur-fetching, et un seul endpoint remplace des dizaines de routes REST. C'est aussi auto-documenté grâce au schéma."

### Q : Comment fonctionne le JWT ?
**R** : "Après le login, le serveur génère un token signé avec un secret. Ce token contient l'id et le rôle de l'utilisateur. À chaque requête, on vérifie la signature. Personne ne peut falsifier le token sans connaître le secret."

### Q : Que se passe-t-il si Auth Service est down ?
**R** : "Toutes les requêtes nécessitant authentification échouent, mais les autres services restent disponibles. C'est une limite — on pourrait ajouter un cache des tokens."

### Q : Comment communiquent les services ?
**R** : "Le Gateway appelle chaque service via HTTP REST avec axios. Les services peuvent aussi s'appeler — par exemple Incident appelle Notification automatiquement."

### Q : Pourquoi une base par service ?
**R** : "Principe **database per service** en microservices. Chaque service est maître de ses données, on peut les faire évoluer indépendamment, et il n'y a pas de couplage fort entre services."

### Q : Comment hashez-vous les mots de passe ?
**R** : "On utilise **bcrypt** avec un cost factor de 10. Le mot de passe n'est jamais stocké en clair. Au login, on compare le hash."

### Q : Comment scaler ce projet en production ?
**R** : "Avec Docker Compose pour conteneuriser, Kubernetes pour orchestrer, un load balancer devant le gateway, et Redis pour cacher les tokens."

---

## 💡 Conseils pour bien présenter

1. **Lance les services AVANT la présentation** (évite le stress du démarrage)
2. **Garde Postman/Apollo ouvert** dans un onglet prêt
3. **Parle lentement**, surtout pendant la démo
4. **Montre le code** pour les parties techniques (login, JWT)
5. **Prépare une slide "Architecture" très visuelle** — c'est le coeur du projet
6. **Termine sur les améliorations futures** — ça montre que tu maîtrises le sujet

Bonne chance ! 🚀
