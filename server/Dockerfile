# ───────────────────────────────────────────────
# Bleu Caravelle — Image Docker (API + front)
# ───────────────────────────────────────────────
FROM node:20-alpine

# Répertoire de travail
WORKDIR /app

# Installer d'abord les dépendances (cache de build optimisé)
COPY package.json ./
RUN npm install --omit=dev

# Copier le code de l'application
COPY . .

# Données persistantes : montez un volume sur /app/data en production
# (sinon la base repart du seed à chaque recréation du conteneur).
ENV DATA_FILE=/app/data/store.json
ENV PORT=4000
ENV COOKIE_SECURE=true
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 4000

# Démarrage
CMD ["npm", "start"]
