/* =========================================================
   Bleu Caravelle — Serveur API (Express)
   Point d'entrée. Sert l'API sous /api et, optionnellement,
   le front statique (server/public).
   ========================================================= */
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";

import { loadStore, getSuperadmin, setSuperadmin } from "./src/store.js";
import { attachUser, hashPassword } from "./src/auth.js";

import healthRoutes from "./src/routes/health.js";
import authRoutes from "./src/routes/auth.js";
import bootstrapRoutes from "./src/routes/bootstrap.js";
import collectionRoutes from "./src/routes/collections.js";
import settingsRoutes from "./src/routes/settings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "4000", 10);

async function main() {
  await loadStore();
  await provisionFromEnv();

  const app = express();
  app.set("trust proxy", 1); // derrière un reverse-proxy (Render, Railway, Nginx…)

  // CORS — autorise le front cross-origin avec cookies.
  const origin = process.env.CORS_ORIGIN;
  if (origin) {
    app.use(cors({ origin: origin.split(",").map((s) => s.trim()), credentials: true }));
  }

  app.use(express.json({ limit: "8mb" })); // marge pour les images en base64
  app.use(cookieParser());
  app.use(attachUser);

  // ---- API ----
  app.use("/api", healthRoutes);
  app.use("/api", authRoutes);
  app.use("/api", bootstrapRoutes);
  app.use("/api", settingsRoutes);
  app.use("/api", collectionRoutes); // générique en dernier (/:coll)

  app.use("/api", (req, res) => res.status(404).json({ error: "Route API inconnue." }));

  // ---- Front statique (optionnel) ----
  const pub = path.join(__dirname, "public");
  try {
    await fs.access(path.join(pub, "index.html"));
    app.use(express.static(pub));
    // Routage hash côté client : toute autre URL renvoie index.html.
    app.get("*", (req, res) => res.sendFile(path.join(pub, "index.html")));
    console.log("[web] front statique servi depuis server/public");
  } catch {
    app.get("/", (req, res) => res.json({ service: "bleu-caravelle-api", status: "ok" }));
    console.log("[web] aucun front dans server/public — API seule.");
  }

  app.listen(PORT, () => {
    console.log(`\n  Bleu Caravelle API → http://localhost:${PORT}`);
    console.log(`  Santé              → http://localhost:${PORT}/api/health`);
    if (!getSuperadmin()) {
      console.log("  ⚠️  Aucun super admin : il sera créé à la première connexion via le front (écran « Configuration initiale »).");
    }
    console.log("");
  });
}

// Provisionne le super admin depuis les variables d'environnement (optionnel).
async function provisionFromEnv() {
  const u = (process.env.SUPERADMIN_USER || "").trim();
  const p = process.env.SUPERADMIN_PASS || "";
  if (!u || !p) return;
  if (getSuperadmin()) return; // déjà configuré
  const passHash = await hashPassword(p);
  setSuperadmin({ user: u, passHash, nom: "RK Univers", date_creation: Date.now() });
  console.log(`[auth] super admin « ${u} » provisionné depuis les variables d'environnement.`);
}

main().catch((e) => {
  console.error("Échec du démarrage :", e);
  process.exit(1);
});
