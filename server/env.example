/* =========================================================
   Bleu Caravelle — Magasin de données (persistance JSON)
   Stockage fichier simple, atomique. Convient à un volume
   d'écritures modéré (hôtellerie). Pour monter en charge,
   remplacez cette couche par PostgreSQL sans toucher aux
   routes (même API interne).
   ========================================================= */
import { promises as fs } from "node:fs";
import path from "node:path";
import { buildSeed, uid } from "./seed.js";

const DATA_FILE = path.resolve(process.env.DATA_FILE || "data/store.json");

let state = null;
let writeQueue = Promise.resolve();

export async function loadStore() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    state = JSON.parse(raw);
    migrate();
  } catch (e) {
    if (e.code === "ENOENT") {
      state = buildSeed();
      await flush();
      console.log("[store] base initialisée avec les données de démonstration → " + DATA_FILE);
    } else {
      throw e;
    }
  }
  return state;
}

// Migration douce : garantit la présence de chaque collection.
function migrate() {
  const colls = ["rooms", "experiences", "dishes", "gallery", "reviews", "reservations", "messages", "accounts", "clients", "audit", "memos"];
  let changed = false;
  for (const c of colls) {
    if (!Array.isArray(state[c])) { state[c] = []; changed = true; }
  }
  if (!state.settings || typeof state.settings !== "object") { state.settings = { info: {}, images: {} }; changed = true; }
  if (!state.settings.info) { state.settings.info = {}; changed = true; }
  if (!state.settings.images) { state.settings.images = {}; changed = true; }
  if (state.superadmin === undefined) { state.superadmin = null; changed = true; }
  if (changed) flush().catch(() => {});
}

// Écriture atomique sérialisée (évite la corruption en cas d'écritures concurrentes).
async function flush() {
  const payload = JSON.stringify(state, null, 2);
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    const tmp = DATA_FILE + ".tmp";
    await fs.writeFile(tmp, payload, "utf8");
    await fs.rename(tmp, DATA_FILE);
  }).catch((e) => console.error("[store] échec d'écriture :", e));
  return writeQueue;
}

// ---- API interne ----
export function getState() { return state; }

export function all(coll) { return Array.isArray(state[coll]) ? state[coll] : []; }

export function find(coll, id) { return all(coll).find((x) => x.id === id); }

export function insert(coll, obj) {
  if (!Array.isArray(state[coll])) state[coll] = [];
  obj.id = obj.id || uid(coll.slice(0, 2));
  state[coll].unshift(obj);
  flush();
  return obj;
}

export function update(coll, id, patch) {
  let saved = null;
  state[coll] = all(coll).map((x) => {
    if (x.id === id) { saved = { ...x, ...patch, id }; return saved; }
    return x;
  });
  flush();
  return saved;
}

export function remove(coll, id) {
  const before = all(coll).length;
  state[coll] = all(coll).filter((x) => x.id !== id);
  flush();
  return all(coll).length < before;
}

export function patchSettingsInfo(patch) {
  state.settings.info = { ...state.settings.info, ...patch };
  flush();
  return state.settings.info;
}

export function setSettingsImage(key, value) {
  state.settings.images = state.settings.images || {};
  if (value) state.settings.images[key] = value;
  else delete state.settings.images[key];
  flush();
  return state.settings.images;
}

// ---- Super administrateur ----
export function getSuperadmin() { return state.superadmin; }

export function setSuperadmin(obj) {
  state.superadmin = obj;
  flush();
  return obj;
}

export { uid, flush };
