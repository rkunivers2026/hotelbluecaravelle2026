#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# Bleu Caravelle — Script d'installation rapide (Linux/macOS)
# Exécutez : chmod +x setup.sh && ./setup.sh
# ─────────────────────────────────────────────────────────
set -e

echo ""
echo "══════════════════════════════════════════"
echo "  Bleu Caravelle — Installation du serveur"
echo "══════════════════════════════════════════"
echo ""

# 1. Vérifier Node.js
if ! command -v node &> /dev/null; then
  echo "⚠️  Node.js n'est pas installé."
  echo ""
  echo "  ➜  Installez-le depuis https://nodejs.org  (version LTS recommandée)"
  echo "     ou via nvm :"
  echo "       curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
  echo "       source ~/.bashrc   # (ou ~/.zshrc)"
  echo "       nvm install 20"
  echo "       nvm use 20"
  echo ""
  exit 1
fi

NODE_VER=$(node -e "process.stdout.write(process.versions.node)")
echo "✅  Node.js $NODE_VER détecté."

# 2. Installer les dépendances
echo ""
echo "📦  Installation des dépendances npm…"
npm install

# 3. Créer le fichier .env s'il n'existe pas
if [ ! -f .env ]; then
  cp .env.example .env
  # Générer un secret aléatoire
  SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  sed -i.bak "s/CHANGE_ME_STRONG_RANDOM_SECRET/$SECRET/" .env && rm -f .env.bak
  echo ""
  echo "✅  Fichier .env créé avec un SESSION_SECRET aléatoire."
  echo "    👉  Éditez .env pour vérifier les paramètres avant de démarrer."
else
  echo "✅  Fichier .env existant conservé."
fi

echo ""
echo "════════════════════════════════════════"
echo "  Installation terminée !"
echo ""
echo "  Démarrez le serveur avec :"
echo "    npm start"
echo ""
echo "  Puis ouvrez : http://localhost:4000"
echo "  Back-office : http://localhost:4000/#/admin"
echo "════════════════════════════════════════"
echo ""
