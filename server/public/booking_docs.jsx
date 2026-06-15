/* =========================================================
   BLUE CARAVELLE — Canal de réservation & bon de confirmation (Étape 5)
   Source de la réservation, voucher numéroté imprimable & envoyable,
   ventilation des réservations par canal.
   ========================================================= */

const SOURCES = ["Direct (site)", "Téléphone", "WhatsApp", "Walk-in", "Booking.com", "Expedia", "Agence / Tour-opérateur", "Autre"];

/* Numéro de confirmation séquentiel (BC-R-AAAA-0001), figé sur la réservation. */
function ensureConfirmNo(res) {
  if (res.confirm_no) return res.confirm_no;
  const info = (DB.getSettings && DB.getSettings().info) || {};
  const seq = (Number(info.confirm_seq) || 0) + 1;
  DB.updateInfo({ confirm_seq: seq });
  const no = "BC-R-" + new Date().getFullYear() + "-" + String(seq).padStart(4, "0");
  DB.update("reservations", res.id, { confirm_no: no });
  return no;
}

/* Document « Bon de confirmation / Booking voucher » (imprimable). */
function VoucherDoc({ res, confirmNo }) {
  const room = roomOfRes(res);
  const prix = room ? Number(room.prix) || 0 : 0;
  const nights = Math.max(1, nightsBetween(res.date_arrivee, res.date_depart) || 1);
  const est = prix * nights;
  const acompte = Number(res.acompte) || 0;
  const row = (l, v) => (
    <tr><td style={{ padding: "9px 4px", borderBottom: "1px solid #EEF2F6", color: "#8a96a2", fontSize: ".82rem", width: 165 }}>{l}</td>
      <td style={{ padding: "9px 4px", borderBottom: "1px solid #EEF2F6", color: "#1c2b3a", fontSize: ".9rem", fontWeight: 600 }}>{v}</td></tr>
  );
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, borderBottom: "2px solid var(--or)", paddingBottom: 12 }}>
        <div>
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "1.5rem", fontWeight: 600, color: "var(--marine)", lineHeight: 1.05 }}>Hôtel Blue Caravelle</div>
          <div style={{ color: "#8a96a2", fontSize: ".78rem", marginTop: 3 }}>{BC.ADDRESS}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700, color: "var(--marine)", fontSize: "1.02rem" }}>Bon de confirmation</div>
          <div style={{ color: "#8a96a2", fontSize: ".76rem" }}>Booking voucher</div>
          {confirmNo && <div style={{ marginTop: 4, fontWeight: 700, color: "var(--or)" }}>{confirmNo}</div>}
        </div>
      </div>
      <p style={{ margin: "14px 0 4px", color: "var(--anthracite)", fontSize: ".92rem" }}>Cher(e) {res.nom_complet}, nous avons le plaisir de confirmer votre réservation.</p>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
        <tbody>
          {row("Chambre", (room ? room.nom + " (" + room.type + ")" : res.type_chambre || "—"))}
          {row("Arrivée", BC.dateShort(res.date_arrivee))}
          {row("Départ", BC.dateShort(res.date_depart))}
          {row("Nuitées", nights + " nuit" + (nights > 1 ? "s" : ""))}
          {row("Personnes", res.nombre_personnes)}
          {row("Tarif estimé (hébergement)", finMasked() ? "••• FCFA" : (BC.xof(est) + " (" + BC.xof(prix) + " × " + nights + ")"))}
          {acompte > 0 ? row("Acompte reçu", finXof(acompte)) : null}
          {res.source ? row("Canal", res.source) : null}
        </tbody>
      </table>
      <div style={{ marginTop: 16, padding: "12px 14px", background: "#F4F7FA", borderRadius: 10, fontSize: ".8rem", color: "#56636f", lineHeight: 1.6 }}>
        <strong style={{ color: "var(--marine)" }}>Conditions</strong><br />
        Arrivée à partir de 14 h · départ avant 12 h. Présentation d'une pièce d'identité à l'arrivée.
        Annulation gratuite jusqu'à 48 h avant l'arrivée ; au-delà, la première nuit est due. Tarifs en FCFA, taxes comprises hors taxe de séjour.
      </div>
      <p style={{ color: "#8a96a2", fontSize: ".74rem", marginTop: 14 }}>Hôtel Blue Caravelle · {BC.PHONE} · {BC.EMAIL} · {BC.WHATSAPP_DISPLAY}</p>
    </div>
  );
}

function VoucherModal({ res, onClose }) {
  const [no, setNo] = useState(res.confirm_no || null);
  const ref = useRef(null);
  const msg = "Bonjour " + res.nom_complet + ", votre réservation à l'Hôtel Blue Caravelle est confirmée"
    + (no ? " (réf. " + no + ")" : "") + ". Arrivée le " + BC.dateShort(res.date_arrivee) + ", départ le " + BC.dateShort(res.date_depart)
    + (res.type_chambre ? " — " + res.type_chambre : "") + ". Au plaisir de vous accueillir.";
  const finalize = () => setNo(ensureConfirmNo(res));
  const print = () => { const n = no || ensureConfirmNo(res); setNo(n); setTimeout(() => { if (ref.current) printHtml(ref.current.innerHTML, "Bon de confirmation " + n + " — " + res.nom_complet); }, 60); };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="m-head"><h3>Bon de confirmation</h3><button className="icon-btn" onClick={onClose}><Icon name="close" size={16} /></button></div>
        <div className="m-body"><div ref={ref}><VoucherDoc res={res} confirmNo={no} /></div></div>
        <div className="m-foot">
          {!no && <button className="a-btn" onClick={finalize}><Icon name="check" size={15} /> Numéroter</button>}
          <a className="a-btn" href={waLink(msg, res.telephone_whatsapp)} target="_blank" rel="noopener"><Icon name="wa" size={15} /> WhatsApp</a>
          <a className="a-btn" href={"mailto:" + res.email + "?subject=" + encodeURIComponent("Confirmation de votre réservation — Hôtel Blue Caravelle") + "&body=" + encodeURIComponent(msg)}><Icon name="mail" size={15} /> E-mail</a>
          <button className="a-btn primary" onClick={print}><Icon name="edit" size={15} /> Imprimer</button>
        </div>
      </div>
    </div>
  );
}

/* Bloc « bon de confirmation » dans la fiche réservation. */
function ResVoucher({ res }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 18, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button className="a-btn" onClick={() => setOpen(true)}><Icon name="edit" size={14} /> Bon de confirmation</button>
      {res.confirm_no && <span className="muted" style={{ fontSize: ".8rem" }}>N° {res.confirm_no}</span>}
      {open && <VoucherModal res={res} onClose={() => setOpen(false)} />}
    </div>
  );
}

/* Ventilation des réservations par canal (carte pour la page Revenus). */
function SourceBreakdownCard({ ym }) {
  const { start, end } = monthBounds(ym);
  const res = DB.all("reservations").filter(r => { const d = r.date_creation ? isoOfTs(r.date_creation) : null; return d && d >= start && d <= end && r.statut !== "Annulée"; });
  const by = {};
  res.forEach(r => { const s = r.source || "Direct (site)"; by[s] = by[s] || { n: 0, ca: 0 }; by[s].n++; by[s].ca += computeFolio(r).totalTTC; });
  const keys = Object.keys(by).sort((a, b) => by[b].n - by[a].n);
  return (
    <div className="a-card" style={{ padding: "18px 20px", marginTop: 18 }}>
      <strong style={{ color: "var(--marine)" }}>Réservations par canal</strong>
      <div className="sub" style={{ fontSize: ".82rem", color: "#8a96a2", marginTop: 2 }}>Demandes reçues sur la période, par source.</div>
      <table className="a-table" style={{ marginTop: 10 }}>
        <thead><tr><th>Canal</th><th style={{ textAlign: "right" }}>Réservations</th><th style={{ textAlign: "right" }}>CA estimé</th></tr></thead>
        <tbody>
          {keys.map(k => <tr key={k}><td><strong style={{ color: "var(--marine)" }}>{k}</strong></td><td style={{ textAlign: "right" }}>{by[k].n}</td><td style={{ textAlign: "right", fontWeight: 600, color: "var(--marine)" }}>{finXof(by[k].ca)}</td></tr>)}
          {!keys.length && <tr><td colSpan="3"><div className="empty-note" style={{ border: 0 }}>Aucune réservation reçue sur la période.</div></td></tr>}
        </tbody>
      </table>
    </div>
  );
}

Object.assign(window, { SOURCES, ensureConfirmNo, VoucherDoc, VoucherModal, ResVoucher, SourceBreakdownCard });
