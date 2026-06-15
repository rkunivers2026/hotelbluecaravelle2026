/* =========================================================
   Collections — CRUD générique
   POST   /api/:coll        créer
   PATCH  /api/:coll/:id    modifier
   DELETE /api/:coll/:id    supprimer

   • reservations / messages / reviews : création PUBLIQUE
     (formulaires visiteurs). Le reste exige une session.
   • accounts : le mot de passe est haché (bcrypt) et jamais
     renvoyé au client.
   ========================================================= */
import { Router } from "express";
import * as store from "../store.js";
import { hashPassword, requireAuth } from "../auth.js";

const router = Router();

// Collections pilotées par l'API (audit, memos, trash restent locaux au front).
const WRITABLE = new Set([
  "rooms", "experiences", "dishes", "gallery",
  "reviews", "reservations", "messages", "accounts", "clients"
]);

// Collections dont la CRÉATION est ouverte au public (soumissions visiteurs).
const PUBLIC_CREATE = new Set(["reservations", "messages", "reviews"]);

function ensureWritable(req, res, next) {
  if (!WRITABLE.has(req.params.coll)) {
    return res.status(404).json({ error: "Collection inconnue." });
  }
  next();
}

function stripSecret(obj) {
  if (!obj) return obj;
  const { passHash, pass, ...safe } = obj;
  return safe;
}

/* ---- Création ---- */
router.post("/:coll", ensureWritable, async (req, res) => {
  const coll = req.params.coll;
  const body = (req.body && typeof req.body === "object") ? { ...req.body } : {};

  // Contrôle d'accès : création publique limitée à certaines collections.
  if (!PUBLIC_CREATE.has(coll) && !req.user) {
    return res.status(401).json({ error: "Authentification requise." });
  }

  if (coll === "reviews" && !req.user) {
    // Avis soumis par un visiteur : forcés en attente de modération.
    body.affiche = false;
    body.lu = false;
  }
  if (coll === "reservations" && !req.user) {
    body.statut = body.statut || "Nouvelle";
    body.lu = false;
  }
  if (coll === "messages" && !req.user) {
    body.lu = false;
  }

  if (coll === "accounts") {
    // Hachage du mot de passe ; on ne stocke jamais le clair.
    if (body.pass) { body.passHash = await hashPassword(body.pass); delete body.pass; }
  }

  const saved = store.insert(coll, body);
  res.status(201).json(stripSecret(saved));
});

/* ---- Modification ---- */
router.patch("/:coll/:id", ensureWritable, requireAuth, async (req, res) => {
  const { coll, id } = req.params;
  const patch = (req.body && typeof req.body === "object") ? { ...req.body } : {};

  if (coll === "accounts" && patch.pass) {
    patch.passHash = await hashPassword(patch.pass);
    delete patch.pass;
  }

  const saved = store.update(coll, id, patch);
  if (!saved) return res.status(404).json({ error: "Élément introuvable." });
  res.json(stripSecret(saved));
});

/* ---- Suppression ---- */
router.delete("/:coll/:id", ensureWritable, requireAuth, (req, res) => {
  const ok = store.remove(req.params.coll, req.params.id);
  if (!ok) return res.status(404).json({ error: "Élément introuvable." });
  res.status(204).end();
});

export default router;
