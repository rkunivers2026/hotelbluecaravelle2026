/* =========================================================
   BLUE CARAVELLE — Revenus & performance (Étape 4)
   Indicateurs hôteliers (CA, ADR, RevPAR, taux d'occupation),
   ventilations, export CSV et rapport du jour imprimable.
   ========================================================= */

function nightsList(arr, dep) {
  if (!arr || !dep) return [];
  const out = []; let d = arr; let g = 0;
  while (d < dep && g < 400) { out.push(d); d = isoAddDays(d, 1); g++; }
  return out;
}
function periodDays(startISO, endISO) {
  const out = []; let d = startISO; let g = 0;
  while (d <= endISO && g < 400) { out.push(d); d = isoAddDays(d, 1); g++; }
  return out;
}
function isoOfTs(ts) { try { return new Date(ts).toISOString().slice(0, 10); } catch (e) { return null; } }
function pct(x) { return Math.round(x * 100) + " %"; }

/* Agrégats de performance sur une période [startISO, endISO]. */
function revenueReport(startISO, endISO) {
  const rooms = DB.all("rooms");
  const totalUnits = rooms.reduce((s, r) => s + (r.unites || 0), 0);
  const days = periodDays(startISO, endISO);
  const nbJours = days.length;
  const inP = (iso) => iso && iso >= startISO && iso <= endISO;
  const reservations = DB.all("reservations").filter(r => r.statut !== "Annulée");
  const fp = facturationParams();
  let heberg = 0, extras = 0, taxe = 0, nuitees = 0, encaisse = 0;
  const perRoom = {}, perCat = {}, perDay = {};
  days.forEach(d => perDay[d] = 0);
  reservations.forEach(r => {
    const room = roomOfRes(r); const prix = room ? Number(room.prix) || 0 : 0;
    const pers = Number(r.nombre_personnes) || 1;
    const nip = nightsList(r.date_arrivee, r.date_depart).filter(inP);
    if (nip.length) {
      heberg += prix * nip.length; nuitees += nip.length; taxe += fp.taxe * pers * nip.length;
      nip.forEach(iso => { if (perDay[iso] != null) perDay[iso] += prix; });
      if (room) { perRoom[room.nom] = perRoom[room.nom] || { ca: 0, nuits: 0, type: room.type }; perRoom[room.nom].ca += prix * nip.length; perRoom[room.nom].nuits += nip.length; }
    }
    (r.folio || []).forEach(l => {
      const iso = l.date ? isoOfTs(l.date) : r.date_arrivee;
      const m = (Number(l.qte) || 0) * (Number(l.pu) || 0);
      if (inP(iso)) { extras += m; perCat[l.categorie || "Divers"] = (perCat[l.categorie || "Divers"] || 0) + m; if (perDay[iso] != null) perDay[iso] += m; }
    });
    (r.paiements || []).forEach(p => { const iso = p.date ? isoOfTs(p.date) : r.date_arrivee; if (inP(iso)) encaisse += Number(p.montant) || 0; });
    if (r.acompte > 0 && inP(r.date_arrivee)) encaisse += Number(r.acompte) || 0;
  });
  const totalTTC = heberg + extras + taxe;
  const dispo = totalUnits * nbJours;
  return {
    days, nbJours, totalUnits, dispo, heberg, extras, taxe, nuitees, totalTTC, encaisse,
    adr: nuitees ? heberg / nuitees : 0, occ: dispo ? nuitees / dispo : 0, revpar: dispo ? heberg / dispo : 0,
    perRoom, perCat, perDay
  };
}

/* Export CSV générique (téléchargement). */
function downloadCSV(filename, header, rows) {
  const esc = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  const csv = [header.map(esc).join(",")].concat(rows.map(r => r.map(esc).join(","))).join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 120);
}
function exportReservationsCSV() {
  const header = ["Référence", "Client", "E-mail", "Téléphone", "Chambre", "Arrivée", "Départ", "Nuits", "Pers.", "Statut", "Sous-total", "Taxe séjour", "Total TTC", "Payé", "Reste", "Facture"];
  const rows = DB.all("reservations").slice().sort((a, b) => (a.date_arrivee || "").localeCompare(b.date_arrivee || "")).map(r => {
    const c = computeFolio(r);
    return [r.id, r.nom_complet, r.email, r.telephone_whatsapp, r.type_chambre || "", r.date_arrivee, r.date_depart,
      c.nights, r.nombre_personnes, r.statut, c.sousTotal, c.taxeSejour, c.totalTTC, c.paye, c.reste, r.facture_no || ""];
  });
  downloadCSV("bleu-caravelle-reservations-" + todayISO() + ".csv", header, rows);
  fireToast({ title: "Export CSV généré", msg: rows.length + " réservation(s) exportée(s).", duration: 3500 });
}

/* Rapport du jour imprimable (arrivées / départs / présents). */
function printDailyReport() {
  const date = todayISO();
  const rooms = DB.all("rooms");
  const res = DB.all("reservations");
  const arrivals = res.filter(r => !r.checkin_at && !r.checkout_at && r.statut !== "Annulée" && r.statut !== "Terminée" && r.date_arrivee && r.date_arrivee <= date && (!r.date_depart || r.date_depart > date));
  const inhouse = res.filter(r => r.checkin_at && !r.checkout_at && r.statut !== "Annulée");
  const departures = inhouse.filter(r => r.date_depart && r.date_depart <= date);
  const block = (title, list, fn) => '<h3 style="font-family:Cormorant Garamond,serif;color:#14365C;margin:18px 0 6px;font-size:18px;">' + title + ' (' + list.length + ')</h3>' +
    (list.length ? '<table style="width:100%;border-collapse:collapse;font-size:13px;">' + list.map(fn).join("") + '</table>' : '<p style="color:#8a96a2;font-size:13px;">Aucun.</p>');
  const roomName = (r) => { const rm = rooms.find(x => x.id === r.chambre_id); return rm ? rm.nom + (r.unite ? " n°" + r.unite : "") : (r.type_chambre || "—"); };
  const tr = (cells) => '<tr>' + cells.map(c => '<td style="padding:6px 4px;border-bottom:1px solid #eef2f6;">' + c + '</td>').join("") + '</tr>';
  const html =
    '<div style="display:flex;justify-content:space-between;border-bottom:2px solid #14365C;padding-bottom:10px;">' +
    '<div style="font-family:Cormorant Garamond,serif;font-size:24px;font-weight:600;color:#14365C;">Hôtel Blue Caravelle</div>' +
    '<div style="text-align:right;"><strong>Rapport du jour</strong><br><span style="color:#8a96a2;font-size:13px;">' + BC.dateShort(date) + '</span></div></div>' +
    block("Arrivées attendues", arrivals, r => tr([r.nom_complet, r.type_chambre || "—", r.nombre_personnes + " pers."])) +
    block("Départs du jour", departures, r => tr([r.nom_complet, roomName(r), "départ " + BC.dateShort(r.date_depart)])) +
    block("Clients présents", inhouse, r => tr([r.nom_complet, roomName(r), "→ " + BC.dateShort(r.date_depart)]));
  printHtml(html, "Rapport du jour — " + date);
}

/* Sélecteur de mois → période [début, min(fin de mois, aujourd'hui)]. */
function monthBounds(ym) {
  const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7));
  const start = ym + "-01";
  const last = new Date(y, m, 0).getDate();
  let end = ym + "-" + String(last).padStart(2, "0");
  const t = todayISO();
  if (end > t && start <= t) end = t;
  return { start, end };
}
function shiftMonth(ym, n) {
  let y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)) + n;
  while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; }
  return y + "-" + String(m).padStart(2, "0");
}

/* =========================================================
   Page Revenus & performance
   ========================================================= */
function AdminRevenue() {
  useDB();
  const [ym, setYm] = useState(todayISO().slice(0, 7));
  const { start, end } = monthBounds(ym);
  const rep = revenueReport(start, end);
  const monthLabel = new Date(ym + "-01T00:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const maxDay = Math.max(1, ...rep.days.map(d => rep.perDay[d]));

  const kpis = [
    { n: BC.xof(rep.totalTTC), l: "CA total (TTC)", ic: "sparkle", bg: "#E3F6EA", c: "#1E8A4E" },
    { n: pct(rep.occ), l: "Taux d'occupation", ic: "bed", bg: "#E7F4FB", c: "#0F76A8" },
    { n: BC.xof(Math.round(rep.adr)), l: "ADR (prix moyen / nuit)", ic: "key", bg: "#FFF3DC", c: "#B07A14" },
    { n: BC.xof(Math.round(rep.revpar)), l: "RevPAR", ic: "grid", bg: "#EDE7FB", c: "#6244B0" }
  ];
  const subKpis = [
    { n: rep.nuitees, l: "Nuitées vendues" },
    { n: BC.xof(rep.heberg), l: "CA hébergement" },
    { n: BC.xof(rep.extras), l: "CA extras" },
    { n: BC.xof(rep.taxe), l: "Taxe de séjour" },
    { n: BC.xof(rep.encaisse), l: "Encaissé (période)" }
  ];
  const cats = Object.keys(rep.perCat).sort((a, b) => rep.perCat[b] - rep.perCat[a]);
  const roomsK = Object.keys(rep.perRoom).sort((a, b) => rep.perRoom[b].ca - rep.perRoom[a].ca);

  return (
    <div>
      <div className="admin-h">
        <div><h1>Revenus & performance</h1><div className="sub">Indicateurs hôteliers sur la période — {monthLabel}.</div></div>
        <div className="pl-nav">
          <button className="a-btn sm" onClick={() => setYm(shiftMonth(ym, -1))}><Icon name="arrowL" size={14} /></button>
          <span style={{ fontWeight: 600, color: "var(--marine)", minWidth: 130, textAlign: "center", textTransform: "capitalize" }}>{monthLabel}</span>
          <button className="a-btn sm" onClick={() => setYm(shiftMonth(ym, 1))} disabled={ym >= todayISO().slice(0, 7)}><Icon name="arrow" size={14} /></button>
          <button className="a-btn sm" onClick={printDailyReport} style={{ marginLeft: 6 }}><Icon name="edit" size={14} /> Rapport du jour</button>
          <button className="a-btn sm" onClick={exportReservationsCSV}><Icon name="upload" size={14} /> Export CSV</button>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {kpis.map((k, i) => (
          <div className="a-card kpi" key={i}>
            <div className="k-top"><span className="k-l" style={{ marginTop: 0, fontWeight: 600 }}>{k.l}</span>
              <span className="k-ic" style={{ background: k.bg, color: k.c }}><Icon name={k.ic} size={20} /></span></div>
            <div className="k-n" style={{ fontSize: "1.5rem" }}>{k.n}</div>
          </div>
        ))}
      </div>

      <div className="rev-sub">
        {subKpis.map((k, i) => <div className="rev-sub-c" key={i}><span className="rev-sub-n">{k.n}</span><span className="rev-sub-l">{k.l}</span></div>)}
      </div>

      <div className="a-card" style={{ padding: "20px 22px", marginTop: 18 }}>
        <strong style={{ color: "var(--marine)" }}>Chiffre d'affaires par jour</strong>
        <div className="rev-chart">
          {rep.days.map(d => { const v = rep.perDay[d]; const m = dayMeta(d);
            return (
              <div className="rev-bar-wrap" key={d} title={BC.dateShort(d) + " — " + BC.xof(v)}>
                <div className="rev-bar" style={{ height: Math.round((v / maxDay) * 100) + "%" }}></div>
                <span className="rev-bar-x">{m.dm}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rev-tables">
        <div className="a-card" style={{ padding: "18px 20px" }}>
          <strong style={{ color: "var(--marine)" }}>Par catégorie de chambre</strong>
          <table className="a-table" style={{ marginTop: 8 }}>
            <thead><tr><th>Chambre</th><th style={{ textAlign: "right" }}>Nuits</th><th style={{ textAlign: "right" }}>ADR</th><th style={{ textAlign: "right" }}>CA</th></tr></thead>
            <tbody>
              {roomsK.map(nom => { const x = rep.perRoom[nom]; return (
                <tr key={nom}><td><strong style={{ color: "var(--marine)" }}>{nom}</strong><div style={{ color: "#8a96a2", fontSize: ".78rem" }}>{x.type}</div></td>
                  <td style={{ textAlign: "right" }}>{x.nuits}</td>
                  <td style={{ textAlign: "right" }}>{BC.xof(Math.round(x.nuits ? x.ca / x.nuits : 0))}</td>
                  <td style={{ textAlign: "right", fontWeight: 600, color: "var(--marine)" }}>{BC.xof(x.ca)}</td></tr>
              ); })}
              {!roomsK.length && <tr><td colSpan="4"><div className="empty-note" style={{ border: 0 }}>Aucune nuitée sur la période.</div></td></tr>}
            </tbody>
          </table>
        </div>

        <div className="a-card" style={{ padding: "18px 20px" }}>
          <strong style={{ color: "var(--marine)" }}>Extras par catégorie</strong>
          <table className="a-table" style={{ marginTop: 8 }}>
            <thead><tr><th>Catégorie</th><th style={{ textAlign: "right" }}>CA</th></tr></thead>
            <tbody>
              {cats.map(c => <tr key={c}><td><strong style={{ color: "var(--marine)" }}>{c}</strong></td><td style={{ textAlign: "right", fontWeight: 600, color: "var(--marine)" }}>{BC.xof(rep.perCat[c])}</td></tr>)}
              {!cats.length && <tr><td colSpan="2"><div className="empty-note" style={{ border: 0 }}>Aucun extra facturé sur la période.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <SourceBreakdownCard ym={ym} />
    </div>
  );
}

/* Bandeau finance compact pour le tableau de bord. */
function DashboardFinance({ go }) {
  const ym = todayISO().slice(0, 7);
  const { start, end } = monthBounds(ym);
  const rep = revenueReport(start, end);
  const items = [
    { n: BC.xof(rep.totalTTC), l: "CA du mois" },
    { n: pct(rep.occ), l: "Occupation" },
    { n: BC.xof(Math.round(rep.adr)), l: "ADR" },
    { n: BC.xof(Math.round(rep.revpar)), l: "RevPAR" }
  ];
  return (
    <div className="a-card dash-fin">
      <div className="dash-fin-h">
        <strong style={{ color: "var(--marine)" }}>Performance du mois</strong>
        <button className="a-btn sm" onClick={() => go && go("revenus")}>Détails <Icon name="arrow" size={14} /></button>
      </div>
      <div className="dash-fin-grid">
        {items.map((it, i) => <div key={i}><span className="dash-fin-n">{it.n}</span><span className="dash-fin-l">{it.l}</span></div>)}
      </div>
    </div>
  );
}

Object.assign(window, {
  nightsList, periodDays, revenueReport, downloadCSV, exportReservationsCSV,
  printDailyReport, monthBounds, shiftMonth, pct, AdminRevenue, DashboardFinance
});
