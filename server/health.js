/* =========================================================
   Bootstrap — charge l'intégralité des données pour le front
   (GET /api/bootstrap). Les secrets (passHash) sont retirés.
   ========================================================= */
import { Router } from "express";
import * as store from "../store.js";

const router = Router();

// Retire les champs sensibles des comptes avant envoi au client.
function publicAccount(a) {
  const { passHash, pass, ...safe } = a;
  return safe;
}

router.get("/bootstrap", (req, res) => {
  const s = store.getState();
  res.json({
    settings: s.settings || { info: {}, images: {} },
    rooms: s.rooms || [],
    experiences: s.experiences || [],
    dishes: s.dishes || [],
    gallery: s.gallery || [],
    reviews: s.reviews || [],
    reservations: s.reservations || [],
    messages: s.messages || [],
    accounts: (s.accounts || []).map(publicAccount),
    clients: s.clients || [],
    audit: s.audit || [],
    memos: s.memos || [],
    // L'utilisateur courant (si session valide) — sinon null.
    user: req.user || null
  });
});

export default router;
