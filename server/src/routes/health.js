/* Santé du serveur — sonde utilisée par le front pour détecter le backend. */
import { Router } from "express";
const router = Router();

router.get("/health", (req, res) => {
  res.json({ ok: true, service: "bleu-caravelle", time: Date.now() });
});

export default router;
