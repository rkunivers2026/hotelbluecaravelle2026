# Bleu Caravelle — Guide de déploiement

Le dossier `server/` contient **l'API + le site** (front servi sur la même origine).
Trois façons de le mettre en ligne, de la plus simple à la plus manuelle.

---

## Prérequis : installer Node.js

> **Si vous déployez sur Render, Railway ou Docker → passez directement à l'option A/B/C.**
> Node.js est fourni par la plateforme, vous n'avez rien à installer.

Pour un démarrage **local** (Mac, Linux, Windows) :

### Option rapide — script automatique (Mac / Linux)
```bash
cd server
chmod +x setup.sh
./setup.sh
```
Le script vérifie Node.js, installe les dépendances et génère le `.env` automatiquement.

### Installation manuelle de Node.js

| Système | Méthode recommandée |
|---------|---------------------|
| **Mac** | `brew install node` ou [nodejs.org](https://nodejs.org) |
| **Linux (Ubuntu/Debian)** | `sudo apt install -y nodejs npm` (ou nvm, voir ci-dessous) |
| **Windows** | Téléchargez l'installeur LTS sur [nodejs.org](https://nodejs.org/fr/download) |
| **Tous systèmes (nvm)** | `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh \| bash` puis `nvm install 20` |

Vérifiez l'installation :
```bash
node -v   # doit afficher v18.x ou v20.x
npm -v    # doit afficher 9.x ou 10.x
```

Ensuite, dans le dossier `server/` :
```bash
npm install          # installe Express, bcryptjs, jsonwebtoken…
cp .env.example .env # éditez SESSION_SECRET (voir ci-dessous)
npm start            # → http://localhost:4000
```

---

## Avant tout : le secret de session

Générez une clé aléatoire (à mettre dans `SESSION_SECRET`) :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

C'est la seule variable **obligatoire** en production. En HTTPS, ajoutez aussi
`COOKIE_SECURE=true`.

---

## Option A — Render (le plus simple, 1 clic)

1. Poussez ce projet sur un dépôt GitHub/GitLab.
2. Sur [render.com](https://render.com) → **New → Blueprint**, pointez vers le dépôt.
   Render lit `render.yaml` : service web + disque persistant + secret généré.
3. Déploiement automatique. L'URL fournie (`https://bleu-caravelle.onrender.com`)
   sert directement le site **et** l'API.

> Si `server/` est un sous-dossier du dépôt, décommentez `rootDir: server` dans `render.yaml`.
> Le plan **Starter** est requis (le disque persistant n'existe pas sur le plan gratuit).

---

## Option B — Docker / VPS (Hostinger, OVH, Contabo…)

```bash
cd server
# éditez SESSION_SECRET dans docker-compose.yml
docker compose up -d --build
```

Le site tourne sur `http://VOTRE_IP:4000`. Placez-le derrière un reverse-proxy
(Nginx/Caddy) pour le HTTPS et le domaine. Exemple Caddy (`Caddyfile`) :

```
bleucaravelle.ci {
    reverse_proxy localhost:4000
}
```

La base est persistée dans le volume Docker `bleu-data` (survit aux redémarrages).

---

## Option C — Railway

1. **New Project → Deploy from GitHub repo**.
2. Root directory : `server`. Railway détecte Node automatiquement.
3. Variables : `SESSION_SECRET`, `COOKIE_SECURE=true`.
4. Ajoutez un **Volume** monté sur `/app/data` et réglez `DATA_FILE=/app/data/store.json`
   pour conserver les données entre les déploiements.

---

## Après le déploiement

1. Ouvrez `https://votre-domaine/#/admin`.
2. L'écran **« Configuration initiale »** vous fait créer le super administrateur
   (mot de passe : 8+ caractères, 1 majuscule, 1 chiffre, 1 caractère spécial).
3. Connectez-vous : vous gérez réservations, chambres, menu, avis, comptes du personnel…

> Astuce : pour provisionner le super admin sans passer par l'écran, définissez
> `SUPERADMIN_USER` et `SUPERADMIN_PASS` **avant** le premier démarrage.

---

## Sauvegardes

La base est un simple fichier JSON (`data/store.json`). Sauvegardez-le régulièrement :

```bash
# Render/Railway : via le shell du service
cat /var/data/store.json > sauvegarde-$(date +%F).json
# Docker : 
docker cp bleu-caravelle:/app/data/store.json ./sauvegarde-$(date +%F).json
```

Le back-office propose aussi un **export/import** complet depuis l'interface super admin.
