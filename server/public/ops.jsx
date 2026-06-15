/* =========================================================
   BLUE CARAVELLE — Opérations (Étape 1)
   Calendrier de disponibilité par dates + Housekeeping (ménage).
   Composants globaux consommés par admin.jsx.
   ========================================================= */

/* ---------- Statuts ménage ---------- */
const HK_STATUTS = [
  { k: "a_nettoyer",   l: "À nettoyer",   c: "#B5453F", bg: "#FBE7E4" },
  { k: "en_cours",     l: "En cours",     c: "#B07A14", bg: "#FFF3DC" },
  { k: "propre",       l: "Propre",       c: "#1E8A4E", bg: "#E3F6EA" },
  { k: "hors_service", l: "Hors service", c: "#5A6470", bg: "#EAEEF2" }
];
function hkMeta(k) { return HK_STATUTS.find(s => s.k === k) || HK_STATUTS[2]; }
function unitMenage(room, u) { return (room.menage && room.menage[u]) || "propre"; }

/* Met à jour le statut ménage d'une unité (chambre physique). */
function setUnitMenage(roomId, unite, status) {
  const room = DB.find("rooms", roomId);
  if (!room) return;
  const menage = Object.assign({}, room.menage || {});
  if (status) menage[unite] = status; else delete menage[unite];
  DB.update("rooms", roomId, { menage: menage });
}

/* ---------- Disponibilité par date ----------
   Nombre d'unités libres d'une catégorie une nuit donnée (iso) :
   unités − réservations qui chevauchent − unités hors service ;
   0 si la catégorie est bloquée ce jour-là. */
function unitsBookedOn(room, iso, reservations) {
  return reservations.filter(r =>
    r.statut !== "Annulée" && !r.checkout_at &&
    (r.chambre_id === room.id || r.type_chambre === room.nom) &&
    r.date_arrivee && r.date_depart &&
    r.date_arrivee <= iso && iso < r.date_depart
  ).length;
}
function freeUnitsOn(room, iso, reservations) {
  if (dateCovers(room.dates_bloquees, iso)) return 0;
  const oos = Object.keys(room.menage || {}).filter(u => room.menage[u] === "hors_service").length;
  return Math.max(0, (room.unites || 0) - unitsBookedOn(room, iso, reservations) - oos);
}

/* ---------- Helpers calendrier ---------- */
function isoAddDays(iso, n) { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function dayMeta(iso) {
  const d = new Date(iso + "T00:00:00");
  return { dow: d.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""), dm: d.getDate(),
           month: d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""), weekend: d.getDay() === 0 || d.getDay() === 6 };
}

/* =========================================================
   CALENDRIER D'OCCUPATION
   ========================================================= */
function AdminPlanning() {
  useDB();
  const HORIZON = 14;
  const [start, setStart] = useState(todayISO());
  const rooms = DB.all("rooms").filter(r => (r.unites || 0) > 0);
  const reservations = DB.all("reservations");
  const days = Array.from({ length: HORIZON }, (_, i) => isoAddDays(start, i));
  const totalUnits = rooms.reduce((s, r) => s + (r.unites || 0), 0);
  const today = todayISO();

  const cellClass = (room, iso) => {
    if (dateCovers(room.dates_bloquees, iso)) return "blk";
    const free = freeUnitsOn(room, iso, reservations);
    if (free <= 0) return "full";
    if (free <= Math.max(1, Math.ceil((room.unites || 0) * 0.34))) return "low";
    return "ok";
  };
  const hotelFree = (iso) => rooms.reduce((s, r) => s + freeUnitsOn(r, iso, reservations), 0);
  const arrivalsOn = (iso) => reservations.filter(r => r.statut !== "Annulée" && r.date_arrivee === iso).length;
  const departuresOn = (iso) => reservations.filter(r => r.statut !== "Annulée" && r.date_depart === iso).length;

  return (
    <div>
      <div className="admin-h">
        <div><h1>Calendrier d'occupation</h1><div className="sub">Disponibilité par catégorie sur {HORIZON} jours — anticipez surréservations et creux.</div></div>
        <div className="pl-nav">
          <button className="a-btn sm" onClick={() => setStart(isoAddDays(start, -7))}><Icon name="arrowL" size={14} /> 7 j</button>
          <button className="a-btn sm" onClick={() => setStart(today)}>Aujourd'hui</button>
          <button className="a-btn sm" onClick={() => setStart(isoAddDays(start, 7))}>7 j <Icon name="arrow" size={14} /></button>
          <label className="bk-date" style={{ marginLeft: 4 }}>Début <input type="date" value={start} onChange={e => setStart(e.target.value || today)} /></label>
        </div>
      </div>

      <div className="pl-legend">
        <span><i className="pl-sw ok"></i> Disponible</span>
        <span><i className="pl-sw low"></i> Tension</span>
        <span><i className="pl-sw full"></i> Complet</span>
        <span><i className="pl-sw blk"></i> Bloquée</span>
        <span className="muted" style={{ marginLeft: "auto" }}>Chiffre = unités libres</span>
      </div>

      <div className="a-card pl-wrap">
        <table className="pl-grid">
          <thead>
            <tr>
              <th className="pl-rowhead">Catégorie</th>
              {days.map(iso => { const m = dayMeta(iso); return (
                <th key={iso} className={"pl-day" + (iso === today ? " today" : "") + (m.weekend ? " we" : "")}>
                  <span className="pl-dow">{m.dow}</span><span className="pl-dm">{m.dm}</span>
                </th>); })}
            </tr>
          </thead>
          <tbody>
            {rooms.map(room => (
              <tr key={room.id}>
                <td className="pl-rowhead">
                  <strong>{room.nom}</strong>
                  <span className="pl-sub">{room.type} · {room.unites} unité{room.unites > 1 ? "s" : ""}</span>
                </td>
                {days.map(iso => {
                  const cls = cellClass(room, iso);
                  const free = cls === "blk" ? 0 : freeUnitsOn(room, iso, reservations);
                  return <td key={iso} className={"pl-cell " + cls + (iso === today ? " today" : "")}
                    title={room.nom + " · " + BC.dateShort(iso) + " — " + (cls === "blk" ? "bloquée" : free + " libre(s)")}>
                    {cls === "blk" ? "—" : free}</td>;
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="pl-foot">
              <td className="pl-rowhead">Taux d'occupation</td>
              {days.map(iso => { const occ = totalUnits ? Math.round((1 - hotelFree(iso) / totalUnits) * 100) : 0;
                return <td key={iso} className={"pl-occ" + (iso === today ? " today" : "")}>{occ}%</td>; })}
            </tr>
            <tr className="pl-foot sub">
              <td className="pl-rowhead">Arrivées · Départs</td>
              {days.map(iso => (
                <td key={iso} className={"pl-ad" + (iso === today ? " today" : "")}>
                  <span className="pl-arr" title="Arrivées">▲{arrivalsOn(iso)}</span>
                  <span className="pl-dep" title="Départs">▼{departuresOn(iso)}</span>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* =========================================================
   HOUSEKEEPING — état ménage des chambres
   ========================================================= */
function AdminHousekeeping() {
  useDB();
  const rooms = DB.all("rooms").filter(r => (r.unites || 0) > 0);
  const reservations = DB.all("reservations");
  const occupantOf = (room, u) => reservations.find(r =>
    r.chambre_id === room.id && r.unite === u && r.checkin_at && !r.checkout_at && r.statut !== "Annulée");

  // Synthèse globale.
  const counts = { a_nettoyer: 0, en_cours: 0, propre: 0, hors_service: 0, occupee: 0 };
  rooms.forEach(room => {
    for (let u = 1; u <= room.unites; u++) {
      if (occupantOf(room, u)) counts.occupee++;
      else counts[unitMenage(room, u)]++;
    }
  });
  const kpis = [
    { n: counts.a_nettoyer, l: "À nettoyer", ...hkMeta("a_nettoyer") },
    { n: counts.en_cours, l: "En cours", ...hkMeta("en_cours") },
    { n: counts.propre, l: "Propres & prêtes", ...hkMeta("propre") },
    { n: counts.occupee, l: "Occupées", c: "#0F76A8", bg: "#E7F4FB" },
    { n: counts.hors_service, l: "Hors service", ...hkMeta("hors_service") }
  ];

  const markRoomClean = (room) => {
    const menage = Object.assign({}, room.menage || {});
    for (let u = 1; u <= room.unites; u++) if (menage[u] !== "hors_service") menage[u] = "propre";
    DB.update("rooms", room.id, { menage: menage });
    fireToast({ title: "Chambres prêtes", msg: room.nom + " — toutes les unités libres marquées propres.", duration: 3500 });
  };

  return (
    <div>
      <div className="admin-h">
        <div><h1>Housekeeping</h1><div className="sub">État de propreté en temps réel. Un départ bascule automatiquement la chambre « à nettoyer ».</div></div>
      </div>

      <div className="kpi-grid hk-kpis">
        {kpis.map((k, i) => (
          <div className="a-card kpi" key={i}>
            <div className="k-top"><span className="k-l" style={{ marginTop: 0, fontWeight: 600 }}>{k.l}</span>
              <span className="k-ic" style={{ background: k.bg, color: k.c }}><Icon name="bed" size={20} /></span></div>
            <div className="k-n">{k.n}</div>
          </div>
        ))}
      </div>

      <div className="grid" style={{ gap: 16 }}>
        {rooms.map(room => (
          <div className="a-card hk-room" key={room.id}>
            <div className="hk-room-h">
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <strong style={{ color: "var(--marine)", fontSize: "1.05rem" }}>{room.nom}</strong>
                <span className="badge badge-gold">{room.type}</span>
              </div>
              <button className="a-btn sm" onClick={() => markRoomClean(room)}><Icon name="check" size={14} /> Tout marquer propre</button>
            </div>
            <div className="hk-units">
              {Array.from({ length: room.unites }, (_, i) => i + 1).map(u => {
                const occ = occupantOf(room, u);
                const st = unitMenage(room, u);
                const m = hkMeta(st);
                return (
                  <div className="hk-unit" key={u} style={{ borderColor: occ ? "#BBD8EC" : m.bg }}>
                    <div className="hk-unit-h">
                      <span className="hk-no">N° {u}</span>
                      {occ ? <span className="hk-tag" style={{ background: "#E7F4FB", color: "#0F76A8" }}>Occupée</span>
                           : <span className="hk-tag" style={{ background: m.bg, color: m.c }}>{m.l}</span>}
                    </div>
                    {occ ? (
                      <div className="hk-occ">{piiName(occ.nom_complet)}<span>départ {BC.dateShort(occ.date_depart)}</span></div>
                    ) : (
                      <div className="hk-actions">
                        {HK_STATUTS.map(s => (
                          <button key={s.k} className={"hk-btn" + (st === s.k ? " on" : "")}
                            style={st === s.k ? { background: s.bg, color: s.c, borderColor: s.c } : null}
                            onClick={() => setUnitMenage(room.id, u, s.k)}>{s.l}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  HK_STATUTS, hkMeta, unitMenage, setUnitMenage,
  unitsBookedOn, freeUnitsOn, isoAddDays, dayMeta,
  AdminPlanning, AdminHousekeeping
});
