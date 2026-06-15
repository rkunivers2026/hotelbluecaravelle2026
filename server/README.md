# Bleu Caravelle — Backend API (Node.js)

API REST pour le site vitrine et le back-office `/admin` de l'Hôtel Bleu Caravelle.
Construit avec **Express**, authentification **JWT + bcrypt**, persistance **fichier JSON**
(remplaçable par PostgreSQL sans toucher aux routes).

Le front (`db.js`) détecte automatiquement ce backend : si `GET /api/health` répond,
il bascule en **mode API** ; sinon il fonctionne en local (localStorage).

---

## Prérequis : Node.js ≥ 18

Vérifiez si Node.js est installé :
```bash
node -v   # doit afficher v18.x ou v20.x
```

Si ce n'est pas le cas, téléchargez-le sur **[nodejs.org](https://nodejs.org/fr/download)** (version LTS recommandée).

---

## Démarrage

### Option automatique (Mac / Linux)
```bash
chmod +x setup.sh && ./setup.sh   # installe les deps + génère le .env
npm start
```

### Option manuelle
```bash
cd server
cp .env.example .env        # éditez SESSION_SECRET
npm install
npm start                   # → http://localhost:4000
```

Au premier lancement, une base de démonstration est créée dans `data/store.json`
(mêmes chambres, menu, réservations… que le front).

### Créer le super administrateur

Deux options :

1. **Via le front** (recommandé) — ouvrez `/#/admin` : l'écran « Configuration initiale »
   apparaît tant qu'aucun super admin n'existe. Il appelle `POST /api/auth/setup`.
2. **Via l'environnement** — renseignez `SUPERADMIN_USER` et `SUPERADMIN_PASS` dans `.env`
   avant le premier démarrage : le compte est provisionné automatiquement.

Le mot de passe doit faire **8 caractères minimum**, avec **majuscule, chiffre et caractère spécial**.

---

## Servir le front depuis ce backend (déploiement unifié)

Le front nettoyé (identique à `site-en-ligne/`) est **déjà placé dans `server/public/`** :

```
server/public/index.html      ← front (point d'entrée)
server/public/*.jsx, db.js…   ← code de l'application
server/public/styles.css      ← feuille de style
server/public/assets/…        ← favicon + images des plats
```

Le serveur le sert sur `/`, et le front détecte l'API en **même origine**
(`GET /api/health`) — aucun CORS ni `window.BLEU_API` à configurer.
Un seul service à déployer : tout part du dossier `server/`.

### Front hébergé séparément (Cloudflare Pages, etc.)

Si le front est sur un autre domaine, indiquez-lui l'URL de l'API **avant** le chargement de `db.js` :

```html
<script>window.BLEU_API = "https://api.votre-domaine.ci";</script>
```

Et côté backend, autorisez cette origine dans `.env` :

```
CORS_ORIGIN=https://bleucaravelle.pages.dev
COOKIE_SECURE=true
```

---

## Endpoints

| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| GET | `/api/health` | public | sonde de détection |
| GET | `/api/bootstrap` | public | toutes les données + utilisateur courant |
| GET | `/api/auth/needs-setup` | public | super admin à créer ? |
| POST | `/api/auth/setup` | public (1×) | crée le super admin |
| POST | `/api/auth/login` | public | connexion |
| POST | `/api/auth/logout` | public | déconnexion |
| POST | `/api/auth/password` | connecté | changer son mot de passe |
| POST | `/api/:coll` | public* / connecté | créer un élément |
| PATCH | `/api/:coll/:id` | connecté | modifier |
| DELETE | `/api/:coll/:id` | connecté | supprimer |
| PATCH | `/api/settings/info` | super admin | infos de contact |
| PUT | `/api/settings/image/:key` | super admin | image du site |

\* Création publique autorisée uniquement pour `reservations`, `messages`, `reviews`
(formulaires visiteurs). Les avis et réservations soumis publiquement sont mis en
attente de modération (`affiche:false`, `lu:false`).

Collections : `rooms`, `experiences`, `dishes`, `gallery`, `reviews`,
`reservations`, `messages`, `accounts`, `clients`.

---

## Sécurité

- Mots de passe **hachés bcrypt** (jamais stockés ni renvoyés en clair).
- Session **JWT** dans un cookie **httpOnly**, expiration **glissante** (30 min).
- `passHash` retiré de toutes les réponses (`/api/bootstrap`, création de compte).
- Définissez impérativement un `SESSION_SECRET` fort en production.

---

## Déploiement (Render / Railway / VPS)

- **Build** : `npm install`
- **Start** : `npm start`
- Variables : `SESSION_SECRET`, `COOKIE_SECURE=true`, `PORT` (souvent fourni par l'hôte),
  et `CORS_ORIGIN` si le front est ailleurs.
- Persistez le dossier `data/` sur un volume si l'hôte a un système de fichiers éphémère
  (sinon les données repartent du seed à chaque redéploiement) — ou migrez vers PostgreSQL.

## Migration vers PostgreSQL

Toute la logique de données passe par `src/store.js` (fonctions `all`, `find`,
`insert`, `update`, `remove`, `patchSettingsInfo`, `setSettingsImage`,
`getSuperadmin`, `setSuperadmin`). Réimplémentez ces fonctions avec un client
PostgreSQL : les routes restent inchangées.
