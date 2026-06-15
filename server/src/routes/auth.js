/* =========================================================
   Authentification & provisionnement du super administrateur
   ========================================================= */
import { Router } from "express";
import * as store from "../store.js";
import {
  hashPassword, verifyPassword, issueSession, clearSession, requireAuth
} from "../auth.js";

const router = Router();

// Verrou anti-concurrence : empêche deux créations simultanées du super admin
// (deux requêtes /auth/setup arrivant avant la première écriture).
let setupLock = false;

// Règles de robustesse du mot de passe (alignées sur le front).
function passwordError(p) {
  if (!p || p.length < 8) return "Mot de passe : 8 caractères minimum.";
  if (!/[A-Z]/.test(p)) return "Au moins une lettre majuscule est requise.";
  if (!/[0-9]/.test(p)) return "Au moins un chiffre est requis.";
  if (!/[^a-zA-Z0-9]/.test(p)) return "Au moins un caractère spécial est requis.";
  return null;
}

/* ---- Première mise en ligne : le super admin est-il à créer ? ---- */
router.get("/auth/needs-setup", (req, res) => {
  res.json({ needsSetup: !store.getSuperadmin() });
});

/* ---- Création unique du super administrateur ---- */
router.post("/auth/setup", async (req, res) => {
  if (store.getSuperadmin() || setupLock) {
    return res.status(409).json({ error: "Un super administrateur existe déjà." });
  }
  const user = String((req.body && req.body.user) || "").trim();
  const pass = (req.body && req.body.pass) || "";
  if (user.length < 3) return res.status(400).json({ error: "Identifiant invalide (3 caractères minimum)." });
  const perr = passwordError(pass);
  if (perr) return res.status(400).json({ error: perr });

  setupLock = true;
  try {
    if (store.getSuperadmin()) return res.status(409).json({ error: "Un super administrateur existe déjà." });
    const passHash = await hashPassword(pass);
    store.setSuperadmin({ user, passHash, nom: "RK Univers", date_creation: Date.now() });
    // Connexion immédiate après création.
    issueSession(res, { user, nom: "RK Univers", role: "superadmin" });
    res.status(201).json({ user: { user, nom: "RK Univers", role: "superadmin" } });
  } finally {
    setupLock = false;
  }
});

/* ---- Connexion ---- */
router.post("/auth/login", async (req, res) => {
  const user = String((req.body && req.body.user) || "").trim();
  const pass = (req.body && req.body.pass) || "";

  // 1) Super administrateur
  const sa = store.getSuperadmin();
  if (sa && sa.user === user && await verifyPassword(pass, sa.passHash)) {
    issueSession(res, { user: sa.user, nom: sa.nom || "RK Univers", role: "superadmin" });
    return res.json({ user: { user: sa.user, nom: sa.nom || "RK Univers", role: "superadmin" } });
  }

  // 2) Comptes du personnel
  const acc = store.all("accounts").find((a) => a.user === user && a.actif !== false);
  if (acc && await verifyPassword(pass, acc.passHash)) {
    const sess = { user: acc.user, nom: acc.nom || acc.user, role: "admin", metier: acc.role || "reception" };
    issueSession(res, sess);
    return res.json({ user: sess, must_change: !!acc.must_change });
  }

  res.status(401).json({ error: "Identifiant ou mot de passe incorrect." });
});

/* ---- Déconnexion ---- */
router.post("/auth/logout", (req, res) => {
  clearSession(res);
  res.status(204).end();
});

/* ---- Changement de mot de passe (utilisateur connecté) ---- */
router.post("/auth/password", requireAuth, async (req, res) => {
  const pass = (req.body && req.body.pass) || "";
  const perr = passwordError(pass);
  if (perr) return res.status(400).json({ error: perr });
  const passHash = await hashPassword(pass);

  if (req.user.role === "superadmin") {
    const sa = store.getSuperadmin();
    store.setSuperadmin({ ...sa, passHash });
    return res.json({ ok: true });
  }
  const acc = store.all("accounts").find((a) => a.user === req.user.user);
  if (!acc) return res.status(404).json({ error: "Compte introuvable." });
  store.update("accounts", acc.id, { passHash, must_change: false });
  res.json({ ok: true });
});

export default router;
