/* =========================================================
   BLUE CARAVELLE — Folio & facturation (Étape 2)
   Note de séjour complète : hébergement + extras + taxes,
   acompte / paiements, solde, facture numérotée imprimable.
   ========================================================= */

const FOLIO_CATS = ["Restaurant", "Spa & bien-être", "Excursions", "Minibar", "Blanchisserie", "Divers"];
const PAY_MODES = ["Espèces", "Carte bancaire", "Mobile Money", "Virement"];

/* Paramètres de facturation (réglables dans Paramètres du site). */
function facturationParams() {
  const info = (DB.getSettings && DB.getSettings().info) || {};
  let tva = info.tva != null && info.tva !== "" ? Number(info.tva) : 18;
  let taxe = info.taxe_sejour != null && info.taxe_sejour !== "" ? Number(info.taxe_sejour) : 0;
  if (isNaN(tva)) tva = 18;
  if (isNaN(taxe)) taxe = 0;
  return { tva: tva, taxe: taxe };
}
function roomOfRes(res) {
  const rooms = DB.all("rooms");
  return rooms.find(r => r.id === res.chambre_id) || rooms.find(r => r.nom === res.type_chambre);
}
function uidp(p) { return (p || "x") + "_" + Math.random().toString(36).slice(2, 8); }

/* Calcule la note complète. opts.nights force le nombre de nuits (au départ). */
function computeFolio(res, opts) {
  opts = opts || {};
  const p = facturationParams();
  const room = roomOfRes(res);
  const prix = room ? Number(room.prix) || 0 : 0;
  const reservedNights = nightsBetween(res.date_arrivee, res.date_depart);
  const nights = opts.nights != null ? Math.max(0, opts.nights) : Math.max(1, reservedNights || 1);
  const heberg = { id: "heberg", label: "Hébergement — " + (room ? room.nom : (res.type_chambre || "Chambre")),
    categorie: "Hébergement", qte: nights, pu: prix, montant: prix * nights, fixed: true };
  const extras = (res.folio || []).map(l => Object.assign({}, l, { montant: (Number(l.qte) || 0) * (Number(l.pu) || 0) }));
  const lignes = [heberg].concat(extras);
  const sousTotal = lignes.reduce((s, l) => s + l.montant, 0);
  const pers = Number(res.nombre_personnes) || 1;
  const taxeSejour = p.taxe > 0 ? p.taxe * pers * nights : 0;
  const totalTTC = sousTotal + taxeSejour;
  const dontTVA = p.tva > 0 ? Math.round(sousTotal - sousTotal / (1 + p.tva / 100)) : 0;
  const acompte = Number(res.acompte) || 0;
  const paiements = res.paiements || [];
  const paye = acompte + paiements.reduce((s, x) => s + (Number(x.montant) || 0), 0);
  const reste = Math.max(0, totalTTC - paye);
  const avoir = Math.max(0, paye - totalTTC);
  return { tva: p.tva, taxe: p.taxe, room, prix, nights, reservedNights, heberg, extras, lignes,
    sousTotal, pers, taxeSejour, totalTTC, dontTVA, acompte, paiements, paye, reste, avoir };
}

/* Numéro de facture séquentiel (BC-AAAA-0001), figé sur la réservation. */
function nextFactureNo() {
  const info = (DB.getSettings && DB.getSettings().info) || {};
  const seq = (Number(info.facture_seq) || 0) + 1;
  DB.updateInfo({ facture_seq: seq });
  return "BC-" + new Date().getFullYear() + "-" + String(seq).padStart(4, "0");
}
function ensureFactureNo(res) {
  if (res.facture_no) return res.facture_no;
  const no = nextFactureNo();
  DB.update("reservations", res.id, { facture_no: no });
  return no;
}

/* Impression d'un nœud (la facture) dans une fenêtre dédiée. */
function printHtml(innerHTML, title) {
  const w = window.open("", "_blank", "width=540,height=820"); if (!w) return;
  w.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + (title || "Facture") +
    '</title><style>*{box-sizing:border-box;}body{font-family:Outfit,system-ui,-apple-system,sans-serif;color:#1c2b3a;padding:34px;margin:0;}' +
    'table{width:100%;border-collapse:collapse;}</style></head><body>' + innerHTML + '</body></html>');
  w.document.close(); w.focus(); setTimeout(() => { try { w.print(); } catch (e) {} }, 280);
}

/* Document facture (réutilisé : aperçu folio + point de départ). */
function FolioDoc({ res, calc, factureNo, dateDepart }) {
  const c = calc;
  const tdL = { padding: "9px 4px", borderBottom: "1px solid #F0F3F6", fontSize: ".88rem" };
  const tdR = Object.assign({}, tdL, { textAlign: "right", whiteSpace: "nowrap" });
  const tdC = Object.assign({}, tdL, { textAlign: "center" });
  const th = { padding: "7px 4px", borderBottom: "1px solid #E7EDF2", fontWeight: 600, color: "#8a96a2", fontSize: ".78rem", textAlign: "left" };
  const line = (l, v, opt) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 6, fontSize: (opt && opt.big) ? "1.05rem" : ".9rem",
      fontWeight: (opt && opt.bold) ? 700 : 400, color: (opt && opt.bold) ? "var(--marine)" : (opt && opt.muted) ? "#8a96a2" : "var(--anthracite)" }}>
      <span>{l}</span><span style={{ whiteSpace: "nowrap" }}>{v}</span></div>
  );
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: "1.5rem", fontWeight: 600, color: "var(--marine)", lineHeight: 1.05 }}>Hôtel Blue Caravelle</div>
          <div style={{ color: "#8a96a2", fontSize: ".78rem", marginTop: 3 }}>{BC.ADDRESS}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: ".8rem", color: "#8a96a2" }}>
          <div style={{ fontWeight: 700, color: "var(--marine)", fontSize: ".95rem" }}>{factureNo ? "Facture n° " + factureNo : "Note de séjour"}</div>
          <div style={{ marginTop: 2 }}>{BC.dateShort((dateDepart || todayISO()))}</div>
        </div>
      </div>

      <div style={{ marginTop: 14, padding: "11px 13px", background: "#F4F7FA", borderRadius: 10, fontSize: ".86rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: "#8a96a2" }}>Client</span><strong style={{ color: "var(--marine)" }}>{piiName(res.nom_complet)}</strong></div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 6 }}><span style={{ color: "#8a96a2" }}>Chambre</span><span>{(c.room ? c.room.nom : res.type_chambre || "—")}{res.unite ? " · n° " + res.unite : ""}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 6 }}><span style={{ color: "#8a96a2" }}>Séjour</span><span>{BC.dateShort(res.date_arrivee)} → {BC.dateShort(dateDepart || res.date_depart)} · {c.nights} nuit{c.nights > 1 ? "s" : ""} · {c.pers} pers.</span></div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 14 }}>
        <thead><tr>
          <th style={th}>Désignation</th>
          <th style={Object.assign({}, th, { textAlign: "center" })}>Qté</th>
          <th style={Object.assign({}, th, { textAlign: "right" })}>P.U.</th>
          <th style={Object.assign({}, th, { textAlign: "right" })}>Montant</th>
        </tr></thead>
        <tbody>
          {c.lignes.map((l, i) => (
            <tr key={i}>
              <td style={tdL}>{l.label}{l.categorie && l.categorie !== "Hébergement" ? <span style={{ color: "#9aa6b1", fontSize: ".76rem" }}> · {l.categorie}</span> : null}</td>
              <td style={tdC}>{l.qte}</td>
              <td style={tdR}>{BC.xof(l.pu)}</td>
              <td style={tdR}>{BC.xof(l.montant)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 12, marginLeft: "auto", maxWidth: 320 }}>
        {line("Sous-total prestations", BC.xof(c.sousTotal))}
        {c.taxeSejour > 0 && line("Taxe de séjour (" + BC.xof(c.taxe) + " × " + c.pers + " × " + c.nights + ")", BC.xof(c.taxeSejour))}
        {line("Total à régler", BC.xof(c.totalTTC), { bold: true, big: true })}
        {c.dontTVA > 0 && line("dont TVA (" + c.tva + " %)", BC.xof(c.dontTVA), { muted: true })}
        <div style={{ borderTop: "1px solid #E7EDF2", marginTop: 10, paddingTop: 8 }}>
          {c.acompte > 0 && line("Acompte versé", "− " + BC.xof(c.acompte), { muted: true })}
          {c.paiements.map((pm, i) => line((pm.mode || "Paiement") + (pm.note ? " · " + pm.note : ""), "− " + BC.xof(pm.montant), { muted: true }))}
          {c.paye > 0 && line("Total réglé", "− " + BC.xof(c.paye))}
          {c.avoir > 0 ? line("Avoir / trop-perçu", BC.xof(c.avoir), { bold: true })
            : line("Reste à régler", BC.xof(c.reste), { bold: true, big: true })}
        </div>
      </div>

      <p style={{ color: "#8a96a2", fontSize: ".76rem", marginTop: 16, lineHeight: 1.5 }}>
        Merci de votre séjour à l'Hôtel Blue Caravelle — San Pedro, Côte d'Ivoire. {BC.PHONE} · {BC.EMAIL}
      </p>
    </div>
  );
}

/* Aperçu + impression de la facture. */
function FolioModal({ res, onClose }) {
  // Voile financier : la facture (montants + identité) est réservée à l'équipe de l'hôtel.
  if (finMasked()) return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="m-head"><h3>Facture</h3><button className="icon-btn" onClick={onClose}><Icon name="close" size={16} /></button></div>
        <div className="m-body"><div className="empty-note">Accès prestataire — les factures et montants encaissés sont voilés. Le suivi financier est réservé à l'équipe de l'hôtel.</div></div>
        <div className="m-foot"><button className="a-btn" onClick={onClose}>Fermer</button></div>
      </div>
    </div>
  );
  const [no, setNo] = useState(res.facture_no || null);
  const calc = computeFolio(res);
  const ref = useRef(null);
  const finalize = () => { const n = ensureFactureNo(res); setNo(n); };
  const print = () => { const n = no || ensureFactureNo(res); setNo(n); setTimeout(() => printHtml(ref.current.innerHTML, "Facture " + n + " — " + piiName(res.nom_complet)), 60); };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="m-head"><h3>Facture — {piiName(res.nom_complet)}</h3><button className="icon-btn" onClick={onClose}><Icon name="close" size={16} /></button></div>
        <div className="m-body"><div ref={ref}><FolioDoc res={res} calc={calc} factureNo={no} /></div></div>
        <div className="m-foot">
          <button className="a-btn" onClick={onClose}>Fermer</button>
          {!no && <button className="a-btn" onClick={finalize}><Icon name="check" size={15} /> Numéroter</button>}
          <button className="a-btn primary" onClick={print}><Icon name="edit" size={15} /> Imprimer</button>
        </div>
      </div>
    </div>
  );
}

/* Éditeur de folio embarqué dans la fiche réservation. */
function ResFolio({ res }) {
  // Voile financier : note, extras et encaissements réservés à l'équipe de l'hôtel.
  if (finMasked()) return (
    <div className="empty-note">Accès prestataire — la note, les extras et les encaissements de ce séjour sont voilés (données financières réservées à l'équipe de l'hôtel).</div>
  );
  const calc = computeFolio(res);
  const dishes = DB.all("dishes");
  const exps = DB.all("experiences");
  const [lab, setLab] = useState("");
  const [cat, setCat] = useState("Restaurant");
  const [qte, setQte] = useState(1);
  const [pu, setPu] = useState("");
  const [pMontant, setPMontant] = useState("");
  const [pMode, setPMode] = useState(PAY_MODES[0]);
  const [showInvoice, setShowInvoice] = useState(false);

  const addLine = (l) => DB.update("reservations", res.id, { folio: (res.folio || []).concat([Object.assign({ id: uidp("fl"), date: Date.now() }, l)]) });
  const rmLine = (id) => DB.update("reservations", res.id, { folio: (res.folio || []).filter(l => l.id !== id) });
  const addManual = () => {
    if (!lab.trim() || !(Number(pu) > 0)) return fireToast({ title: "Ligne incomplète", msg: "Indiquez un libellé et un prix.", duration: 3500 });
    addLine({ label: lab.trim(), categorie: cat, qte: Math.max(1, Number(qte) || 1), pu: Number(pu) || 0 });
    setLab(""); setPu(""); setQte(1);
  };
  const quickAdd = (e) => {
    const v = e.target.value; e.target.value = "";
    if (!v) return;
    const [type, id] = v.split(":");
    if (type === "d") { const d = dishes.find(x => x.id === id); if (d) addLine({ label: d.nom, categorie: "Restaurant", qte: 1, pu: Number(d.prix) || 0 }); }
    if (type === "e") { const x = exps.find(y => y.id === id); if (x) addLine({ label: x.titre, categorie: "Excursions", qte: 1, pu: Number(x.tarif) || 0 }); }
  };
  const setAcompte = (v) => DB.update("reservations", res.id, { acompte: Math.max(0, Number(v) || 0) });
  const addPayment = () => {
    if (!(Number(pMontant) > 0)) return fireToast({ title: "Montant requis", msg: "Saisissez le montant encaissé.", duration: 3500 });
    DB.update("reservations", res.id, { paiements: (res.paiements || []).concat([{ id: uidp("pay"), montant: Number(pMontant) || 0, mode: pMode, date: Date.now() }]) });
    if (typeof logAudit === "function") logAudit("Encaissement", res.nom_complet + " — " + BC.xof(Number(pMontant) || 0) + " (" + pMode + ")");
    setPMontant("");
  };
  const rmPayment = (id) => DB.update("reservations", res.id, { paiements: (res.paiements || []).filter(p => p.id !== id) });

  return (
    <div className="folio-block">
      <div className="folio-h">
        <span className="folio-title">Folio — note de séjour</span>
        <span className={"folio-bal" + (calc.reste === 0 ? " ok" : "")}>{calc.reste === 0 ? "Soldé" : "Reste " + BC.xof(calc.reste)}</span>
      </div>

      <table className="folio-table">
        <tbody>
          {calc.lignes.map(l => (
            <tr key={l.id}>
              <td><strong>{l.label}</strong>{l.categorie && l.categorie !== "Hébergement" ? <span className="folio-cat">{l.categorie}</span> : null}</td>
              <td className="num">{l.qte} × {BC.xof(l.pu)}</td>
              <td className="num strong">{BC.xof(l.montant)}</td>
              <td className="act">{!l.fixed && <button className="icon-btn danger sm-x" onClick={() => rmLine(l.id)} aria-label="Retirer">×</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="folio-add">
        <select className="mini-in" onChange={quickAdd} defaultValue="">
          <option value="">+ Ajout rapide (carte / expériences)…</option>
          <optgroup label="Restaurant">{dishes.map(d => <option key={d.id} value={"d:" + d.id}>{d.nom} — {BC.xof(d.prix)}</option>)}</optgroup>
          <optgroup label="Expériences">{exps.map(x => <option key={x.id} value={"e:" + x.id}>{x.titre} — {x.tarif ? BC.xof(x.tarif) : "sur devis"}</option>)}</optgroup>
        </select>
        <div className="folio-manual">
          <input className="mini-in" placeholder="Libellé (ex. Minibar)" value={lab} onChange={e => setLab(e.target.value)} />
          <select className="mini-in" value={cat} onChange={e => setCat(e.target.value)} style={{ flex: "0 0 130px" }}>{FOLIO_CATS.map(c => <option key={c}>{c}</option>)}</select>
          <input className="mini-in" type="number" min="1" value={qte} onChange={e => setQte(e.target.value)} style={{ flex: "0 0 64px" }} title="Quantité" />
          <input className="mini-in" type="number" min="0" placeholder="P.U." value={pu} onChange={e => setPu(e.target.value)} style={{ flex: "0 0 96px" }} />
          <button className="a-btn sm" onClick={addManual}><Icon name="plus" size={13} /> Ajouter</button>
        </div>
      </div>

      <div className="folio-totals">
        <div><span>Sous-total</span><span>{BC.xof(calc.sousTotal)}</span></div>
        {calc.taxeSejour > 0 && <div><span>Taxe de séjour</span><span>{BC.xof(calc.taxeSejour)}</span></div>}
        <div className="big"><span>Total à régler</span><span>{BC.xof(calc.totalTTC)}</span></div>
        {calc.dontTVA > 0 && <div className="muted"><span>dont TVA ({calc.tva} %)</span><span>{BC.xof(calc.dontTVA)}</span></div>}
      </div>

      <div className="folio-pay">
        <div className="folio-pay-h">Paiements</div>
        <label className="folio-acompte">Acompte versé
          <input className="mini-in" type="number" min="0" value={res.acompte || 0} onChange={e => setAcompte(e.target.value)} style={{ width: 130 }} />
        </label>
        {(res.paiements || []).map(p => (
          <div className="folio-pline" key={p.id}>
            <span>{p.mode}{p.note ? " · " + p.note : ""} <span className="muted">· {BC.dateShort(new Date(p.date).toISOString())}</span></span>
            <span className="num strong">{BC.xof(p.montant)}</span>
            <button className="icon-btn danger sm-x" onClick={() => rmPayment(p.id)} aria-label="Retirer">×</button>
          </div>
        ))}
        <div className="folio-addpay">
          <input className="mini-in" type="number" min="0" placeholder="Montant encaissé" value={pMontant} onChange={e => setPMontant(e.target.value)} />
          <select className="mini-in" value={pMode} onChange={e => setPMode(e.target.value)} style={{ flex: "0 0 150px" }}>{PAY_MODES.map(m => <option key={m}>{m}</option>)}</select>
          <button className="a-btn sm" onClick={addPayment}><Icon name="plus" size={13} /> Encaisser</button>
        </div>
        <div className="folio-bal-row">
          <span>{calc.avoir > 0 ? "Trop-perçu" : "Reste à régler"}</span>
          <strong className={calc.reste === 0 ? "ok" : ""}>{BC.xof(calc.avoir > 0 ? calc.avoir : calc.reste)}</strong>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <button className="a-btn" onClick={() => setShowInvoice(true)}><Icon name="edit" size={14} /> Voir / imprimer la facture</button>
      </div>

      {showInvoice && <FolioModal res={res} onClose={() => setShowInvoice(false)} />}
    </div>
  );
}

/* Carte de réglages facturation (Paramètres — super admin). */
function FacturationCard() {
  useDB();
  const info = (DB.getSettings().info) || {};
  const curTva = info.tva != null && info.tva !== "" ? info.tva : 18;
  const curTaxe = info.taxe_sejour != null && info.taxe_sejour !== "" ? info.taxe_sejour : 0;
  const [tva, setTva] = useState(curTva);
  const [taxe, setTaxe] = useState(curTaxe);
  const dirty = String(tva) !== String(curTva) || String(taxe) !== String(curTaxe);
  const save = () => {
    DB.updateInfo({ tva: Number(tva) || 0, taxe_sejour: Number(taxe) || 0 });
    fireToast({ title: "Facturation enregistrée", msg: "TVA et taxe de séjour mises à jour.", duration: 3500 });
  };
  return (
    <div className="a-card" style={{ padding: "24px 26px", marginBottom: 22 }}>
      <h3 className="h3" style={{ marginBottom: 4 }}>Facturation</h3>
      <p className="muted" style={{ marginBottom: 20, fontSize: ".9rem" }}>Appliqué aux notes de séjour et factures. La TVA est présentée pour information (prix TTC) ; la taxe de séjour s'ajoute par personne et par nuit.</p>
      <div className="row-2">
        <div className="field"><label>TVA (%)</label><input type="number" min="0" step="0.5" value={tva} onChange={e => setTva(e.target.value)} /></div>
        <div className="field"><label>Taxe de séjour (FCFA / pers. / nuit)</label><input type="number" min="0" value={taxe} onChange={e => setTaxe(e.target.value)} /></div>
      </div>
      <button className="a-btn primary" onClick={save} disabled={!dirty}><Icon name="check" size={15} /> Enregistrer la facturation</button>
    </div>
  );
}

Object.assign(window, {
  FOLIO_CATS, PAY_MODES, facturationParams, roomOfRes, computeFolio,
  nextFactureNo, ensureFactureNo, printHtml, FolioDoc, FolioModal, ResFolio, FacturationCard
});
