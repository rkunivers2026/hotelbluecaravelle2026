/* =========================================================
   Bleu Caravelle — Authentification
   - Mots de passe hachés avec bcrypt (jamais stockés en clair)
   - Session via JWT signé dans un cookie httpOnly
   - Expiration glissante (réémission du jeton à chaque requête)
   ========================================================= */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const COOKIE = "bc_session";
const TTL_MIN = parseInt(process.env.SESSION_TTL_MIN || "30", 10);
const SECRET = process.env.SESSION_SECRET || (() => {
  console.warn("[auth] ⚠️  SESSION_SECRET non défini — un secret aléatoire est généré (les sessions seront invalidées à chaque redémarrage). Définissez SESSION_SECRET en production.");
  return require_random();
})();

function require_random() {
  // Secret éphémère si non configuré.
  return "dev-" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

const COOKIE_SECURE = String(process.env.COOKIE_SECURE || "false") === "true";
const CROSS_SITE = !!process.env.CORS_ORIGIN;

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  if (!hash) return false;
  try { return await bcrypt.compare(plain, hash); } catch { return false; }
}

export function issueSession(res, payload) {
  const token = jwt.sign(payload, SECRET, { expiresIn: TTL_MIN * 60 });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: CROSS_SITE ? "none" : "lax",
    maxAge: TTL_MIN * 60 * 1000,
    path: "/"
  });
}

export function clearSession(res) {
  res.clearCookie(COOKIE, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: CROSS_SITE ? "none" : "lax",
    path: "/"
  });
}

// Lit et valide la session ; renvoie le payload ou null.
export function readSession(req) {
  const token = req.cookies && req.cookies[COOKIE];
  if (!token) return null;
  try { return jwt.verify(token, SECRET); } catch { return null; }
}

// Middleware : attache req.user si session valide, et prolonge la session (glissante).
export function attachUser(req, res, next) {
  const s = readSession(req);
  if (s) {
    req.user = { user: s.user, nom: s.nom, role: s.role, metier: s.metier };
    // Expiration glissante : réémet le jeton à chaque requête authentifiée.
    issueSession(res, { user: s.user, nom: s.nom, role: s.role, metier: s.metier });
  }
  next();
}

// Middleware : exige une session valide.
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Authentification requise." });
  next();
}

// Middleware : exige le rôle super admin.
export function requireSuperadmin(req, res, next) {
  if (!req.user || req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Accès réservé au super administrateur." });
  }
  next();
}
