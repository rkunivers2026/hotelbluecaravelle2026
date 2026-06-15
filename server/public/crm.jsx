/* =========================================================
   BLUE CARAVELLE — CRM clients (Étape 3)
   Fiches clients persistantes (historique, VIP, préférences,
   allergies, pièce d'identité) + carte d'enregistrement.
   ========================================================= */

const PIECE_TYPES = ["CNI", "Passeport", "Permis de conduire", "Carte de séjour", "Autre"];
const LANGUES = ["Français", "Anglais", "Espagnol", "Arabe", "Autre"];

function normEmail(e) { return (e || "").trim().toLowerCase(); }
function normPhone(p) { return (p || "").replace(/\D/g, ""); }

function findClientForRes(res) {
  const cs = DB.all("clients");
  if (res.client_id) { const byId = cs.find(c => c.id === res.client_id); if (byId) return byId; }
  const em = normEmail(res.email), ph = normPhone(res.telephone_whatsapp);
  return cs.find(c => (em && normEmail(c.email) === em) || (ph && ph.length >= 6 && normPhone(c.telephone) === ph));
}
function clientReservations(client) {
  const em = normEmail(client.email), ph = normPhone(client.telephone);
  return DB.all("reservations").filter(r =>
    r.client_id === client.id || (em && normEmail(r.email) === em) || (ph && ph.length >= 6 && normPhone(r.telephone_whatsapp) === ph)
  ).sort((a, b) => (b.date_creation || 0) - (a.date_creation || 0));
}
function clientStats(client) {
  const rs = clientReservations(client).filter(r => r.statut !== "Annulée");
  let nights = 0, spent = 0;
  rs.forEach(r => { const c = computeFolio(r); nights += c.nights; spent += c.totalTTC; });
  return { sejours: rs.length, nights: nights, spent: spent };
}
function upsertClientFromRes(res, extra) {
  let c = findClientForRes(res);
  if (c) { if (extra) DB.update("clients", c.id, extra); return DB.find("clients", c.id); }
  const obj = Object.assign({
    nom: res.nom_complet || "", email: res.email || "", telephone: res.telephone_whatsapp || "",
    nationalite: "", langue: "Français", vip: false, preferences: "", allergies: "", notes: "",
    piece_type: "CNI", piece_num: "", piece_image: "", date_creation: Date.now()
  }, extra || {});
  c = DB.insert("clients", obj);
  return c;
}

/* =========================================================
   CRM — liste des clients
   ========================================================= */
function AdminClients() {
  useDB();
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null); // { client } | { client:null }
  let list = DB.all("clients").slice().sort((a, b) => (a.nom || "").localeCompare(b.nom || ""));
  if (q.trim()) {
    const needle = q.trim().toLowerCase(); const digits = needle.replace(/\D/g, "");
    list = list.filter(c => (c.nom || "").toLowerCase().includes(needle) || (c.email || "").toLowerCase().includes(needle)
      || (digits && normPhone(c.telephone).includes(digits)) || (c.nationalite || "").toLowerCase().includes(needle));
  }
  const vip = DB.all("clients").filter(c => c.vip).length;
  const fideles = DB.all("clients").filter(c => clientStats(c).sejours >= 2).length;

  const generate = () => {
    const before = DB.all("clients").length;
    DB.all("reservations").forEach(r => { if (r.statut !== "Annulée") upsertClientFromRes(r); });
    const created = DB.all("clients").length - before;
    fireToast({ title: "Profils générés", msg: created ? created + " nouvelle(s) fiche(s) créée(s) depuis les réservations." : "Tous les clients avaient déjà une fiche.", duration: 4000 });
  };

  const kpis = [
    { n: DB.all("clients").length, l: "Clients", ic: "users", bg: "#E7F4FB", c: "#0F76A8" },
    { n: vip, l: "Clients VIP", ic: "star", bg: "#FFF3DC", c: "#B07A14" },
    { n: fideles, l: "Clients fidèles (≥ 2 séjours)", ic: "sparkle", bg: "#E3F6EA", c: "#1E8A4E" }
  ];

  return (
    <div>
      <div className="admin-h">
        <div><h1>Clients (CRM)</h1><div className="sub">Fiches clients, historique de séjours, préférences et pièces d'identité.</div></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="a-btn" onClick={generate}><Icon name="sparkle" size={15} /> Générer depuis les réservations</button>
          <button className="a-btn primary" onClick={() => setEdit({ client: null })}><Icon name="userPlus" size={16} /> Nouveau client</button>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {kpis.map((k, i) => (
          <div className="a-card kpi" key={i}>
            <div className="k-top"><span className="k-l" style={{ marginTop: 0, fontWeight: 600 }}>{k.l}</span>
              <span className="k-ic" style={{ background: k.bg, color: k.c }}><Icon name={k.ic} size={20} /></span></div>
            <div className="k-n">{k.n}</div>
          </div>
        ))}
      </div>

      <div className="a-toolbar">
        <div className="a-search"><Icon name="search" size={17} style={{ color: "#8a96a2" }} /><input placeholder="Rechercher (nom, e-mail, numéro, nationalité)…" value={q} onChange={e => setQ(e.target.value)} /></div>
      </div>

      <div className="a-card" style={{ overflow: "auto" }}>
        <table className="a-table">
          <thead><tr><th>Client</th><th>Contact</th><th>Nationalité</th><th>Séjours</th><th>Nuits</th><th>Dépensé</th><th></th></tr></thead>
          <tbody>
            {list.map(c => { const s = clientStats(c); return (
              <tr key={c.id} className="a-row-link" onClick={() => { if (piiMasked()) logAudit("Consultation fiche client (données voilées)", c.nom); setEdit({ client: c }); }}>
                <td><strong style={{ color: "var(--marine)" }}>{piiName(c.nom) || "—"}</strong>{c.vip && <span className="vip-pill">VIP</span>}{c.allergies ? <div style={{ color: "#B5453F", fontSize: ".78rem" }}>Allergies : {c.allergies}</div> : null}</td>
                <td style={{ color: "#56636f", fontSize: ".84rem" }}>{piiEmail(c.email) || "—"}<div style={{ color: "#8a96a2" }}>{piiPhone(c.telephone) || ""}</div></td>
                <td>{c.nationalite || "—"}</td>
                <td>{s.sejours}</td>
                <td>{s.nights}</td>
                <td style={{ whiteSpace: "nowrap", fontWeight: 600, color: "var(--marine)" }}>{finXof(s.spent)}</td>
                <td style={{ textAlign: "right" }}><button className="icon-btn" onClick={(e) => { e.stopPropagation(); setEdit({ client: c }); }} aria-label="Ouvrir"><Icon name="eye" size={16} /></button></td>
              </tr>
            ); })}
            {!list.length && <tr><td colSpan="7"><div className="empty-note" style={{ border: 0 }}>Aucun client. Cliquez « Générer depuis les réservations » ou « Nouveau client ».</div></td></tr>}
          </tbody>
        </table>
      </div>

      {edit && <ClientEditor client={edit.client} onClose={() => setEdit(null)} />}
    </div>
  );
}

/* =========================================================
   Éditeur de fiche client
   ========================================================= */
function ClientEditor({ client, onClose }) {
  const [f, setF] = useState(() => Object.assign({
    nom: "", email: "", telephone: "", nationalite: "", langue: "Français",
    vip: false, preferences: "", allergies: "", notes: "", piece_type: "CNI", piece_num: "", piece_image: ""
  }, client || {}));
  const set = (k, v) => setF(s => Object.assign({}, s, { [k]: v }));
  const history = client ? clientReservations(client) : [];
  const stats = client ? clientStats(client) : { sejours: 0, nights: 0, spent: 0 };
  const save = () => {
    if (!(f.nom || "").trim()) return fireToast({ title: "Nom requis", msg: "Indiquez le nom du client.", duration: 3500 });
    const out = Object.assign({}, f, { nom: f.nom.trim() });
    if (client) DB.update("clients", client.id, out);
    else DB.insert("clients", Object.assign({ date_creation: Date.now() }, out));
    fireToast({ title: client ? "Fiche mise à jour" : "Client créé", msg: out.nom + " enregistré(e).", duration: 3500 });
    onClose();
  };
  /* Accès prestataire : fiche en lecture seule, données voilées — la gestion
     nominative des clients est réservée à l'équipe de l'hôtel. */
  if (piiMasked()) {
    return (
      <div className="modal-bg" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="m-head"><h3>{client ? piiName(f.nom) || "Fiche client" : "Nouveau client"}</h3><button className="icon-btn" onClick={onClose}><Icon name="close" size={16} /></button></div>
          <div className="m-body">
            <PiiNote />
            {client ? (
              <div>
                <div className="crm-stats">
                  <div><span>{stats.sejours}</span>séjour{stats.sejours > 1 ? "s" : ""}</div>
                  <div><span>{stats.nights}</span>nuits cumulées</div>
                  <div><span>{finXof(stats.spent)}</span>dépense totale</div>
                </div>
                {[["Nom", piiName(f.nom)], ["E-mail", piiEmail(f.email) || "—"], ["Téléphone", piiPhone(f.telephone) || "—"], ["Nationalité", f.nationalite ? "•••" : "—"], ["Pièce d'identité", f.piece_num ? f.piece_type + " · n° ••••••" : "—"]].map((d, i) =>
                  <div className="detail-row" key={i}><span className="dl">{d[0]}</span><span className="dv">{d[1]}</span></div>)}
              </div>
            ) : (
              <p className="muted" style={{ fontSize: ".92rem" }}>La création de fiches clients est réservée à l'équipe de l'hôtel.</p>
            )}
          </div>
          <div className="m-foot"><button className="a-btn" onClick={onClose}>Fermer</button></div>
        </div>
      </div>
    );
  }
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: "min(680px,100%)" }}>
        <div className="m-head"><h3>{client ? "Fiche client" : "Nouveau client"}{f.vip ? <span className="vip-pill" style={{ marginLeft: 10 }}>VIP</span> : null}</h3><button className="icon-btn" onClick={onClose}><Icon name="close" size={16} /></button></div>
        <div className="m-body">
          {client &&
            <div className="crm-stats">
              <div><span>{stats.sejours}</span>séjour{stats.sejours > 1 ? "s" : ""}</div>
              <div><span>{stats.nights}</span>nuits cumulées</div>
              <div><span>{finXof(stats.spent)}</span>dépense totale</div>
            </div>}
          <div className="row-2">
            <div className="field"><label>Nom complet</label><input value={f.nom} onChange={e => set("nom", e.target.value)} autoFocus /></div>
            <div className="field"><label>Nationalité</label><input value={f.nationalite} onChange={e => set("nationalite", e.target.value)} placeholder="Ex. Ivoirienne" /></div>
          </div>
          <div className="row-2">
            <div className="field"><label>E-mail</label><input value={f.email} onChange={e => set("email", e.target.value)} /></div>
            <div className="field"><label>Téléphone / WhatsApp</label><input value={f.telephone} onChange={e => set("telephone", e.target.value)} /></div>
          </div>
          <div className="row-2">
            <div className="field"><label>Langue</label><select value={f.langue} onChange={e => set("langue", e.target.value)}>{LANGUES.map(l => <option key={l}>{l}</option>)}</select></div>
            <label className="field" style={{ justifyContent: "flex-end" }}>
              <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--marine)" }}>Client VIP</span>
              <span style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                <span className="switch"><input type="checkbox" checked={!!f.vip} onChange={e => set("vip", e.target.checked)} /><span className="sl"></span></span>
                <span style={{ color: "#6a7682", fontSize: ".88rem" }}>{f.vip ? "Traitement privilégié" : "Standard"}</span>
              </span>
            </label>
          </div>
          <div className="field"><label>Préférences (étage, oreiller, vue, boisson…)</label><textarea value={f.preferences} onChange={e => set("preferences", e.target.value)} style={{ minHeight: 70 }} /></div>
          <div className="field"><label>Allergies / régime</label><input value={f.allergies} onChange={e => set("allergies", e.target.value)} placeholder="Ex. arachides, sans gluten" /></div>
          <div className="field"><label>Notes internes</label><textarea value={f.notes} onChange={e => set("notes", e.target.value)} style={{ minHeight: 70 }} /></div>

          <div className="crm-id">
            <div className="crm-id-h"><Icon name="shield" size={15} /> Pièce d'identité (fiche de police)</div>
            <div className="row-2">
              <div className="field"><label>Type de pièce</label><select value={f.piece_type} onChange={e => set("piece_type", e.target.value)}>{PIECE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div className="field"><label>Numéro</label><input value={f.piece_num} onChange={e => set("piece_num", e.target.value)} /></div>
            </div>
            <label style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--marine)" }}>Copie de la pièce</label>
            <div style={{ marginTop: 6 }}><ImageInput value={f.piece_image} ratio="16/10" onChange={v => set("piece_image", v)} /></div>
          </div>

          {client && history.length > 0 &&
            <div className="crm-hist">
              <div className="crm-id-h"><Icon name="calendar" size={15} /> Historique des séjours</div>
              {history.map(r => (
                <div className="crm-hist-row" key={r.id}>
                  <span>{r.type_chambre || "—"}</span>
                  <span className="muted">{BC.dateShort(r.date_arrivee)} → {BC.dateShort(r.date_depart)}</span>
                  <span className={statusClass(r.statut)} style={{ marginLeft: "auto" }}>{r.statut}</span>
                </div>
              ))}
            </div>}
        </div>
        <div className="m-foot">
          {client && <button className="a-btn danger" onClick={() => { if (confirm("Supprimer la fiche de " + (f.nom || "ce client") + " ? (les réservations sont conservées)")) { DB.remove("clients", client.id); onClose(); } }}><Icon name="trash" size={15} /> Supprimer</button>}
          <button className="a-btn" onClick={onClose}>Annuler</button>
          <button className="a-btn primary" onClick={save}><Icon name="check" size={15} /> Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Carte d'enregistrement (imprimable)
   ========================================================= */
function RegCardDoc({ res, client }) {
  const room = roomOfRes(res);
  const rows = [
    ["Nom du client", piiName(res.nom_complet)],
    ["Nationalité", piiMasked() ? "•••" : ((client && client.nationalite) || res.nationalite || "—")],
    ["Pièce d'identité", ((client && client.piece_type) || res.piece_type || "—") + ((client && client.piece_num) || res.piece_num ? " · n° " + piiId((client && client.piece_num) || res.piece_num) : "")],
    ["Téléphone / WhatsApp", piiPhone(res.telephone_whatsapp) || "—"],
    ["E-mail", piiEmail(res.email) || "—"],
    ["Chambre", (room ? room.nom : res.type_chambre || "—") + (res.unite ? " · n° " + res.unite : "")],
    ["Arrivée", BC.dateShort(res.date_arrivee) + (res.checkin_at ? " · " + hhmm(res.checkin_at) : "")],
    ["Départ", BC.dateShort(res.date_depart)],
    ["Personnes", res.nombre_personnes]
  ];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, borderBottom: "2px solid var(--marine)", paddingBottom: 12 }}>
        <div>
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "1.5rem", fontWeight: 600, color: "var(--marine)", lineHeight: 1.05 }}>Hôtel Blue Caravelle</div>
          <div style={{ color: "#8a96a2", fontSize: ".78rem", marginTop: 3 }}>{BC.ADDRESS}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, color: "var(--marine)", fontSize: "1.02rem" }}>Carte d'enregistrement</div>
          <div style={{ color: "#8a96a2", fontSize: ".76rem" }}>Registration card</div>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 14 }}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ padding: "9px 4px", borderBottom: "1px solid #EEF2F6", color: "#8a96a2", fontSize: ".82rem", width: 170 }}>{r[0]}</td>
              <td style={{ padding: "9px 4px", borderBottom: "1px solid #EEF2F6", color: "#1c2b3a", fontSize: ".9rem", fontWeight: 600 }}>{r[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 40, marginTop: 38 }}>
        <div style={{ flex: 1 }}><div style={{ borderTop: "1px solid #b6bfc8", paddingTop: 6, color: "#8a96a2", fontSize: ".78rem" }}>Signature du client</div></div>
        <div style={{ flex: 1 }}><div style={{ borderTop: "1px solid #b6bfc8", paddingTop: 6, color: "#8a96a2", fontSize: ".78rem" }}>Cachet & réception</div></div>
      </div>
      <p style={{ color: "#8a96a2", fontSize: ".72rem", marginTop: 20, lineHeight: 1.5 }}>
        En signant, le client reconnaît exactes les informations ci-dessus et accepte le règlement intérieur de l'établissement.
      </p>
    </div>
  );
}
function RegCardModal({ res, onClose }) {
  const client = findClientForRes(res);
  const ref = useRef(null);
  const print = () => { if (ref.current) printHtml(ref.current.innerHTML, "Carte d'enregistrement — " + piiName(res.nom_complet)); };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="m-head"><h3>Carte d'enregistrement</h3><button className="icon-btn" onClick={onClose}><Icon name="close" size={16} /></button></div>
        <div className="m-body"><div ref={ref}><RegCardDoc res={res} client={client} /></div></div>
        <div className="m-foot">
          <button className="a-btn" onClick={onClose}>Fermer</button>
          <button className="a-btn primary" onClick={print}><Icon name="edit" size={15} /> Imprimer</button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Bandeau profil client dans la fiche réservation
   ========================================================= */
function ResClientStrip({ res }) {
  const [editC, setEditC] = useState(false);
  const [regCard, setRegCard] = useState(false);
  const client = findClientForRes(res);
  const openProfile = () => { if (!client) { const c = upsertClientFromRes(res); DB.update("reservations", res.id, { client_id: c.id }); } setEditC(true); };
  const stats = client ? clientStats(client) : null;
  return (
    <div className="crm-strip">
      <div className="crm-strip-main">
        <span className="crm-ava"><Icon name="users" size={17} /></span>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <strong style={{ color: "var(--marine)" }}>{piiName(client ? client.nom : res.nom_complet)}</strong>
            {client && client.vip && <span className="vip-pill">VIP</span>}
            {stats && stats.sejours > 1 && <span className="badge badge-ocean" style={{ fontSize: ".64rem" }}>Fidèle · {stats.sejours} séjours</span>}
            {!client && <span className="muted" style={{ fontSize: ".8rem" }}>Aucune fiche</span>}
          </div>
          {client && (client.preferences || client.allergies) &&
            <div className="crm-strip-sub">
              {client.allergies ? <span style={{ color: "#B5453F" }}>⚠ {client.allergies}</span> : null}
              {client.preferences ? <span>{client.preferences}</span> : null}
            </div>}
        </div>
      </div>
      <div className="crm-strip-act">
        <button className="a-btn sm" onClick={openProfile}><Icon name="users" size={14} /> {client ? "Profil client" : "Créer la fiche"}</button>
        <button className="a-btn sm" onClick={() => setRegCard(true)}><Icon name="edit" size={14} /> Carte d'enregistrement</button>
      </div>
      {editC && <ClientEditor client={findClientForRes(res)} onClose={() => setEditC(false)} />}
      {regCard && <RegCardModal res={res} onClose={() => setRegCard(false)} />}
    </div>
  );
}

Object.assign(window, {
  PIECE_TYPES, LANGUES, normEmail, normPhone, findClientForRes, clientReservations, clientStats, upsertClientFromRes,
  AdminClients, ClientEditor, RegCardDoc, RegCardModal, ResClientStrip
});
