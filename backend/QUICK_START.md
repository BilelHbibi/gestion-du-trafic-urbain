# 🚀 GUIDE RAPIDE — Démarrer en 5 minutes

## Avant tout — vérifie que tu as :
- ✅ Node.js installé (vérifie avec `node --version`)
- ✅ XAMPP installé avec MySQL démarré
- ✅ Le projet extrait du ZIP

---

## ÉTAPE 1 — Créer les bases de données (2 min)

1. **Démarre XAMPP** → clique **Start** à côté de MySQL (doit devenir vert)
2. Ouvre dans ton navigateur : **http://localhost/phpmyadmin**
3. Clique en haut sur l'onglet **"Importer"**
4. Clique **"Choisir un fichier"** → sélectionne `database/schema.sql`
5. Clique **"Exécuter"** en bas
6. ✅ Tu vois 5 bases créées à gauche : db_auth, db_vehicles, db_traffic, db_incidents, db_notifications

---

## ÉTAPE 2 — Installer le projet (3 min)

**Méthode simple** : double-clique sur **`install.bat`** et attends que ça termine.

**Ou en ligne de commande** :
```bash
cd services\auth && npm install
cd ..\vehicle && npm install
cd ..\traffic && npm install
cd ..\incident && npm install
cd ..\notification && npm install
cd ..\..\gateway && npm install
```

---

## ÉTAPE 3 — Lancer le projet (30 sec)

Double-clique sur **`start-all.bat`**

6 fenêtres s'ouvrent. Chaque fenêtre doit afficher :
```
🔐 Auth Service: http://localhost:3001
🚗 Vehicle Service: http://localhost:3002
🚦 Traffic Service: http://localhost:3003
🚨 Incident Service: http://localhost:3004
🔔 Notification Service: http://localhost:3005
🚀 GraphQL Gateway: http://localhost:4000
```

---

## ÉTAPE 4 — Tester ! (1 min)

Ouvre **http://localhost:4000** dans ton navigateur.

Tu vois **Apollo Sandbox** — clique sur "Query your server".

### Test 1 — Crée un compte
Colle dans la zone de gauche :
```graphql
mutation {
  register(
    name: "Ali"
    email: "ali@test.tn"
    password: "pass123"
    role: "ADMIN"
  ) {
    message
  }
}
```
Clique le bouton ▶️ → tu dois voir `"Utilisateur créé"` ✅

### Test 2 — Connexion
```graphql
mutation {
  login(email: "ali@test.tn", password: "pass123") {
    token
    user { id name role }
  }
}
```
Clique ▶️ → **copie le token** dans la réponse !

### Test 3 — Mettre le token dans Headers
En bas, clique **"Headers"** et ajoute :
```
authorization: Bearer COLLER_TON_TOKEN_ICI
```

### Test 4 — Ajouter un véhicule
```graphql
mutation {
  addVehicle(plate: "TN-1234-A", type: "Voiture", owner: "Ali") {
    message
  }
}
```

🎉 **Ça marche !** Tu peux maintenant tester toutes les requêtes du README.

---

## 🆘 Problèmes courants

### Port déjà utilisé
```bash
netstat -ano | findstr :3001
taskkill /PID NUMERO /F
```

### Erreur "Can't connect to MySQL"
→ Vérifie que XAMPP MySQL est bien démarré (lumière verte)

### Erreur "Token invalide"
→ Il faut se reconnecter (login) pour avoir un nouveau token

### Erreur "Cannot find module"
→ Tu as oublié `npm install` dans ce service
