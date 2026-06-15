/* =========================================================
   BLUE CARAVELLE — Pilotage du site (super admin)
   - Santé du site : contrôles de complétude & d'hygiène
   - Outils : maintenance, annonce, sauvegarde, corbeille
   - Composants publics : MaintenancePage, AnnonceBar
   ========================================================= */

function siteInfo() { return (DB.getSettings().info) || {}; }

/* ---------- Santé du site ---------- */
function dataUrlKB(s) { return Math.round((String(s).length * 3) / 4 / 1024); }

function computeHealth() {
  const rooms = DB.all("rooms"), dishes = DB.all("dishes"), exps = DB.all("experiences"), gal = DB.all("gallery");
  const checks = [];
  const add = (level, label, detail, view) => checks.push({ level, label, detail, view });

  // Contenus incomplets
  const rNoPhoto = rooms.filter(r => !(r.photos && r.photos.length));
  const rNoDesc = rooms.filter(r => !(r.description || "").trim());
  const rNoPrix = rooms.filter(r => !(Number(r.prix) > 0));
  if (rNoPhoto.length) add("warn", "Chambre(s) sans photo", rNoPhoto.map(r => r.nom).join(", "), "contenus");
  if (rNoDesc.length) add("warn", "Chambre(s) sans description", rNoDesc.map(r => r.nom).join(", "), "contenus");
  if (rNoPrix.length) add("warn", "Chambre(s) sans prix", rNoPrix.map(r => r.nom).join(", "), "contenus");
  const dIncomplet = dishes.filter(d => !d.image || !(Number(d.prix) > 0));
  if (dIncomplet.length) add("warn", "Plat(s) sans photo ou sans prix", dIncomplet.map(d => d.nom).join(", "), "contenus");
  const eNoImg = exps.filter(x => !x.image);
  if (eNoImg.length) add("warn", "Expérience(s) sans image", eNoImg.map(x => x.titre).join(", "), "contenus");
  const gNoLeg = gal.filter(g => !(g.legende || "").trim());
  if (gNoLeg.length) add("info", "Photo(s) de galerie sans légende", gNoLeg.length + " photo(s)", "contenus");

  // File d'attente
  const avisAttente = DB.all("reviews").filter(a => !a.lu).length;
  if (avisAttente) add("info", "Avis en attente de modération", avisAttente + " avis à examiner", "contenus");
  const msgNonLus = DB.all("messages").filter(m => !m.lu).length;
  if (msgNonLus) add("info", "Messages non lus", msgNonLus + " message(s)", "messages");

  // Hygiène technique
  const heavy = [];
  const scanImg = (v, label) => { if (typeof v === "string" && v.indexOf("data:") === 0 && dataUrlKB(v) > 400) heavy.push(label + " (" + dataUrlKB(v) + " Ko)"); };
  Object.entries((DB.getSettings().images) || {}).forEach(([k, v]) => scanImg(v, "Image du site « " + k + " »"));
  rooms.forEach(r => (r.photos || []).forEach((p, i) => scanImg(p, r.nom + " — photo " + (i + 1))));
  dishes.forEach(d => scanImg(d.image, "Plat « " + d.nom + " »"));
  exps.forEach(x => scanImg(x.image, "Expérience « " + x.titre + " »"));
  gal.forEach(g => scanImg(g.image, "Galerie — " + (g.legende || "sans légende")));
  if (heavy.length) add("warn", "Image(s) trop lourde(s) (> 400 Ko)", heavy.slice(0, 4).join(" · ") + (heavy.length > 4 ? " · +" + (heavy.length - 4) : ""), "parametres");

  // États du site
  const info = siteInfo();
  if (info.maintenance) add("warn", "Mode maintenance ACTIF", "Le site public est fermé aux visiteurs.", "outils");
  if (info.annonce_active && info.annonce_fin && info.annonce_fin < todayISO())
    add("warn", "Bandeau d'annonce expiré", "L'annonce est active mais sa date de fin (" + BC.dateShort(info.annonce_fin) + ") est passée.", "outils");

  // Sauvegarde
  const last = Number(info.derniere_sauvegarde) || 0;
  const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
  if (!last) add("warn", "Aucune sauvegarde effectuée", "Téléchargez une sauvegarde des données du site.", "outils");
  else if (days > 7) add("warn", "Dernière sauvegarde il y a " + days + " jours", "Pensez à sauvegarder régulièrement.", "outils");

  return checks;
}

function AdminHealth({ go }) {
  useDB();
  const checks = computeHealth();
  const warns = checks.filter(c => c.level === "warn").length;
  const counts = [
    { n: DB.all("rooms").length, l: "chambres" },
    { n: DB.all("dishes").length, l: "plats à la carte" },
    { n: DB.all("experiences").length, l: "expériences" },
    { n: DB.all("gallery").length, l: "photos en galerie" },
    { n: DB.all("reviews").filter(a => a.affiche).length, l: "avis publiés" },
  ];
  return (
    <div>
      <div className="admin-h">
        <div><h1>Santé du site</h1><div className="sub">Contrôle de complétude et d'hygiène du site public — mis à jour en temps réel.</div></div>
      </div>

      <div className="health-counts">
        {counts.map(c => <div className="a-card hc" key={c.l}><span>{c.n}</span>{c.l}</div>)}
      </div>

      <div className="a-card" style={{ overflow: "hidden", marginTop: 18 }}>
        <div className={"health-head" + (warns ? " warn" : "")}>
          <Icon name={warns ? "sparkle" : "check"} size={18} />
          <strong>{warns ? warns + " point(s) demandent votre attention" : checks.length ? "Quelques informations, rien de bloquant" : "Tout est en ordre — le site est complet et à jour"}</strong>
        </div>
        {checks.map((c, i) => (
          <div className="health-row" key={i}>
            <span className={"health-dot " + c.level}></span>
            <div className="health-txt">
              <strong>{c.label}</strong>
              {c.detail ? <span>{c.detail}</span> : null}
            </div>
            {c.view ? <button className="a-btn" onClick={() => go(c.view)}>Corriger</button> : null}
          </div>
        ))}
        {!checks.length && <div className="empty-note" style={{ border: 0 }}>Aucun point à signaler. Revenez ici après vos modifications pour vérifier l'état du site.</div>}
      </div>
    </div>
  );
}

/* ---------- Outils : maintenance, annonce, sauvegarde, corbeille ---------- */
function MaintenanceCard() {
  useDB();
  const info = siteInfo();
  const on = !!info.maintenance;
  const [msg, setMsg] = useState(info.maintenance_msg || "");
  const toggle = () => {
    DB.updateInfo({ maintenance: !on, maintenance_msg: msg.trim() });
    logAudit(!on ? "Maintenance activée" : "Maintenance désactivée", "Site public " + (!on ? "fermé" : "rouvert"));
    fireToast({ title: !on ? "Site en maintenance" : "Site rouvert", msg: !on ? "Les visiteurs voient désormais la page de maintenance." : "Le site public est de nouveau accessible.", duration: 4500 });
  };
  return (
    <div className="a-card tool-card">
      <div className="tool-head">
        <div><h3 className="h3">Mode maintenance</h3>
          <p className="muted">Ferme temporairement le site public (le back-office reste accessible).</p></div>
        <span className={"badge " + (on ? "badge-warn" : "badge-ocean")}>{on ? "ACTIF" : "Inactif"}</span>
      </div>
      <div className="field"><label>Message affiché aux visiteurs</label>
        <textarea rows="2" value={msg} onChange={e => setMsg(e.target.value)} placeholder="Ex. Le site est en cours de mise à jour, nous revenons très vite. Contactez-nous par téléphone ou WhatsApp."></textarea>
      </div>
      <button className={"a-btn " + (on ? "primary" : "danger")} onClick={toggle}>
        <Icon name={on ? "check" : "lock"} size={15} /> {on ? "Rouvrir le site" : "Activer la maintenance"}
      </button>
    </div>
  );
}

function AnnonceCard() {
  useDB();
  const info = siteInfo();
  const [f, setF] = useState({
    txt: info.annonce_txt || "", lien: info.annonce_lien || "",
    debut: info.annonce_debut || "", fin: info.annonce_fin || ""
  });
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const on = !!info.annonce_active;
  const save = (active) => {
    if (active && !f.txt.trim()) return fireToast({ title: "Annonce vide", msg: "Saisissez le texte de l'annonce avant de l'activer.", duration: 4000 });
    DB.updateInfo({ annonce_active: active, annonce_txt: f.txt.trim(), annonce_lien: f.lien.trim(), annonce_debut: f.debut, annonce_fin: f.fin });
    logAudit(active ? "Annonce publiée" : "Annonce retirée", f.txt.trim().slice(0, 80));
    fireToast({ title: active ? "Annonce publiée" : "Annonce retirée", msg: active ? "Le bandeau est visible sur le site public." : "Le bandeau n'est plus affiché.", duration: 4000 });
  };
  return (
    <div className="a-card tool-card">
      <div className="tool-head">
        <div><h3 className="h3">Bandeau d'annonce</h3>
          <p className="muted">Promotion, événement ou information affichée sur le site public, avec période optionnelle.</p></div>
        <span className={"badge " + (on ? "badge-gold" : "badge-ocean")}>{on ? "EN LIGNE" : "Inactif"}</span>
      </div>
      <div className="field"><label>Texte de l'annonce</label>
        <input value={f.txt} onChange={e => set("txt", e.target.value)} placeholder="Ex. Offre spéciale fêtes : -20 % sur les suites du 20 au 31 décembre" />
      </div>
      <div className="row-2">
        <div className="field"><label>Lien (optionnel)</label><input value={f.lien} onChange={e => set("lien", e.target.value)} placeholder="Ex. #/reservation" /></div>
        <div className="row-2" style={{ gap: 10 }}>
          <div className="field"><label>Début</label><input type="date" value={f.debut} onChange={e => set("debut", e.target.value)} /></div>
          <div className="field"><label>Fin</label><input type="date" value={f.fin} onChange={e => set("fin", e.target.value)} /></div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="a-btn primary" onClick={() => save(true)}><Icon name="check" size={15} /> {on ? "Mettre à jour" : "Publier l'annonce"}</button>
        {on && <button className="a-btn" onClick={() => save(false)}>Retirer</button>}
      </div>
    </div>
  );
}

function BackupCard() {
  useDB();
  const info = siteInfo();
  const last = Number(info.derniere_sauvegarde) || 0;
  const fileRef = useRef(null);
  const exporter = () => {
    const blob = new Blob([DB.exportData()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "bluecaravelle-sauvegarde-" + todayISO() + ".json";
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 150);
    DB.updateInfo({ derniere_sauvegarde: Date.now() });
    logAudit("Sauvegarde exportée", "Fichier JSON téléchargé");
    fireToast({ title: "Sauvegarde téléchargée", msg: "Conservez ce fichier en lieu sûr.", duration: 4000 });
  };
  const importer = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!confirm("Restaurer cette sauvegarde ? Les données actuelles du site seront remplacées par celles du fichier.")) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        DB.importData(String(reader.result));
        logAudit("Sauvegarde restaurée", file.name);
        fireToast({ title: "Sauvegarde restaurée", msg: "Les données du site ont été remplacées par celles du fichier.", duration: 5000 });
      } catch (err) {
        fireToast({ title: "Fichier invalide", msg: "Ce fichier n'est pas une sauvegarde Blue Caravelle valide.", duration: 5000 });
      }
    };
    reader.readAsText(file);
  };
  return (
    <div className="a-card tool-card">
      <div className="tool-head">
        <div><h3 className="h3">Sauvegarde & restauration</h3>
          <p className="muted">Téléchargez l'ensemble des données du site (contenus, réservations, paramètres) dans un fichier, ou restaurez un fichier précédent.</p></div>
        <span className="badge badge-ocean">{last ? "Dernière : " + BC.dateShort(new Date(last).toISOString()) : "Jamais effectuée"}</span>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="a-btn primary" onClick={exporter}><Icon name="upload" size={15} style={{ transform: "rotate(180deg)" }} /> Télécharger la sauvegarde</button>
        <button className="a-btn" onClick={() => fileRef.current && fileRef.current.click()}><Icon name="upload" size={15} /> Restaurer un fichier…</button>
        <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={importer} />
      </div>
    </div>
  );
}

const TRASH_LABELS = {
  rooms: ["Chambre", x => x.nom],
  experiences: ["Expérience", x => x.titre],
  dishes: ["Plat", x => x.nom],
  gallery: ["Photo de galerie", x => x.legende || "Sans légende"],
  reviews: ["Avis client", x => piiName(x.nom_client)],
  reservations: ["Réservation", x => piiName(x.nom_complet)],
  messages: ["Message", x => piiName(x.nom)],
  accounts: ["Compte admin", x => x.nom || x.user],
  clients: ["Fiche client", x => piiName(x.nom)]
};

function TrashCard() {
  useDB();
  const list = DB.all("trash").slice().sort((a, b) => b.ts - a.ts);
  const restore = (t) => {
    DB.restoreTrash(t.id);
    const lab = TRASH_LABELS[t.coll] || [t.coll, () => ""];
    logAudit("Restauration depuis la corbeille", lab[0] + " — " + lab[1](t.data));
    fireToast({ title: "Élément restauré", msg: lab[0] + " remis en place.", duration: 4000 });
  };
  return (
    <div className="a-card tool-card">
      <div className="tool-head">
        <div><h3 className="h3">Corbeille</h3>
          <p className="muted">Tout contenu supprimé est conservé ici ({list.length} élément(s)) — restaurez-le en un clic.</p></div>
        {list.length > 0 && <button className="a-btn danger" onClick={() => { if (confirm("Vider définitivement la corbeille ?")) { DB.emptyTrash(); logAudit("Corbeille vidée", ""); } }}><Icon name="trash" size={15} /> Vider</button>}
      </div>
      {list.length === 0 && <div className="empty-note" style={{ border: 0, padding: "6px 0 0" }}>La corbeille est vide.</div>}
      {list.slice(0, 30).map(t => {
        const lab = TRASH_LABELS[t.coll] || [t.coll, () => "—"];
        return (
          <div className="health-row" key={t.id} style={{ paddingLeft: 0 }}>
            <span className="health-dot info"></span>
            <div className="health-txt">
              <strong>{lab[0]} — {lab[1](t.data) || "Sans titre"}</strong>
              <span>Supprimé le {BC.date(t.ts)}</span>
            </div>
            <button className="a-btn" onClick={() => restore(t)}>Restaurer</button>
          </div>
        );
      })}
    </div>
  );
}

function AdminTools() {
  return (
    <div>
      <div className="admin-h">
        <div><h1>Outils du site</h1><div className="sub">Maintenance, annonces, sauvegarde des données et corbeille.</div></div>
      </div>
      <div className="tools-grid">
        <MaintenanceCard />
        <AnnonceCard />
        <BackupCard />
        <TrashCard />
      </div>
    </div>
  );
}

/* ---------- Composants publics ---------- */
/* Page affichée aux visiteurs quand le mode maintenance est actif. */
function MaintenancePage() {
  const info = siteInfo();
  return (
    <div className="maint-page">
      <img src={(window.__resources || {}).logoCream || "https://res.cloudinary.com/drg6w7z0e/image/upload/v1781352895/logo-cream_shc5w5.png"} alt="Blue Caravelle" />
      <h1 className="display">De retour très vite</h1>
      <p>{(info.maintenance_msg || "").trim() || "Notre site est en cours de mise à jour. Nous restons joignables par téléphone et WhatsApp pour toute réservation."}</p>
      <div className="maint-contact">
        <span>{BC.PHONE}</span><span>·</span><span>{BC.EMAIL}</span>
      </div>
      <a href="#/admin" className="maint-admin">Administration</a>
    </div>
  );
}

/* Bandeau d'annonce du site public (période optionnelle, refermable). */
function AnnonceBar() {
  useDB();
  const info = siteInfo();
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem("bc_annonce_vue") === (info.annonce_txt || ""); } catch (e) { return false; }
  });
  if (!info.annonce_active || !(info.annonce_txt || "").trim() || hidden) return null;
  const today = todayISO();
  if (info.annonce_debut && today < info.annonce_debut) return null;
  if (info.annonce_fin && today > info.annonce_fin) return null;
  const close = () => {
    setHidden(true);
    try { sessionStorage.setItem("bc_annonce_vue", info.annonce_txt || ""); } catch (e) {}
  };
  const body = (
    <React.Fragment>
      <span className="ab-dot"></span>
      <span className="ab-txt">{info.annonce_txt}</span>
    </React.Fragment>
  );
  return (
    <div className="annonce-bar" role="status">
      {info.annonce_lien ? <a href={info.annonce_lien}>{body}</a> : <div>{body}</div>}
      <button onClick={close} aria-label="Fermer l'annonce"><Icon name="close" size={14} /></button>
    </div>
  );
}

Object.assign(window, { siteInfo, AdminHealth, AdminTools, MaintenancePage, AnnonceBar });
