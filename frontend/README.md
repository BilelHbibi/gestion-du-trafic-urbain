# 🎨 Traffic Platform Frontend

Interface React moderne pour la plateforme de gestion du trafic urbain.

## ⚡ Installation rapide

### Étape 1 — Assure-toi que le backend tourne
Tous les services + le gateway doivent être lancés (voir le ZIP backend).
Le gateway GraphQL doit être accessible sur `http://localhost:4000`.

### Étape 2 — Installer le frontend
```bash
cd traffic-frontend
npm install
```

### Étape 3 — Lancer
```bash
npm run dev
```

→ L'interface s'ouvre automatiquement sur **http://localhost:5173** 🎉

---

## 📱 Fonctionnalités de l'interface

### 🔐 Login / Inscription
- Formulaire d'inscription avec choix du rôle (ADMIN / OPERATOR)
- Connexion avec récupération automatique du JWT
- Le token est stocké dans localStorage

### 📊 Vue d'ensemble (Dashboard)
- Statistiques en direct : véhicules, zones, incidents, notifications
- Compteurs visuels avec icônes

### 🚗 Onglet Véhicules
- Formulaire pour ajouter un véhicule
- Liste de tous les véhicules
- Bouton "Simuler position GPS" qui génère une position aléatoire autour de Tunis

### 🚦 Onglet Trafic
- Création de zones avec coordonnées géographiques
- Bouton "Simuler une mesure" qui génère une densité aléatoire
- Affichage en temps réel des zones congestionnées (niveau Élevé)
- Badges colorés selon le niveau (Faible/Moyen/Élevé)

### 🚨 Onglet Incidents
- Déclaration d'incident avec position GPS
- Liste des incidents avec rafraîchissement automatique toutes les 5s
- Modification du statut via menu déroulant (Signalé → En cours → Résolu)
- Quand tu déclares un incident, une notification est créée automatiquement !

### 🔔 Onglet Notifications
- Liste de toutes tes notifications
- Rafraîchissement automatique toutes les 3s
- Bouton "Marquer comme lue"

---

## 🛠️ Technologies utilisées

| Techno | Rôle |
|---|---|
| React 18 | UI |
| Vite | Build ultra-rapide |
| Apollo Client | Communication GraphQL |
| React Router | Navigation entre pages |

---

## 🏗️ Structure du projet

```
traffic-frontend/
├── src/
│   ├── pages/
│   │   ├── Login.jsx       ← Page de connexion
│   │   ├── Register.jsx    ← Page d'inscription
│   │   └── Dashboard.jsx   ← Tableau de bord principal
│   ├── components/
│   │   ├── Overview.jsx    ← Vue d'ensemble (stats)
│   │   ├── VehiclesTab.jsx ← Onglet véhicules
│   │   ├── TrafficTab.jsx  ← Onglet trafic
│   │   ├── IncidentsTab.jsx← Onglet incidents
│   │   └── NotifsTab.jsx   ← Onglet notifications
│   ├── App.jsx             ← Routes
│   ├── main.jsx            ← Point d'entrée + Apollo Client
│   └── styles.css          ← Styles globaux
├── index.html
├── package.json
└── vite.config.js
```

---

## 🆘 Problèmes courants

### "Cannot connect to GraphQL"
→ Vérifie que le gateway tourne sur `http://localhost:4000`

### "Network Error" / "CORS"
Apollo Server v4 a CORS activé par défaut pour toutes les origines, donc ça devrait marcher.
Si ce n'est pas le cas, ajoute dans `gateway/index.js` :
```javascript
const { url } = await startStandaloneServer(server, {
  cors: { origin: 'http://localhost:5173' },
  // ...
});
```

### Le bouton "Marquer comme lue" ne marche pas
→ Le rafraîchissement automatique (3s) recharge la liste — c'est normal !
