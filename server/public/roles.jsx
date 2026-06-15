/* =========================================================
   BLUE CARAVELLE — Rôles métiers & journal d'activité (Étape 6)
   Permissions par métier + traçabilité des actions.
   ========================================================= */

/* Vues du back-office par métier. Le super administrateur a tout. */
const ALL_VIEWS = ["dashboard", "reservations", "clients", "booking", "planning", "dispo", "housekeeping", "revenus", "sante", "contenus", "messages", "activite", "parametres", "outils", "comptes", "restaurant"];

const ROLE_DEFS = {
  manager:      { l: "Directeur",    views: ["dashboard", "reservations", "clients", "booking", "planning", "dispo", "housekeeping", "revenus", "messages", "activite"] },
  reception:    { l: "Réception",    views: ["dashboard", "reservations", "clients", "booking", "planning", "dispo", "housekeeping", "messages"] },
  housekeeping: { l: "Housekeeping", views: ["dashboard", "planning", "housekeeping"] },
  restaurant:   { l: "Restauration", views: ["dashboard", "restaurant"] },
  comptabilite: { l: "Comptabilité", views: ["dashboard", "reservations", "revenus", "messages"] }
};
function roleLabel(k) { return (ROLE_DEFS[k] && ROLE_DEFS[k].l) || "Réception"; }
function allowedViews(user) {
  if (!user) return ["dashboard"];
  // Voile prestataire : le super administrateur (prestataire technique) n'accède
  // qu'à la section « Site & config » — contenus, messages, journal, paramètres,
  // comptes. L'exploitation (réservations, clients, revenus…) est réservée à
  // l'équipe de l'hôtel.
  if (user.role === "superadmin") return ["sante", "contenus", "messages", "activite", "parametres", "outils", "comptes"];
  const def = ROLE_DEFS[user.metier] || ROLE_DEFS.reception;
  return def.views.slice();
}

/* ---------- Voile prestataire (minimisation des données) ----------
   Le super administrateur est le prestataire technique (conception &
   maintenance). Conformément à la loi n° 2013-450 (ARTCI) — principe de
   minimisation — il n'a pas à connaître les données personnelles des
   clients. Ces helpers voilent noms, e-mails, téléphones et n° de pièces
   À L'AFFICHAGE uniquement : les données stockées restent intactes pour
   l'équipe de l'hôtel. En production, la même règle doit être appliquée
   côté API (backend-postgres/), sinon la protection n'est que cosmétique. */
function piiMasked() { try { return DB.isSuperadmin(); } catch (e) { return false; } }
function nameInitials(n) {
  return String(n).trim().split(/\s+/).map(function (w) { return (w.charAt(0) || "").toUpperCase() + "."; }).join(" ");
}
function piiName(n) { if (!n) return n || ""; return piiMasked() ? nameInitials(n) : n; }
function piiEmail(e) {
  if (!e) return e || "";
  if (!piiMasked()) return e;
  var p = String(e).split("@");
  return (p[0] || "").slice(0, 2) + "•••@" + (p[1] ? p[1].charAt(0) + "•••" : "•••");
}
function piiPhone(t) {
  if (!t) return t || "";
  if (!piiMasked()) return t;
  var s = String(t).replace(/\s+/g, "");
  return s.slice(0, 4) + " •• •• •• " + s.slice(-2);
}
function piiId(v) { if (!v) return v || ""; return piiMasked() ? "••••••" : v; }
/* ---------- Voile financier (même principe) ----------
   Le prestataire technique n'a pas à connaître les flux financiers de
   l'hôtel : montants encaissés, chiffre d'affaires, notes et factures.
   Les montants du CATALOGUE public (prix des chambres, carte) restent
   visibles — ils ne sont pas confidentiels. */
function finMasked() { return piiMasked(); }
function finXof(v) { return finMasked() ? "••• FCFA" : BC.xof(v); }
/* Texte libre (journal, toasts) : voile les noms connus + e-mails + numéros. */
function piiText(s) {
  if (!s || !piiMasked()) return s || "";
  var out = String(s);
  try {
    var names = [];
    DB.all("reservations").forEach(function (r) { if (r.nom_complet) names.push(r.nom_complet); });
    DB.all("clients").forEach(function (c) { if (c.nom) names.push(c.nom); });
    DB.all("messages").forEach(function (m) { if (m.nom) names.push(m.nom); });
    names.forEach(function (n) { if (n && n.length > 2 && out.indexOf(n) !== -1) out = out.split(n).join(nameInitials(n)); });
  } catch (e) {}
  out = out.replace(/[\w.+-]+@[\w.-]+\.\w+/g, "•••@•••");
  out = out.replace(/\+?\d[\d\s().-]{7,}\d/g, "•• •• ••");
  // Voile financier : montants en FCFA (journal d'activité, toasts).
  out = out.replace(/\d[\d\s\u00a0.,]*\s*(FCFA|XOF)/gi, "••• FCFA");
  return out;
}
/* Bandeau affiché au prestataire dans les vues contenant des données clients. */
function PiiNote() {
  if (!piiMasked()) return null;
  return (
    <div className="pii-note">
      <Icon name="shield" size={15} />
      <span>Accès prestataire — les données personnelles des clients et les données financières de l'hôtel sont voilées (loi n° 2013-450 / ARTCI, minimisation). La gestion nominative et le suivi financier sont réservés à l'équipe de l'hôtel.</span>
    </div>
  );
}

/* ---------- Journal d'activité ---------- */
function logAudit(action, detail) {
  try {
    const u = DB.currentUser();
    DB.insert("audit", {
      action: action, detail: detail || "",
      user: (u && (u.nom || u.user)) || "Système",
      role: u ? (u.role === "superadmin" ? "Super admin" : roleLabel(u.metier)) : "",
      ts: Date.now()
    });
    const all = DB.all("audit");
    if (all.length > 500) {
      all.slice().sort((a, b) => a.ts - b.ts).slice(0, all.length - 500).forEach(o => DB.remove("audit", o.id));
    }
  } catch (e) {}
}

function AdminActivity() {
  useDB();
  const [q, setQ] = useState("");
  const isSuper = DB.isSuperadmin();
  let list = DB.all("audit").slice().sort((a, b) => b.ts - a.ts);
  if (q.trim()) {
    const n = q.trim().toLowerCase();
    list = list.filter(e => (e.user || "").toLowerCase().includes(n) || (e.action || "").toLowerCase().includes(n) || (e.detail || "").toLowerCase().includes(n));
  }
  return (
    <div>
      <div className="admin-h">
        <div><h1>Journal d'activité</h1><div className="sub">Traçabilité des actions du back-office — {DB.all("audit").length} évènement(s) conservé(s).</div></div>
        {isSuper && DB.all("audit").length > 0 &&
          <button className="a-btn danger" onClick={() => { if (confirm("Vider tout le journal d'activité ?")) { DB.all("audit").forEach(e => DB.remove("audit", e.id)); fireToast({ title: "Journal vidé", msg: "L'historique a été effacé.", duration: 3500 }); } }}><Icon name="trash" size={15} /> Vider le journal</button>}
      </div>
      <div className="a-toolbar">
        <div className="a-search"><Icon name="search" size={17} style={{ color: "#8a96a2" }} /><input placeholder="Rechercher (utilisateur, action, détail)…" value={q} onChange={e => setQ(e.target.value)} /></div>
      </div>
      <div className="a-card" style={{ overflow: "auto" }}>
        <table className="a-table">
          <thead><tr><th>Quand</th><th>Utilisateur</th><th>Rôle</th><th>Action</th><th>Détail</th></tr></thead>
          <tbody>
            {list.map(e => (
              <tr key={e.id}>
                <td style={{ color: "#8a96a2", fontSize: ".82rem", whiteSpace: "nowrap" }}>{BC.date(e.ts)}</td>
                <td><strong style={{ color: "var(--marine)" }}>{e.user}</strong></td>
                <td><span className="badge badge-ocean" style={{ fontSize: ".64rem" }}>{e.role || "—"}</span></td>
                <td style={{ fontWeight: 600, color: "var(--marine)" }}>{e.action}</td>
                <td style={{ color: "#56636f", fontSize: ".86rem" }}>{piiText(e.detail) || "—"}</td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan="5"><div className="empty-note" style={{ border: 0 }}>Aucune activité enregistrée.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { ALL_VIEWS, ROLE_DEFS, roleLabel, allowedViews, logAudit, AdminActivity,
  piiMasked, piiName, piiEmail, piiPhone, piiId, piiText, PiiNote, finMasked, finXof });
