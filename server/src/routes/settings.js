/* =========================================================
   Paramètres du site (réservés au super administrateur)
   PATCH /api/settings/info          infos de contact
   PUT   /api/settings/image/:key    image personnalisée
   ========================================================= */
import { Router } from "express";
import * as store from "../store.js";
import { requireSuperadmin } from "../auth.js";

const router = Router();

router.patch("/settings/info", requireSuperadmin, (req, res) => {
  const patch = (req.body && typeof req.body === "object") ? req.body : {};
  const info = store.patchSettingsInfo(patch);
  res.json(info);
});

router.put("/settings/image/:key", requireSuperadmin, (req, res) => {
  const value = req.body ? req.body.value : null;
  const images = store.setSettingsImage(req.params.key, value);
  res.json(images);
});

export default router;
