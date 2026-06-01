# 🚦 Traffic Platform — Gestion du Trafic Urbain

Mini-projet **Web Services & GraphQL** — TEK-UP University
Plateforme intelligente de gestion du trafic urbain avec **architecture microservices** et **API Gateway GraphQL**.

---

## 📋 Table des matières
1. [Architecture](#-architecture)
2. [Installation rapide](#-installation-rapide)
3. [Démarrage](#-démarrage)
4. [Tests GraphQL](#-tests-graphql)
5. [Technologies](#-technologies-utilisées)
6. [Auteur](#-auteur)

---

## 🏗️ Architecture

```
                    ┌─────────────────────┐
                    │  GraphQL Gateway    │ ← port 4000
                    │   (Apollo Server)   │
                    └──────────┬──────────┘
                               │
        ┌──────────┬───────────┼───────────┬──────────┐
        │          │           │           │          │
        ▼          ▼           ▼           ▼          ▼
    ┌────────┐┌────────┐ ┌──────────┐ ┌──────────┐┌──────────┐
    │  Auth  ││Vehicle │ │ Traffic  │ │ Incident ││  Notif   │
    │  3001  ││  3002  │ │   3003   │ │   3004   ││   3005   │
    └───┬────┘└───┬────┘ └────┬─────┘ └────┬─────┘└────┬─────┘
        │        │           │            │           │
        ▼        ▼           ▼            ▼           ▼
     db_auth  db_vehicles db_traffic db_incidents db_notifications
```

Chaque service a sa **propre base de données** — principe d'isolation des microservices.

---

## ⚡ Installation rapide

### Prérequis
- ✅ Node.js v16+
- ✅ XAMPP (avec MySQL démarré)
- ✅ Postman ou navigateur

### Étape 1 — Créer les bases de données

1. Démarre **XAMPP Control Panel**
2. Clique **Start** à côté de **MySQL**
3. Ouvre **http://localhost/phpmyadmin** dans ton navigateur
4. Clique sur **"Importer"** en haut
5. Choisis le fichier `database/schema.sql`
6. Clique **"Exécuter"** en bas

→ Les 5 bases de données sont créées ✅

### Étape 2 — Installer les dépendances

Double-clique sur **`install.bat`**

Ou manuellement :
```bash
cd services\auth && npm install && cd ..\..
cd services\vehicle && npm install && cd ..\..
cd services\traffic && npm install && cd ..\..
cd services\incident && npm install && cd ..\..
cd services\notification && npm install && cd ..\..
cd gateway && npm install && cd ..
```

### Étape 3 — Démarrer tous les services

Double-clique sur **`start-all.bat`**

Ou ouvre **6 terminaux** et dans chacun :
```bash
# Terminal 1
cd services\auth && npm start

# Terminal 2
cd services\vehicle && npm start

# Terminal 3
cd services\traffic && npm start

# Terminal 4
cd services\incident && npm start

# Terminal 5
cd services\notification && npm start

# Terminal 6 (le plus important !)
cd gateway && npm start
```

### Étape 4 — Tester

Ouvre **http://localhost:4000** dans ton navigateur → tu vois le **Apollo Sandbox** 🎉

---

## 🧪 Tests GraphQL

> ⚠️ Toutes les requêtes (sauf register/login) nécessitent un token dans **Headers** :
> `authorization: Bearer TON_TOKEN_ICI`

### 1. Inscription
```graphql
mutation {
  register(
    name: "Ali Ben Salah"
    email: "ali@tekup.tn"
    password: "password123"
    role: "ADMIN"
  ) {
    message
  }
}
```

### 2. Connexion (récupère le token !)
```graphql
mutation {
  login(email: "ali@tekup.tn", password: "password123") {
    token
    user { id name role }
  }
}
```

### 3. Ajouter un véhicule
```graphql
mutation {
  addVehicle(plate: "TN-1234-A", type: "Voiture", owner: "Ali Ben Salah") {
    message
  }
}
```

### 4. Voir tous les véhicules
```graphql
query {
  getVehicles {
    id plate type owner created_at
  }
}
```

### 5. Position GPS
```graphql
mutation {
  addGpsPosition(
    vehicle_id: 1
    latitude: 36.8189
    longitude: 10.1658
    speed: 60.5
  ) { message }
}
```

### 6. Créer une zone
```graphql
mutation {
  createZone(
    name: "Centre-Ville Tunis"
    lat_min: 36.80
    lat_max: 36.85
    lng_min: 10.15
    lng_max: 10.20
  ) { message }
}
```

### 7. Mesurer densité trafic
```graphql
mutation {
  addTrafficMeasure(zone_id: 1, density: 75) { message }
}
```

### 8. Zones congestionnées
```graphql
query {
  getCongestedZones {
    zone_id density level measured_at
  }
}
```

### 9. Déclarer un incident
```graphql
mutation {
  reportIncident(
    type: "Accident"
    description: "Collision sur Avenue Bourguiba"
    latitude: 36.8190
    longitude: 10.1660
  ) { message }
}
```

### 10. Mes notifications
```graphql
query {
  getNotifications {
    id message is_read created_at
  }
}
```

---

## 🔐 Authentification

- **Hashage** : bcryptjs
- **Token** : JWT (expire après 24h)
- **Rôles** : ADMIN, OPERATOR

---

## 📋 Énumérations

**Types d'incidents** : Accident, Travaux, Route fermee, Embouteillage

**Statuts d'incidents** : Signale, En cours, Resolu

**Niveaux de trafic** (calculés automatiquement) :
- `Faible` : moins de 20 véhicules
- `Moyen` : 20 à 49 véhicules
- `Eleve` : 50 et plus

---

## 👨‍💻 Technologies utilisées

| Catégorie | Technologie |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| GraphQL | Apollo Server v4 |
| Base de données | MySQL (XAMPP) |
| Authentification | JWT + bcryptjs |
| Communication | Axios (HTTP) |
| Outils | Postman, Git/GitHub |

---

## 📁 Structure du projet

```
traffic-platform/
├── gateway/                  ← API GraphQL (point d'entrée)
├── services/
│   ├── auth/                 ← Authentification + JWT
│   ├── vehicle/              ← Véhicules + GPS
│   ├── traffic/              ← Zones + densité
│   ├── incident/             ← Incidents
│   └── notification/         ← Notifications
├── database/
│   └── schema.sql            ← Schéma MySQL complet
├── docs/                     ← Diagrammes UML + présentation
├── postman/                  ← Collection Postman
├── install.bat               ← Install automatique
├── start-all.bat             ← Démarrer tout
└── README.md                 ← Ce fichier
```

---

## 👤 Auteur

Projet réalisé dans le cadre du module **Web Services** — TEK-UP University 2024-2025.
