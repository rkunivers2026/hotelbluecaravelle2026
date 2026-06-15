/* =========================================================
   BLUE CARAVELLE — Back-office administrateur (/admin)
   ========================================================= */

function statusClass(s) {
  return "tag s-" + ({ "Nouvelle": "nouvelle", "Traitée": "traitee", "Confirmée": "confirmee", "Terminée": "terminee", "Annulée": "annulee" }[s] || "nouvelle");
}
const STATUTS = ["Nouvelle", "Traitée", "Confirmée", "Terminée", "Annulée"];

/* Changement de statut centralisé — garantit la cohérence entre le statut
   d'une réservation et son occupation physique (enregistrement / départ) :
   • « Terminée » sur un séjour en cours libère la chambre (départ implicite) ;
   • réouvrir un séjour (retour à Confirmée/Traitée/Nouvelle) annule la sortie ;
   • le formulaire d'avis part à la clôture (Terminée ou Annulée). */
function setReservationStatut(r, s) {
  if (r.statut === s) return;
  const patch = { statut: s };
  if (s === "Terminée" && r.checkin_at && !r.checkout_at) patch.checkout_at = Date.now();
  if ((s === "Confirmée" || s === "Traitée" || s === "Nouvelle") && r.checkout_at) patch.checkout_at = null;
  if ((s === "Terminée" || s === "Annulée") && !r.avis_demande) { patch.avis_demande = true; patch.avis_demande_at = Date.now(); }
  DB.update("reservations", r.id, patch);
  logAudit("Statut → " + s, r.nom_complet);
}

/* ---------- Chargement & compression d'images ---------- */
// Redimensionne et compresse une image locale en data URL (stockable hors-ligne).
function fileToDataURL(file, maxW, quality) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error("Fichier non image")); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, (maxW || 1400) / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        try { resolve(c.toDataURL("image/jpeg", quality || 0.82)); }
        catch (e) { reject(e); }
      };
      img.onerror = () => reject(new Error("Image illisible"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Lecture impossible"));
    reader.readAsDataURL(file);
  });
}

function UrlAdd({ onAdd, placeholder }) {
  const [u, setU] = useState("");
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <input className="mini-in" value={u} onChange={e => setU(e.target.value)} placeholder={placeholder || "https://…"} />
      <button type="button" className="a-btn sm" onClick={() => { if (u.trim()) { onAdd(u.trim()); setU(""); } }}>Ajouter</button>
    </div>
  );
}

/* Image unique (plats, expériences, galerie, visuels du site) */
function ImageInput({ value, onChange, ratio }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file) => {
    if (!file) return;
    setBusy(true);
    try { onChange(await fileToDataURL(file, 1500, 0.82)); }
    catch (e) { fireToast({ title: "Image invalide", msg: "Choisissez un fichier image (JPG, PNG, WebP…).", duration: 4000 }); }
    setBusy(false);
  };
  return (
    <div className="img-input">
      <div className="img-prev" style={{ aspectRatio: ratio || "4/3" }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}>
        {value ? <img src={value} alt="" /> : <span className="img-ph"><Icon name="image" size={22} /> Aucune image</span>}
        {busy && <span className="img-busy"><Icon name="upload" size={22} /></span>}
      </div>
      <div className="img-actions">
        <button type="button" className="a-btn sm" onClick={() => inputRef.current.click()}><Icon name="upload" size={14} /> {value ? "Remplacer" : "Charger une image"}</button>
        {value && <button type="button" className="a-btn sm danger" onClick={() => onChange("")}><Icon name="trash" size={14} /> Retirer</button>}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={e => { pick(e.target.files[0]); e.target.value = ""; }} />
      </div>
      <details className="img-url"><summary>ou coller une URL d'image</summary><UrlAdd onAdd={onChange} placeholder="https://… (puis Ajouter)" /></details>
    </div>
  );
}

/* Galerie d'images multiples (photos d'une chambre) */
function ImagesInput({ value, onChange }) {
  const list = Array.isArray(value) ? value : [];
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const addFiles = async (files) => {
    setBusy(true);
    const arr = list.slice();
    for (const f of files) { try { arr.push(await fileToDataURL(f, 1500, 0.82)); } catch (e) {} }
    onChange(arr); setBusy(false);
  };
  const remove = (i) => onChange(list.filter((_, j) => j !== i));
  const move = (i, dir) => { const a = list.slice(); const j = i + dir; if (j < 0 || j >= a.length) return; const t = a[i]; a[i] = a[j]; a[j] = t; onChange(a); };
  return (
    <div>
      <div className="img-grid">
        {list.map((src, i) => (
          <div className="img-cell" key={i}>
            <img src={src} alt="" />
            {i === 0 && <span className="img-cover">Couverture</span>}
            <div className="img-cell-bar">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Déplacer à gauche">←</button>
              <button type="button" onClick={() => remove(i)} aria-label="Retirer"><Icon name="trash" size={13} /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Déplacer à droite">→</button>
            </div>
          </div>
        ))}
        <button type="button" className="img-add" onClick={() => inputRef.current.click()}>
          <Icon name="upload" size={20} /><span>{busy ? "Chargement…" : "Ajouter"}</span>
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={e => { addFiles(Array.from(e.target.files)); e.target.value = ""; }} />
      <details className="img-url" style={{ marginTop: 10 }}><summary>ou ajouter une image par URL</summary><UrlAdd onAdd={(u) => onChange(list.concat([u]))} /></details>
    </div>
  );
}

/* ---------- Anti-brute force (mode local) ---------- */
const BF_KEY = "bc_bf";
const BF_MAX = 5;
const BF_WINDOW = 15 * 60 * 1000; // 15 min
function bfGet() { try { return JSON.parse(sessionStorage.getItem(BF_KEY) || '{"n":0,"t":0}'); } catch(e) { return {n:0,t:0}; } }
function bfFail() { const d = bfGet(); if (Date.now() - d.t > BF_WINDOW) d.n = 0; d.n++; d.t = Date.now(); sessionStorage.setItem(BF_KEY, JSON.stringify(d)); }
function bfOk()   { sessionStorage.removeItem(BF_KEY); }
function bfMsg()  { const d = bfGet(); if (d.n < BF_MAX) return null; const r = Math.ceil((BF_WINDOW - (Date.now() - d.t)) / 60000); return r > 0 ? "Trop de tentatives. Réessayez dans " + r + " min." : null; }

/* ---------- Première mise en ligne — création du super admin ---------- */
function SetupSuperAdmin({ onDone }) {
  const [id, setId] = useState("rk.univers");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [err, setErr] = useState("");
  const [show, setShow] = useState(false);
  const strength = () => {
    let s = 0;
    if (p1.length >= 8) s++;
    if (/[A-Z]/.test(p1)) s++;
    if (/[0-9]/.test(p1)) s++;
    if (/[^a-zA-Z0-9]/.test(p1)) s++;
    return s;
  };
  const str = strength();
  const strColors = ["", "#e63946", "#f4a261", "#2a9d8f", "#1d6a54"];
  const strLabels = ["", "Faible", "Correct", "Fort", "Très fort"];
  const submit = (e) => {
    e.preventDefault();
    if (!id.trim() || id.trim().length < 3) return setErr("Identifiant invalide (3 caractères minimum).");
    if (p1.length < 8) return setErr("Mot de passe : 8 caractères minimum.");
    if (!/[A-Z]/.test(p1)) return setErr("Au moins une lettre majuscule est requise.");
    if (!/[0-9]/.test(p1)) return setErr("Au moins un chiffre est requis.");
    if (!/[^a-zA-Z0-9]/.test(p1)) return setErr("Au moins un caractère spécial est requis (ex. !, @, #, _).");
    if (p1 !== p2) return setErr("Les deux mots de passe ne correspondent pas.");
    // setupSuperAdmin renvoie un booléen (mode local) ou une promesse (mode API).
    Promise.resolve(DB.setupSuperAdmin(id.trim(), p1)).then((ok) => {
      if (!ok) return setErr("Un super administrateur existe déjà. Actualisez la page.");
      fireToast({ title: "Accès super admin créé", msg: "Connectez-vous maintenant avec vos identifiants.", duration: 5000 });
      onDone();
    });
  };
  return (
    <div className="login-wrap">
      <div style={{ position: "absolute", inset: 0, opacity: .12, zIndex: 1 }}>
        <Photo src={DB.IMG.heroBeach} alt="" eager style={{ position: "absolute", inset: 0 }} />
      </div>
      <form className="login-card" onSubmit={submit} autoComplete="off">
        <img src={(window.__resources||{}).logoColor||"https://res.cloudinary.com/drg6w7z0e/image/upload/v1781352895/logo-cream_shc5w5.png"} alt="Blue Caravelle" />
        <span className="eyebrow center" style={{ display: "flex", justifyContent: "center", fontSize: ".62rem", marginBottom: 12 }}>Configuration initiale</span>
        <h2 style={{ textAlign: "center", marginBottom: 6, fontSize: "1.6rem" }}>Créer le super administrateur</h2>
        <p className="muted" style={{ textAlign: "center", fontSize: ".88rem", marginBottom: 24 }}>
          Définissez l'identifiant et le mot de passe du compte RK Univers.<br />
          <strong>Cette opération n'est possible qu'une seule fois.</strong>
        </p>
        <div className="field">
          <label>Identifiant</label>
          <input value={id} onChange={e => { setId(e.target.value); setErr(""); }} placeholder="rk.univers" autoFocus autoComplete="off" />
        </div>
        <div className={"field" + (err ? " err" : "")}>
          <label>Mot de passe</label>
          <div style={{ position: "relative" }}>
            <input type={show ? "text" : "password"} value={p1}
              onChange={e => { setP1(e.target.value); setErr(""); }}
              placeholder="8 car. min., majuscule, chiffre, caractère spécial"
              style={{ paddingRight: 44 }} autoComplete="new-password" />
            <button type="button" className="reveal-in" onClick={() => setShow(s => !s)} aria-label="Afficher">
              <Icon name={show ? "eyeoff" : "eye"} size={17} />
            </button>
          </div>
          {p1 && (
            <div style={{ marginTop: 7, display: "flex", gap: 4, alignItems: "center" }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2,
                  background: i <= str ? strColors[str] : "#e0e0e0",
                  transition: "background .25s" }}></div>
              ))}
              <span style={{ fontSize: ".72rem", color: strColors[str], fontWeight: 600, minWidth: 58, textAlign: "right" }}>
                {strLabels[str]}
              </span>
            </div>
          )}
        </div>
        <div className={"field" + (err ? " err" : "")}>
          <label>Confirmer le mot de passe</label>
          <input type={show ? "text" : "password"} value={p2}
            onChange={e => { setP2(e.target.value); setErr(""); }}
            placeholder="••••••••" autoComplete="new-password" />
          {err && <span className="hint">{err}</span>}
        </div>
        <button type="submit" className="btn btn-dark btn-block" style={{ marginTop: 6 }}>
          Créer l'accès super admin
        </button>
        <p className="muted" style={{ textAlign: "center", fontSize: ".76rem", marginTop: 16, lineHeight: 1.5 }}>
          Ce formulaire disparaît définitivement après validation.<br />Conservez vos identifiants en lieu sûr.
        </p>
      </form>
    </div>
  );
}

/* ---------- Connexion ---------- */
function AdminLogin({ onOk }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const locked = bfMsg();
    if (locked) { setErr(locked); return; }
    setErr(""); setBusy(true);
    const role = await DB.login(u.trim(), p);
    setBusy(false);
    if (role) { bfOk(); onOk(); }
    else { bfFail(); setErr(bfMsg() || "Identifiants incorrects. Réessayez."); }
  };
  return (
    <div className="login-wrap">
      <div style={{ position: "absolute", inset: 0, opacity: .12, zIndex: 1 }}>
        <Photo src={DB.IMG.heroBeach} alt="" eager style={{ position: "absolute", inset: 0 }} />
      </div>
      <form className="login-card" onSubmit={submit}>
        <img src={(window.__resources||{}).logoColor||"https://res.cloudinary.com/drg6w7z0e/image/upload/v1781352895/logo-cream_shc5w5.png"} alt="Blue Caravelle" />
        <span className="eyebrow center" style={{ display: "flex", justifyContent: "center", fontSize: ".62rem", marginBottom: 12 }}>Back-office</span>
        <h2 style={{ textAlign: "center", marginBottom: 6, fontSize: "1.75rem" }}>Espace administrateur</h2>
        <p className="muted" style={{ textAlign: "center", fontSize: ".9rem", marginBottom: 24 }}>Connectez-vous pour gérer l'hôtel.</p>
        <div className={"field" + (err ? " err" : "")}>
          <label>Identifiant</label>
          <input value={u} onChange={e => { setU(e.target.value); setErr(""); }} placeholder="admin" autoFocus />
        </div>
        <div className={"field" + (err ? " err" : "")}>
          <label>Mot de passe</label>
          <input type="password" value={p} onChange={e => { setP(e.target.value); setErr(""); }} placeholder="••••••••" />
          {err && <span className="hint">{err}</span>}
        </div>
        <button type="submit" className="btn btn-dark btn-block" style={{ marginTop: 6 }} disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
        <div style={{ textAlign: "center", marginTop: 16 }}><a href="#/" style={{ fontSize: ".86rem" }}>← Retour au site</a></div>
      </form>
    </div>
  );
}

/* ---------- Envoi automatique du formulaire d'avis ----------
   Quand un séjour est terminé (réservation confirmée dont la date de départ
   est passée) ou annulé, le formulaire d'avis est envoyé automatiquement au client. */
function processAutoAvis() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let sent = 0;
  DB.all("reservations").forEach(r => {
    let patch = null;
    if (r.statut === "Confirmée" && r.date_depart && new Date(r.date_depart) < today && !(r.checkin_at && !r.checkout_at)) {
      patch = { statut: "Terminée" };
    }
    const willBe = (patch && patch.statut) || r.statut;
    if ((willBe === "Terminée" || willBe === "Annulée") && !r.avis_demande) {
      patch = Object.assign({}, patch, { avis_demande: true, avis_demande_at: Date.now() });
      console.info("[Formulaire d'avis envoyé automatiquement] " + r.nom_complet + " — séjour " + willBe.toLowerCase());
      sent++;
    }
    if (patch) DB.update("reservations", r.id, patch);
  });
  if (sent) fireToast({ title: "Demandes d'avis envoyées", msg: sent + " formulaire(s) d'avis transmis automatiquement aux clients (séjour terminé ou annulé).", duration: 6000 });
}

/* ---------- Back-office indisponible (aucun serveur sécurisé détecté) ----------
   SÉCURITÉ : sur un hébergement purement statique (ex. Cloudflare Pages sans
   backend), l'état « super admin créé » ne vivrait que dans le localStorage du
   visiteur — donc chaque navigateur / appareil pourrait recréer le super admin.
   On bloque donc tout accès admin tant que le backend sécurisé n'est pas joignable,
   SAUF en local (localhost / fichier) pour le développement et la démo hors-ligne. */
function AdminUnavailable() {
  return (
    <div className="login-wrap">
      <div style={{ position: "absolute", inset: 0, opacity: .12, zIndex: 1 }}>
        <Photo src={DB.IMG.heroBeach} alt="" eager style={{ position: "absolute", inset: 0 }} />
      </div>
      <div className="login-card" style={{ textAlign: "center" }}>
        <img src={(window.__resources||{}).logoColor||"https://res.cloudinary.com/drg6w7z0e/image/upload/v1781352895/logo-cream_shc5w5.png"} alt="Blue Caravelle" style={{ margin: "0 auto" }} />
        <div style={{ width: 46, height: 46, margin: "18px auto 14px", borderRadius: "50%", background: "rgba(176,0,32,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="lock" size={22} />
        </div>
        <h2 style={{ marginBottom: 8, fontSize: "1.45rem" }}>Back-office sécurisé requis</h2>
        <p className="muted" style={{ fontSize: ".92rem", lineHeight: 1.65, marginBottom: 18 }}>
          L'espace d'administration nécessite le serveur sécurisé Bleu Caravelle.
          Aucun serveur n'a été détecté sur ce domaine : la connexion et la création
          du super administrateur sont <strong>désactivées</strong> pour des raisons de sécurité.
        </p>
        <p className="muted" style={{ fontSize: ".82rem", lineHeight: 1.6, background: "rgba(0,0,0,.03)", borderRadius: 12, padding: "14px 16px", textAlign: "left" }}>
          <strong>Pour l'activer :</strong> déployez le backend Node.js (dossier <code>server/</code>),
          puis pointez le site vers son URL via
          <code style={{ display: "block", marginTop: 6 }}>window.BLEU_API = "https://api.votre-domaine.ci";</code>
        </p>
        <a href="#/" className="btn btn-dark btn-block" style={{ marginTop: 20 }}>Retour au site</a>
      </div>
    </div>
  );
}

/* ---------- Coque admin ---------- */
function AdminApp() {
  useDB();
  const [user, setUser] = useState(DB.currentUser());
  const [view, setView] = useState("dashboard");
  const [superSetup, setSuperSetup] = useState(() => DB.hasSuperAdminSetup ? DB.hasSuperAdminSetup() : true);
  useEffect(() => { if (user) { processAutoAvis(); logAudit("Connexion", "Accès au back-office"); } }, [user]);
  // Expiration de session : vérification périodique → déconnexion automatique.
  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => {
      if (!DB.isAuthed()) { setUser(null); fireToast({ title: "Session expirée", msg: "Vous avez été déconnecté après une période d'inactivité. Reconnectez-vous.", duration: 6000 }); }
    }, 60 * 1000);
    return () => clearInterval(t);
  }, [user]);
  // SÉCURITÉ — sur un hébergement statique public (aucun backend), l'authentification
  // ne peut PAS être garantie : on verrouille le back-office. Autorisé uniquement en
  // local (localhost / 127.0.0.1 / fichier) pour le développement et la démo hors-ligne.
  var host = location.hostname;
  var isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1" || host === "[::1]" || host === "" || location.protocol === "file:";
  if (DB.mode() === "local" && !isLocalHost) return <AdminUnavailable />;
  if (!superSetup) return <SetupSuperAdmin onDone={() => setSuperSetup(true)} />;
  if (!user) return <AdminLogin onOk={() => setUser(DB.currentUser())} />;
  const isSuper = user.role === "superadmin";
  const av = allowedViews(user);
  const can = (k) => av.indexOf(k) !== -1;

  const resNouv = DB.all("reservations").filter(r => !r.lu).length;
  const msgNouv = DB.all("messages").filter(m => !m.lu).length;
  const avisNouv = DB.all("reviews").filter(r => !r.lu).length;
  // L'accès aux sections dépend du rôle métier ; le super administrateur a tout.
  const GROUPS = [
    { label: "Opérations", items: [
      { k: "dashboard",    l: "Tableau de bord",    ic: "grid" },
      { k: "reservations", l: "Réservations",        ic: "calendar", nb: resNouv },
      { k: "booking",      l: "Enregistrement",      ic: "key" },
      { k: "planning",     l: "Calendrier",          ic: "calendar" },
      { k: "housekeeping", l: "Housekeeping",        ic: "sparkle" },
      { k: "restaurant",   l: "Service restaurant",  ic: "utensils" },
    ]},
    { label: "Gestion", items: [
      { k: "clients", l: "Clients",        ic: "users" },
      { k: "dispo",   l: "Disponibilités", ic: "bed" },
      { k: "revenus", l: "Revenus",        ic: "grid" },
    ]},
    { label: "Site & config", items: [
      { k: "sante",      l: "Santé du site",       ic: "check" },
      { k: "contenus",   l: "Contenus du site",    ic: "edit",     nb: avisNouv },
      { k: "messages",   l: "Messages",            ic: "inbox",    nb: msgNouv },
      { k: "activite",   l: "Journal d'activité",  ic: "shield" },
      { k: "parametres", l: "Paramètres du site",  ic: "settings" },
      { k: "outils",     l: "Outils & sauvegarde", ic: "upload" },
      { k: "comptes",    l: "Comptes admin",        ic: "shield" },
    ]},
  ];
  const NAVI = GROUPS.flatMap(g => g.items).filter(n => can(n.k));
  const allowed = NAVI.map(n => n.k);
  // Vue par défaut : la première vue autorisée (le super admin n'a pas de tableau de bord).
  const safeView = allowed.includes(view) ? view : (allowed[0] || "dashboard");

  return (
    <div className="admin">
      <aside className="admin-side">
        <img className="a-logo" src={(window.__resources||{}).logoCream||"https://res.cloudinary.com/drg6w7z0e/image/upload/v1781352895/logo-cream_shc5w5.png"} alt="Blue Caravelle" />
        <div className="a-ident">
          <span className={"a-role" + (isSuper ? " super" : "")}>
            <Icon name={isSuper ? "shield" : "lock"} size={13} />{isSuper ? "Super admin" : roleLabel(user.metier)}
          </span>
          <span className="a-uname">{user.nom || user.user}</span>
        </div>
        {GROUPS.map(g => {
          const visibleItems = g.items.filter(n => can(n.k));
          if (!visibleItems.length) return null;
          return (
            <div key={g.label} className="a-group">
              <span className="a-group-label">{g.label}</span>
              {visibleItems.map(n => (
                <button key={n.k} className={"admin-nav" + (safeView === n.k ? " active" : "")} onClick={() => setView(n.k)}>
                  <Icon name={n.ic} size={17} /><span className="lbl">{n.l}</span>
                  {n.nb ? <span className="nb">{n.nb}</span> : null}
                </button>
              ))}
            </div>
          );
        })}
        <div className="a-foot">
          <a className="admin-nav" href="#/" style={{ textDecoration: "none" }}><Icon name="arrowL" size={19} /><span className="lbl">Voir le site</span></a>
          <button className="admin-nav" onClick={() => { DB.logout(); setUser(null); }}><Icon name="logout" size={19} /><span className="lbl">Déconnexion</span></button>
        </div>
      </aside>
      <div className="admin-main">
        {isSuper && <PiiNote />}
        {safeView === "dashboard" && <AdminDashboard go={setView} />}
        {safeView === "reservations" && <AdminReservations />}
        {safeView === "clients" && <AdminClients />}
        {safeView === "booking" && <AdminBooking />}
        {safeView === "planning" && <AdminPlanning />}
        {safeView === "dispo" && <AdminDispo />}
        {safeView === "housekeeping" && <AdminHousekeeping />}
        {safeView === "revenus" && can("revenus") && <AdminRevenue />}
        {safeView === "sante" && can("sante") && <AdminHealth go={setView} />}
        {safeView === "outils" && can("outils") && <AdminTools />}
        {safeView === "contenus" && isSuper && <AdminContent />}
        {safeView === "restaurant" && can("restaurant") && <AdminRestaurant />}
        {safeView === "parametres" && can("parametres") && <AdminSettings />}
        {safeView === "messages" && <AdminMessages />}
        {safeView === "activite" && can("activite") && <AdminActivity />}
        {safeView === "comptes" && can("comptes") && <AdminAccounts />}
      </div>
    </div>
  );
}

/* ---------- Comptes administrateurs (super admin uniquement) ---------- */
function AdminAccounts() {
  const [edit, setEdit] = useState(null);
  const me = DB.currentUser();
  const accounts = DB.all("accounts").slice().sort((a, b) => (a.date_creation || 0) - (b.date_creation || 0));
  return (
    <div>
      <div className="admin-h">
        <div><h1>Comptes administrateurs</h1><div className="sub">Créez et gérez les accès au back-office. Vous seul, en tant que super administrateur, pouvez modifier cette page.</div></div>
        <button className="a-btn primary" onClick={() => setEdit({ item: null })}><Icon name="userPlus" size={16} /> Nouvel administrateur</button>
      </div>

      <div className="a-card sa-card">
        <span className="sa-ic"><Icon name="shield" size={22} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ color: "var(--marine)" }}>Super administrateur</strong>
          <div style={{ color: "#8a96a2", fontSize: ".86rem", marginTop: 2 }}>Identifiant <code>{me.user}</code> · accès complet · compte protégé, non modifiable</div>
        </div>
        <span className="badge badge-gold">Vous</span>
      </div>

      <div className="a-card" style={{ overflow: "auto", marginTop: 16 }}>
        <table className="a-table">
          <thead><tr><th>Administrateur</th><th>Identifiant</th><th>Mot de passe</th><th>Accès</th><th></th></tr></thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.id} className={a.actif === false ? "row-off" : ""}>
                <td>
                  <strong style={{ color: "var(--marine)" }}>{a.nom || "—"}</strong>
                  <span className="badge badge-ocean" style={{ marginLeft: 8, fontSize: ".62rem" }}>{roleLabel(a.role)}</span>
                  {a.date_creation ? <div style={{ color: "#8a96a2", fontSize: ".82rem" }}>Créé le {BC.dateShort(new Date(a.date_creation).toISOString())}</div> : null}
                </td>
                <td><code>{a.user}</code></td>
                <td>
                  <span className="mono" style={{ letterSpacing: "2px", color: "#8a96a2" }}>••••••••</span>
                  <span title="Le mot de passe ne peut pas être affiché. Utilisez « Modifier » pour le réinitialiser." style={{ marginLeft: 8, color: "#b6bfc8", verticalAlign: "middle" }}><Icon name="lock" size={14} /></span>
                </td>
                <td>
                  <span className="switch"><input type="checkbox" checked={a.actif !== false} onChange={e => DB.update("accounts", a.id, { actif: e.target.checked })} /><span className="sl"></span></span>
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button className="icon-btn" onClick={() => setEdit({ item: a })} style={{ marginRight: 8 }} aria-label="Modifier"><Icon name="edit" size={16} /></button>
                  <button className="icon-btn danger" onClick={() => { if (confirm("Supprimer définitivement l'accès de « " + (a.nom || a.user) + " » ?")) DB.remove("accounts", a.id); }} aria-label="Supprimer"><Icon name="trash" size={16} /></button>
                </td>
              </tr>
            ))}
            {!accounts.length && <tr><td colSpan="5"><div className="empty-note" style={{ border: 0 }}>Aucun administrateur pour l'instant. Cliquez sur « Nouvel administrateur ».</div></td></tr>}
          </tbody>
        </table>
      </div>
      {edit && <AccountEditor item={edit.item} onClose={() => setEdit(null)} />}
    </div>
  );
}

function AccountEditor({ item, onClose }) {
  const [f, setF] = useState(() => item
    ? { nom: item.nom || "", user: item.user || "", pass: "", actif: item.actif !== false, role: item.role || "reception" }
    : { nom: "", user: "", pass: "", actif: true, role: "reception" });
  const [err, setErr] = useState("");
  const [show, setShow] = useState(false);
  const set = (k, v) => { setF(s => ({ ...s, [k]: v })); setErr(""); };
  const save = () => {
    const nom = (f.nom || "").trim();
    const user = (f.user || "").trim();
    const pass = f.pass || "";
    if (!nom) return setErr("Indiquez le nom de l'administrateur.");
    if (!user) return setErr("Indiquez un identifiant de connexion.");
    if (/\s/.test(user)) return setErr("L'identifiant ne doit pas contenir d'espace.");
    if (user.toLowerCase() === "rk.univers") return setErr("Cet identifiant est réservé au super administrateur.");
    // Politique de mot de passe : exigé à la création, optionnel à la modification
    // (champ laissé vide = mot de passe inchangé).
    const passProvided = pass.length > 0;
    if (!item && !passProvided) return setErr("Définissez un mot de passe.");
    if (passProvided) {
      if (pass.length < 8) return setErr("Le mot de passe doit contenir au moins 8 caractères.");
      if (!/[a-z]/.test(pass) || !/[A-Z]/.test(pass) || !/\d/.test(pass))
        return setErr("Le mot de passe doit comporter au moins une minuscule, une majuscule et un chiffre.");
    }
    const clash = DB.all("accounts").find(a => a.user.toLowerCase() === user.toLowerCase() && (!item || a.id !== item.id));
    if (clash) return setErr("Cet identifiant est déjà utilisé par un autre compte.");
    const out = { nom, user, actif: f.actif !== false, role: f.role || "reception" };
    if (passProvided) out.pass = pass;
    if (item) DB.update("accounts", item.id, out);
    else DB.insert("accounts", Object.assign({ date_creation: Date.now() }, out));
    logAudit(item ? "Compte modifié" : "Compte créé", nom + " (" + roleLabel(out.role) + ")");
    fireToast({ title: item ? "Accès mis à jour" : "Administrateur créé", msg: nom + " peut se connecter avec l'identifiant « " + user + " ».", duration: 4000 });
    onClose();
  };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="m-head"><h3>{item ? "Modifier l'accès" : "Nouvel administrateur"}</h3><button className="icon-btn" onClick={onClose}><Icon name="close" size={16} /></button></div>
        <div className="m-body">
          <div className="field"><label>Nom de l'administrateur</label><input value={f.nom} onChange={e => set("nom", e.target.value)} placeholder="Ex. Awa Koné" autoFocus /></div>
          <div className="field"><label>Identifiant de connexion</label><input value={f.user} onChange={e => set("user", e.target.value)} placeholder="ex. awa.kone" autoCapitalize="none" spellCheck="false" /></div>
          <div className="field"><label>Rôle métier</label><select value={f.role} onChange={e => set("role", e.target.value)}>{Object.keys(ROLE_DEFS).map(k => <option key={k} value={k}>{ROLE_DEFS[k].l}</option>)}</select></div>
          <div className="field">
            <label>Mot de passe</label>
            <div style={{ position: "relative" }}>
              <input type={show ? "text" : "password"} value={f.pass} onChange={e => set("pass", e.target.value)} placeholder={item ? "Laisser vide pour conserver l'actuel" : "8 caractères min., avec majuscule, minuscule et chiffre"} style={{ paddingRight: 44 }} />
              <button type="button" className="reveal-in" onClick={() => setShow(s => !s)} aria-label="Afficher le mot de passe"><Icon name={show ? "eyeoff" : "eye"} size={17} /></button>
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: ".9rem", color: "#6a7682" }}>
            <span className="switch"><input type="checkbox" checked={f.actif !== false} onChange={e => set("actif", e.target.checked)} /><span className="sl"></span></span>
            Accès actif — l'administrateur peut se connecter
          </label>
          {err && <div className="form-err"><Icon name="lock" size={14} /> {err}</div>}
        </div>
        <div className="m-foot">
          <button className="a-btn" onClick={onClose}>Annuler</button>
          <button className="a-btn primary" onClick={save}><Icon name="check" size={15} /> {item ? "Enregistrer" : "Créer l'accès"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Tableau de bord ---------- */
function AdminDashboard({ go }) {
  const res = DB.all("reservations");
  const rooms = DB.all("rooms");
  const now = new Date();
  const today = todayISO();

  /* ── Occupation ── */
  const occupied = res.filter(r => r.checkin_at && !r.checkout_at && r.statut !== "Annulée" && r.statut !== "Terminée").length;
  const totalRooms = rooms.length || 1;
  const occPct = Math.round((occupied / totalRooms) * 100);

  /* ── Mouvement du jour ── */
  const arrivees = res.filter(r => r.date_arrivee === today && !r.checkin_at && r.statut !== "Annulée" && r.statut !== "Terminée");
  const departs  = res.filter(r => r.date_depart === today && r.checkin_at && !r.checkout_at);

  /* ── Revenus du mois (somme des paiements) ── */
  const revMois = res.reduce((s, r) => {
    return s + (r.paiements || []).reduce((ps, p) => {
      const d = p.dat ? new Date(p.dat) : null;
      return ps + (d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() ? (p.montant || 0) : 0);
    }, 0);
  }, 0);

  const kpisOpe = [
    { content: (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
            <span style={{ fontWeight: 600, color: "#334" }}>Taux d'occupation</span>
            <span className="k-ic" style={{ background: "#E3F6EA", color: "#1E8A4E" }}><Icon name="bed" size={19} /></span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="k-n" style={{ fontSize: "2.2rem" }}>{occPct}%</span>
            <span style={{ color: "#8a96a2", fontSize: ".86rem" }}>{occupied} / {totalRooms} chambres</span>
          </div>
          <div className="occ-bar"><div className="occ-fill" style={{ width: occPct + "%" }}></div></div>
        </div>
      )},
    { n: arrivees.length, l: "Arrivées aujourd'hui",  ic: "arrow",   bg: "#E7F4FB", c: "#0F76A8", action: () => go("booking") },
    { n: departs.length,  l: "Départs aujourd'hui",   ic: "logout",  bg: "#FFF3DC", c: "#B07A14", action: () => go("booking") },
    { n: res.filter(r => r.statut === "Nouvelle").length, l: "Nouvelles demandes", ic: "sparkle", bg: "#FCE9EC", c: "#C24B63", action: () => go("reservations") },
  ].concat(finMasked() ? [] : [
    { n: BC.xof(revMois), l: "Revenus ce mois", ic: "grid", bg: "#EDE7FB", c: "#6244B0", wide: true },
  ]);

  const recent = res.slice().sort((a, b) => b.date_creation - a.date_creation).slice(0, 5);
  return (
    <div>
      <div className="admin-h"><div><h1>Tableau de bord</h1><div className="sub">Activité en temps réel — {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div></div></div>
      <div className="kpi-grid kpi-grid-dash">
        {kpisOpe.map((k, i) => (
          <div className={"a-card kpi" + (k.wide ? " kpi-wide" : "")} key={i}
            style={{ cursor: k.action ? "pointer" : "default" }}
            onClick={k.action || undefined}>
            {k.content ? k.content : (
              <div>
                <div className="k-top">
                  <span className="k-l" style={{ marginTop: 0, fontWeight: 600 }}>{k.l}</span>
                  <span className="k-ic" style={{ background: k.bg, color: k.c }}><Icon name={k.ic} size={19} /></span>
                </div>
                <div className="k-n">{k.n}</div>
              </div>
            )}
          </div>
        ))}
      </div>
      {allowedViews(DB.currentUser()).indexOf("revenus") !== -1 && <DashboardFinance go={go} />}
      <div className="a-card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #EDF1F5" }}>
          <strong style={{ color: "var(--marine)" }}>Dernières demandes</strong>
          <button className="a-btn sm" onClick={() => go("reservations")}>Tout voir <Icon name="arrow" size={14} /></button>
        </div>
        <table className="a-table">
          <thead><tr><th>Client</th><th>Chambre</th><th>Dates</th><th>Statut</th></tr></thead>
          <tbody>
            {recent.map(r => (
              <tr key={r.id} className={!r.lu ? "unread" : ""}>
                <td><strong>{piiName(r.nom_complet)}</strong><div style={{ color: "#8a96a2", fontSize: ".82rem" }}>{BC.date(r.date_creation)}</div></td>
                <td>{r.type_chambre || "—"}</td>
                <td>{BC.dateShort(r.date_arrivee)} → {BC.dateShort(r.date_depart)}</td>
                <td><span className={statusClass(r.statut)}>{r.statut}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Détails du séjour (consultation + modification) ----------
   Permet à l'administrateur de modifier la chambre réservée, les dates
   d'arrivée / départ et le nombre de personnes d'une réservation. */
function ResStayDetails({ res }) {
  const [editing, setEditing] = useState(false);
  const rooms = DB.all("rooms");
  const [f, setF] = useState({});
  const begin = () => {
    setF({
      type_chambre: res.type_chambre || "",
      date_arrivee: res.date_arrivee || "",
      date_depart: res.date_depart || "",
      nombre_personnes: res.nombre_personnes || 1,
      source: res.source || "Direct (site)"
    });
    setEditing(true);
  };
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const save = () => {
    if (!f.date_arrivee || !f.date_depart)
      return fireToast({ title: "Dates manquantes", msg: "Indiquez la date d'arrivée et la date de départ.", duration: 4000 });
    if (f.date_depart <= f.date_arrivee)
      return fireToast({ title: "Dates incohérentes", msg: "La date de départ doit être postérieure à la date d'arrivée.", duration: 4000 });
    DB.update("reservations", res.id, {
      type_chambre: f.type_chambre,
      date_arrivee: f.date_arrivee,
      date_depart: f.date_depart,
      nombre_personnes: Math.max(1, Number(f.nombre_personnes) || 1),
      source: f.source
    });
    fireToast({ title: "Réservation modifiée", msg: "Les dates et la chambre ont été mises à jour.", duration: 4000 });
    setEditing(false);
  };
  const Row = (l, v) => <div className="detail-row" key={l}><span className="dl">{l}</span><span className="dv">{v}</span></div>;

  return (
    <div>
      {Row("E-mail", piiEmail(res.email))}
      {Row("Téléphone / WhatsApp", piiPhone(res.telephone_whatsapp))}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "18px 0 6px" }}>
        <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--marine)", letterSpacing: ".02em" }}>Détails du séjour</span>
        {!editing && <button className="a-btn sm" onClick={begin}><Icon name="edit" size={14} /> Modifier</button>}
      </div>

      {!editing ? (
        <div>
          {Row("Chambre", res.type_chambre || "Sans préférence")}
          {Row("Arrivée", BC.dateShort(res.date_arrivee))}
          {Row("Départ", BC.dateShort(res.date_depart))}
          {Row("Personnes", res.nombre_personnes)}
          {Row("Canal", res.source || "—")}
          {res.checkin_at && Row("Arrivée enregistrée", BC.date(res.checkin_at))}
          {res.checkout_at && Row("Départ enregistré", BC.date(res.checkout_at))}
        </div>
      ) : (
        <div style={{ background: "var(--ocean-soft, #EAF3FA)", borderRadius: 12, padding: "16px 16px 6px" }}>
          <div className="field">
            <label>Chambre réservée</label>
            <select value={f.type_chambre} onChange={e => set("type_chambre", e.target.value)}>
              <option value="">Sans préférence</option>
              {rooms.map(r => <option key={r.id} value={r.nom}>{r.nom} ({r.type})</option>)}
            </select>
          </div>
          <div className="row-2">
            <div className="field"><label>Date d'arrivée</label><input type="date" value={f.date_arrivee} onChange={e => set("date_arrivee", e.target.value)} /></div>
            <div className="field"><label>Date de départ</label><input type="date" min={f.date_arrivee || undefined} value={f.date_depart} onChange={e => set("date_depart", e.target.value)} /></div>
          </div>
          <div className="field"><label>Nombre de personnes</label><input type="number" min="1" value={f.nombre_personnes} onChange={e => set("nombre_personnes", e.target.value)} /></div>
          <div className="field"><label>Canal de réservation</label><select value={f.source} onChange={e => set("source", e.target.value)}>{SOURCES.map(s => <option key={s}>{s}</option>)}</select></div>
          {res.checkin_at && !res.checkout_at &&
            <div className="form-err" style={{ background: "#FFF3DC", color: "#B07A14", marginBottom: 14 }}>
              <Icon name="lock" size={14} /> Ce client est déjà arrivé — pensez à vérifier l'attribution physique de la chambre dans « Booking & enregistrement ».
            </div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingBottom: 4 }}>
            <button className="a-btn sm" onClick={() => setEditing(false)}>Annuler</button>
            <button className="a-btn primary sm" onClick={save}><Icon name="check" size={14} /> Enregistrer les modifications</button>
          </div>
        </div>
      )}

      {Row("Message", res.message || "—")}
      {Row("Reçue le", BC.date(res.date_creation))}
    </div>
  );
}

/* ---------- Réservations ---------- */
function AdminReservations() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("Toutes");
  const [open, setOpen] = useState(null);
  let list = DB.all("reservations").slice().sort((a, b) => b.date_creation - a.date_creation);
  if (filter !== "Toutes") list = list.filter(r => r.statut === filter);
  if (q.trim()) {
    const needle = q.trim().toLowerCase();
    const digits = needle.replace(/\D/g, "");
    list = list.filter(r =>
      (r.nom_complet || "").toLowerCase().includes(needle) ||
      (r.email || "").toLowerCase().includes(needle) ||
      (digits && (r.telephone_whatsapp || "").replace(/\D/g, "").includes(digits))
    );
  }
  const openDetail = (r) => { if (!r.lu) DB.update("reservations", r.id, { lu: true }); if (piiMasked()) logAudit("Consultation réservation (données voilées)", r.nom_complet); setOpen(r.id); };
  const current = open ? DB.find("reservations", open) : null;
  const avisMsg = current ? ("Bonjour " + piiName(current.nom_complet) + ", merci d'avoir choisi l'Hôtel Blue Caravelle. Votre avis compte beaucoup pour nous — partagez votre expérience en quelques minutes ici : " + avisUrl(current)) : "";
  return (
    <div>
      <div className="admin-h"><div><h1>Réservations</h1><div className="sub">{DB.all("reservations").length} demande(s) au total</div></div></div>
      <div className="a-toolbar">
        <div className="a-search"><Icon name="search" size={17} style={{ color: "#8a96a2" }} /><input placeholder="Rechercher par nom, numéro ou e-mail…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <select className="a-select" value={filter} onChange={e => setFilter(e.target.value)}>
          {["Toutes", ...STATUTS].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="a-card" style={{ overflow: "auto" }}>
        <table className="a-table">
          <thead><tr><th>Client</th><th>Chambre</th><th>Dates</th><th>Pers.</th><th>Reçue le</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {list.map(r => (
              <tr key={r.id} className={(!r.lu ? "unread " : "") + "a-row-link"} onClick={() => openDetail(r)}>
                <td><strong>{piiName(r.nom_complet)}</strong><div style={{ color: "#8a96a2", fontSize: ".82rem" }}>{piiEmail(r.email)}</div></td>
                <td>{r.type_chambre || "—"}</td>
                <td style={{ whiteSpace: "nowrap" }}>{BC.dateShort(r.date_arrivee)}<br />→ {BC.dateShort(r.date_depart)}</td>
                <td>{r.nombre_personnes}</td>
                <td style={{ color: "#8a96a2", fontSize: ".84rem", whiteSpace: "nowrap" }}>{BC.date(r.date_creation)}</td>
                <td><span className={statusClass(r.statut)}>{r.statut}</span></td>
                <td><button className="icon-btn" onClick={(e) => { e.stopPropagation(); openDetail(r); }} aria-label="Voir"><Icon name="eye" size={16} /></button></td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan="7"><div className="empty-note" style={{ border: 0 }}>Aucune demande ne correspond.</div></td></tr>}
          </tbody>
        </table>
      </div>

      {current &&
        <div className="modal-bg" onClick={() => setOpen(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="m-head"><h3>{piiName(current.nom_complet)}</h3><button className="icon-btn" onClick={() => setOpen(null)}><Icon name="close" size={16} /></button></div>
            <div className="m-body">
              <div style={{ marginBottom: 16 }}><span className={statusClass(current.statut)}>{current.statut}</span></div>
              <ResClientStrip res={current} />
              <ResStayDetails res={current} />
              <div style={{ marginTop: 20 }}>
                <label style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--marine)", display: "block", marginBottom: 10 }}>Changer le statut</label>
                <div className="seg">
                  {STATUTS.map(s => <button key={s} className={current.statut === s ? "active" : ""} onClick={() => setReservationStatut(current, s)}>{s}</button>)}
                </div>
              </div>

              <ResVoucher res={current} />

              <ResFolio res={current} />

              <div className="avis-block">
                <label style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--marine)", display: "block", marginBottom: 8 }}>Formulaire d'avis du client</label>
                {current.avis_demande ? (
                  <div>
                    <div className="as-line"><Icon name="check" size={15} stroke={2.4} /> Formulaire d'avis envoyé{current.avis_demande_at ? " le " + BC.date(current.avis_demande_at) : ""}.</div>
                    {current.avis_recu && <span className="badge badge-gold" style={{ marginTop: 10 }}>Avis reçu — à valider dans « Contenus »</span>}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                      <a className="a-btn sm" href={waLink(avisMsg, piiPhone(current.telephone_whatsapp))} target="_blank" rel="noopener"><Icon name="wa" size={14} /> Renvoyer (WhatsApp)</a>
                      <a className="a-btn sm" href={"mailto:" + piiEmail(current.email) + "?subject=" + encodeURIComponent("Votre avis — Hôtel Blue Caravelle") + "&body=" + encodeURIComponent(avisMsg)}><Icon name="mail" size={14} /> Renvoyer (e-mail)</a>
                      <button className="a-btn sm" onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText(avisUrl(current)); fireToast({ title: "Lien copié", msg: "Le lien du formulaire d'avis a été copié.", duration: 3000 }); }}><Icon name="edit" size={14} /> Copier le lien</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="muted" style={{ fontSize: ".86rem", margin: "4px 0 12px" }}>Envoyé automatiquement à la fin du séjour ou en cas d'annulation. Vous pouvez aussi l'envoyer dès maintenant.</p>
                    <button className="a-btn" onClick={() => { DB.update("reservations", current.id, { avis_demande: true, avis_demande_at: Date.now() }); fireToast({ title: "Formulaire envoyé", msg: "Le formulaire d'avis a été transmis à " + piiName(current.nom_complet) + ".", duration: 4000 }); }}><Icon name="star" size={15} fill="currentColor" /> Envoyer le formulaire d'avis</button>
                  </div>
                )}
              </div>
            </div>
            <div className="m-foot">
              <a className="a-btn" href={waLink("Bonjour " + piiName(current.nom_complet) + ", concernant votre demande de réservation au Blue Caravelle…", piiPhone(current.telephone_whatsapp))} target="_blank" rel="noopener"><Icon name="wa" size={15} /> WhatsApp</a>
              <a className="a-btn" href={"mailto:" + piiEmail(current.email) + "?subject=" + encodeURIComponent("Votre demande de réservation — Hôtel Blue Caravelle")}><Icon name="mail" size={15} /> E-mail</a>
              <button className="a-btn danger" onClick={() => { if (confirm("Supprimer cette demande ?")) { DB.remove("reservations", current.id); setOpen(null); } }}><Icon name="trash" size={15} /> Supprimer</button>
            </div>
          </div>
        </div>}
    </div>
  );
}

/* ---------- Booking & enregistrement (plan des chambres) ---------- */
function todayISO() { var d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString().slice(0, 10); }
function dateCovers(blocks, iso) { return (blocks || []).some(b => iso >= b.debut && iso <= b.fin); }
function nightsBetween(a, b) {
  if (!a || !b) return 0;
  var d = Math.round((new Date(b) - new Date(a)) / 86400000);
  return d > 0 ? d : 0;
}
function nowHHMM() { var d = new Date(); return d.toTimeString().slice(0, 5); }
function hhmm(ts) { if (!ts) return "—"; return new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }
function atTime(base, t) {
  var d = base ? new Date(base) : new Date();
  var p = (t || "00:00").split(":");
  d.setHours(Number(p[0]) || 0, Number(p[1]) || 0, 0, 0);
  return d.getTime();
}

function AdminBooking() {
  const [date, setDate] = useState(todayISO());
  const [checkin, setCheckin] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const rooms = DB.all("rooms");
  const res = DB.all("reservations");
  const activeStay = (rid, u) => res.find(r => r.chambre_id === rid && r.unite === u && r.checkin_at && !r.checkout_at && r.statut !== "Annulée");
  const upcomingAssign = (rid, u) => res.find(r => r.chambre_id === rid && r.unite === u && !r.checkin_at && !r.checkout_at && r.statut !== "Annulée");

  const inhouse = res.filter(r => r.checkin_at && !r.checkout_at && r.statut !== "Annulée");
  // À enregistrer : arrivées du jour ET arrivées passées non encore enregistrées
  // (en retard), tant que le séjour n'est pas terminé. Évite qu'un client confirmé
  // ne « disparaisse » le lendemain de sa date d'arrivée.
  const arrivals = res.filter(r =>
    !r.checkin_at && !r.checkout_at && r.statut !== "Annulée" && r.statut !== "Terminée" &&
    r.date_arrivee && r.date_arrivee <= date &&
    (!r.date_depart || r.date_depart > date)
  );
  const departures = inhouse.filter(r => r.date_depart && r.date_depart <= date);
  const totalUnits = rooms.reduce((n, r) => n + (r.unites || 0), 0);
  const occupied = inhouse.length;
  const freeUnits = Math.max(0, totalUnits - occupied);

  const kpis = [
    { n: arrivals.length, l: "Arrivées attendues", ic: "arrow", bg: "#E7F4FB", c: "#0F76A8" },
    { n: departures.length, l: "Départs du jour", ic: "logout", bg: "#FFF3DC", c: "#B07A14" },
    { n: occupied, l: "Clients présents", ic: "users", bg: "#E3F6EA", c: "#1E8A4E" },
    { n: freeUnits, l: "Chambres libres", ic: "bed", bg: "#EDE7FB", c: "#6244B0" }
  ];

  const doCheckout = (r, ts) => {
    const patch = { checkout_at: ts || Date.now(), statut: "Terminée" };
    if (!r.avis_demande) { patch.avis_demande = true; patch.avis_demande_at = Date.now(); console.info("[Formulaire d'avis envoyé] " + r.nom_complet); }
    DB.update("reservations", r.id, patch);
    if (r.chambre_id && r.unite) setUnitMenage(r.chambre_id, r.unite, "a_nettoyer");
    logAudit("Départ", r.nom_complet + (r.type_chambre ? " · " + r.type_chambre : ""));
    fireToast({ title: "Départ enregistré", msg: piiName(r.nom_complet) + " — chambre libérée à " + hhmm(patch.checkout_at) + ", à préparer (housekeeping). Le formulaire d'avis a été envoyé.", duration: 5000 });
  };

  return (
    <div>
      <div className="admin-h">
        <div><h1>Booking & enregistrement</h1><div className="sub">Arrivées, départs et plan d'occupation des chambres, en temps réel.</div></div>
        <label className="bk-date">Journée <input type="date" value={date} onChange={e => setDate(e.target.value || todayISO())} /></label>
      </div>

      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <div className="a-card kpi" key={i}>
            <div className="k-top"><span className="k-l" style={{ marginTop: 0, fontWeight: 600 }}>{k.l}</span>
              <span className="k-ic" style={{ background: k.bg, color: k.c }}><Icon name={k.ic} size={21} /></span></div>
            <div className="k-n">{k.n}</div>
          </div>
        ))}
      </div>

      <div className="bk-cols">
        <div className="a-card bk-list">
          <div className="bk-list-h"><Icon name="arrow" size={17} /> Arrivées à enregistrer</div>
          {arrivals.length ? arrivals.map(r => {
            const overdue = r.date_arrivee < date;
            return (
            <div className="bk-row" key={r.id}>
              <div><strong style={{ color: "var(--marine)" }}>{piiName(r.nom_complet)}</strong>{overdue && <span className="badge badge-full" style={{ marginLeft: 8 }}>En retard</span>}<div className="bk-sub">{r.type_chambre || "Sans préférence"} · {r.nombre_personnes} pers. · prévue le {BC.dateShort(r.date_arrivee)} → {BC.dateShort(r.date_depart)}</div></div>
              <button className="a-btn primary sm" onClick={() => setCheckin(r)}><Icon name="key" size={14} /> Enregistrer l'arrivée</button>
            </div>
          ); }) : <div className="empty-note" style={{ border: 0 }}>Aucune arrivée à enregistrer.</div>}
        </div>
        <div className="a-card bk-list">
          <div className="bk-list-h"><Icon name="users" size={17} /> Clients présents ({inhouse.length})</div>
          {inhouse.length ? inhouse.map(r => {
            const room = rooms.find(x => x.id === r.chambre_id);
            const depToday = r.date_depart === date;
            const depOver = r.date_depart && r.date_depart < date;
            return (
              <div className="bk-row" key={r.id}>
                <div><strong style={{ color: "var(--marine)" }}>{piiName(r.nom_complet)}</strong><div className="bk-sub">{room ? room.nom : r.type_chambre} · chambre n° {r.unite} · arrivée {hhmm(r.checkin_at)} · départ {BC.dateShort(r.date_depart)}{depOver ? " — dépassé" : depToday ? " — aujourd'hui" : ""}</div></div>
                <button className={"a-btn sm" + (depToday || depOver ? " primary" : "")} onClick={() => setCheckout(r)}><Icon name="logout" size={14} /> Départ</button>
              </div>
            );
          }) : <div className="empty-note" style={{ border: 0 }}>Aucun client présent actuellement.</div>}
        </div>
      </div>

      <div className="a-card" style={{ padding: "22px 24px", marginTop: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
          <strong style={{ color: "var(--marine)", fontSize: "1.05rem" }}>Plan des chambres</strong>
          <div className="bk-legend">
            <span><i className="lg-free"></i> Libre</span>
            <span><i className="lg-occ"></i> Occupée</span>
            <span><i className="lg-res"></i> Réservée</span>
            <span><i className="lg-blk"></i> Bloquée</span>
          </div>
        </div>
        <div className="rm-grid">
          {rooms.filter(r => (r.unites || 0) > 0).map(room => {
            const blocked = dateCovers(room.dates_bloquees, date);
            return (
              <div className="rm-room" key={room.id}>
                <div className="rm-head"><strong>{room.nom}</strong><span className="badge badge-gold">{room.type}</span>{blocked && <span className="badge badge-full">Bloquée</span>}</div>
                <div className="rm-units">
                  {Array.from({ length: room.unites }).map((_, idx) => {
                    const u = idx + 1;
                    const occ = activeStay(room.id, u);
                    const resv = !occ && upcomingAssign(room.id, u);
                    const mng = !occ && !resv ? unitMenage(room, u) : null;
                    const oos = mng === "hors_service";
                    const dirty = mng === "a_nettoyer" || mng === "en_cours";
                    const cls = blocked ? "blk" : occ ? "occ" : oos ? "blk" : resv ? "res" : "free";
                    return (
                      <div className={"rm-unit " + cls} key={u} title={occ ? piiName(occ.nom_complet) + " — arrivée " + hhmm(occ.checkin_at) : resv ? "Réservée — " + piiName(resv.nom_complet) : oos ? "Hors service" : dirty ? "À préparer (housekeeping)" : "Libre"}>
                        <span className="rm-no">N° {u}</span>
                        {occ ? <span className="rm-guest">{piiName(occ.nom_complet)}</span> : resv ? <span className="rm-guest">{piiName(resv.nom_complet)}</span> : <span className="rm-state">{oos ? "Hors service" : dirty ? "À préparer" : "Libre"}</span>}
                        {occ && <span className="rm-dep">→ {BC.dateShort(occ.date_depart)}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {checkin && <CheckinModal res={checkin} onClose={() => setCheckin(null)} />}
      {checkout && <CheckoutModal res={checkout} onClose={() => setCheckout(null)} onConfirm={(ts) => { doCheckout(checkout, ts); setCheckout(null); }} />}
    </div>
  );
}

function CheckinModal({ res, onClose }) {
  const rooms = DB.all("rooms").filter(r => (r.unites || 0) > 0);
  const all = DB.all("reservations");
  const match = rooms.find(r => r.nom === res.type_chambre);
  const [roomId, setRoomId] = useState(match ? match.id : (rooms[0] ? rooms[0].id : ""));
  const room = rooms.find(r => r.id === roomId);
  const freeUnits = room ? Array.from({ length: room.unites }, (_, i) => i + 1).filter(u =>
    unitMenage(room, u) !== "hors_service" &&
    !all.find(r => r.chambre_id === room.id && r.unite === u && r.checkin_at && !r.checkout_at && r.statut !== "Annulée") &&
    !all.find(r => r.chambre_id === room.id && r.unite === u && !r.checkin_at && !r.checkout_at && r.statut !== "Annulée" && r.id !== res.id)
  ) : [];
  const [unite, setUnite] = useState(freeUnits[0] || null);
  const [heure, setHeure] = useState(nowHHMM());
  const existingClient = findClientForRes(res);
  const [nat, setNat] = useState((existingClient && existingClient.nationalite) || res.nationalite || "");
  const [ptype, setPtype] = useState((existingClient && existingClient.piece_type) || res.piece_type || "CNI");
  const [pnum, setPnum] = useState((existingClient && existingClient.piece_num) || res.piece_num || "");
  const [pimg, setPimg] = useState((existingClient && existingClient.piece_image) || res.piece_image || "");
  useEffect(() => { setUnite(freeUnits[0] || null); }, [roomId]);
  const confirmIn = () => {
    if (!room || !unite) { fireToast({ title: "Aucune chambre libre", msg: "Choisissez une autre catégorie.", duration: 4000 }); return; }
    const patch = { chambre_id: room.id, unite: unite, checkin_at: atTime(null, heure),
      nationalite: nat, piece_type: ptype, piece_num: pnum, piece_image: pimg };
    if (res.statut === "Nouvelle" || res.statut === "Traitée") patch.statut = "Confirmée";
    const cl = upsertClientFromRes(res, { nom: res.nom_complet, email: res.email, telephone: res.telephone_whatsapp, nationalite: nat, piece_type: ptype, piece_num: pnum, piece_image: pimg });
    if (cl) patch.client_id = cl.id;
    DB.update("reservations", res.id, patch);
    logAudit("Arrivée enregistrée", res.nom_complet + " — " + room.nom + " n°" + unite);
    fireToast({ title: "Arrivée enregistrée", msg: piiName(res.nom_complet) + " — " + room.nom + " (chambre n° " + unite + ") à " + heure + ". Fiche client mise à jour.", duration: 4500 });
    onClose();
  };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="m-head"><h3>Enregistrer l'arrivée</h3><button className="icon-btn" onClick={onClose}><Icon name="close" size={16} /></button></div>
        <div className="m-body">
          <div className="detail-row"><span className="dl">Client</span><span className="dv">{piiName(res.nom_complet)}</span></div>
          <div className="detail-row"><span className="dl">Séjour</span><span className="dv">{BC.dateShort(res.date_arrivee)} → {BC.dateShort(res.date_depart)} · {res.nombre_personnes} pers.</span></div>
          <div className="field" style={{ marginTop: 16 }}>
            <label>Catégorie de chambre</label>
            <select value={roomId} onChange={e => setRoomId(e.target.value)}>{rooms.map(r => <option key={r.id} value={r.id}>{r.nom} ({r.type})</option>)}</select>
          </div>
          <div className="field">
            <label>Chambre attribuée</label>
            {freeUnits.length ?
              <select value={unite || ""} onChange={e => setUnite(Number(e.target.value))}>{freeUnits.map(u => <option key={u} value={u}>Chambre n° {u}{unitMenage(room, u) !== "propre" ? " — " + hkMeta(unitMenage(room, u)).l : ""}</option>)}</select>
              : <div className="form-err"><Icon name="lock" size={14} /> Aucune chambre libre dans cette catégorie.</div>}
            {room && unite && (unitMenage(room, unite) === "a_nettoyer" || unitMenage(room, unite) === "en_cours") &&
              <div style={{ marginTop: 8, background: "#FFF3DC", color: "#B07A14", padding: "8px 11px", borderRadius: 8, fontSize: ".82rem", display: "flex", gap: 8, alignItems: "center" }}>
                <Icon name="sparkle" size={14} /> Cette chambre est à préparer (housekeeping) avant l'arrivée.
              </div>}
          </div>
          <div className="field">
            <label>Heure d'arrivée</label>
            <input type="time" value={heure} onChange={e => setHeure(e.target.value)} style={{ maxWidth: 200 }} />
          </div>
          <div className="crm-id" style={{ marginTop: 4 }}>
            <div className="crm-id-h"><Icon name="shield" size={14} /> Identité (fiche de police)</div>
            <div className="row-2">
              <div className="field"><label>Nationalité</label><input value={nat} onChange={e => setNat(e.target.value)} placeholder="Ex. Ivoirienne" /></div>
              <div className="field"><label>Type de pièce</label><select value={ptype} onChange={e => setPtype(e.target.value)}>{PIECE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            </div>
            <div className="field"><label>Numéro de pièce</label><input value={pnum} onChange={e => setPnum(e.target.value)} /></div>
            <div className="field"><label>Copie de la pièce (optionnel)</label><ImageInput value={pimg} ratio="16/10" onChange={setPimg} /></div>
          </div>
        </div>
        <div className="m-foot">
          <button className="a-btn" onClick={onClose}>Annuler</button>
          <button className="a-btn primary" onClick={confirmIn} disabled={!freeUnits.length}><Icon name="key" size={15} /> Confirmer l'arrivée</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Point facture & départ ----------
   La facture porte sur le séjour RÉELLEMENT passé : de la date d'arrivée
   au jour du départ effectif (aujourd'hui), et non sur les nuits réservées.
   Un client qui réserve 5 nuits mais part après 2 n'est facturé que 2 nuits.
   Le nombre de nuits reste ajustable manuellement par l'administrateur. */
function CheckoutModal({ res, onClose, onConfirm }) {
  const today = todayISO();
  const reservedNights = nightsBetween(res.date_arrivee, res.date_depart);
  const stayedNights = Math.max(1, nightsBetween(res.date_arrivee, today));
  const [nights, setNights] = useState(stayedNights);
  const [heure, setHeure] = useState(nowHHMM());
  const [settle, setSettle] = useState(true);
  const [mode, setMode] = useState(PAY_MODES[0]);
  const n = Math.max(1, Number(nights) || 1);
  const calc = computeFolio(res, { nights: n });
  const room = calc.room;
  const early = reservedNights > 0 && stayedNights < reservedNights;
  const late = reservedNights > 0 && stayedNights > reservedNights;
  const invRef = useRef(null);
  const printInvoice = () => {
    const no = ensureFactureNo(res);
    setTimeout(() => { if (invRef.current) printHtml(invRef.current.innerHTML, "Facture " + no + " — " + res.nom_complet); }, 60);
  };
  const doConfirm = () => {
    if (settle && calc.reste > 0) {
      DB.update("reservations", res.id, { paiements: (res.paiements || []).concat([{ id: "pay_" + Math.random().toString(36).slice(2, 8), montant: calc.reste, mode: mode, note: "Solde au départ", date: Date.now() }]) });
      logAudit("Encaissement (solde au départ)", res.nom_complet + " — " + BC.xof(calc.reste) + " (" + mode + ")");
    }
    ensureFactureNo(res);
    onConfirm(atTime(null, heure));
  };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="m-head"><h3>Point facture — départ</h3><button className="icon-btn" onClick={onClose}><Icon name="close" size={16} /></button></div>
        <div className="m-body">
          {early &&
            <div style={{ background: "#FFF3DC", color: "#B07A14", padding: "10px 13px", borderRadius: 9, fontSize: ".84rem", display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 14 }}>
              <Icon name="logout" size={15} /> <span>Départ anticipé — <strong>{stayedNights} nuit(s)</strong> réellement passée(s) sur {reservedNights} réservée(s). La facture est ajustée sur le séjour réel.</span>
            </div>}
          {late &&
            <div style={{ background: "#E7F4FB", color: "#0F76A8", padding: "10px 13px", borderRadius: 9, fontSize: ".84rem", display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 14 }}>
              <Icon name="calendar" size={15} /> <span>Séjour prolongé — <strong>{stayedNights} nuit(s)</strong> réellement passée(s) sur {reservedNights} réservée(s).</span>
            </div>}

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, padding: "12px 14px", border: "1.5px solid var(--line, #DBE2E9)", borderRadius: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: ".84rem", fontWeight: 600, color: "var(--marine)" }}>Nuits à facturer</div>
              <div style={{ fontSize: ".78rem", color: "#8a96a2", marginTop: 2 }}>Réservé : {reservedNights || "—"} · réellement passé : {stayedNights}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button type="button" className="a-btn sm" onClick={() => setNights(v => Math.max(1, (Number(v) || 1) - 1))} aria-label="Moins une nuit">−</button>
                <input type="number" min="1" value={nights} onChange={e => setNights(Math.max(1, Number(e.target.value) || 1))}
                  style={{ width: 64, padding: "9px 8px", border: "1.5px solid var(--line, #DBE2E9)", borderRadius: 8, textAlign: "center", fontWeight: 700, color: "var(--marine)" }} />
                <button type="button" className="a-btn sm" onClick={() => setNights(v => (Number(v) || 0) + 1)} aria-label="Une nuit de plus">+</button>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: ".78rem", fontWeight: 600, color: "var(--marine)" }}>
                Heure de départ
                <input type="time" value={heure} onChange={e => setHeure(e.target.value)}
                  style={{ padding: "8px 10px", border: "1.5px solid var(--line, #DBE2E9)", borderRadius: 8, color: "var(--anthracite)" }} />
              </label>
            </div>
          </div>

          <div ref={invRef}><FolioDoc res={res} calc={calc} factureNo={res.facture_no} dateDepart={today} /></div>

          {calc.reste > 0 &&
            <div className="co-settle">
              <label className="co-settle-l"><input type="checkbox" checked={settle} onChange={e => setSettle(e.target.checked)} /> Encaisser le solde au départ — <strong>{finXof(calc.reste)}</strong></label>
              {settle && <select className="mini-in" value={mode} onChange={e => setMode(e.target.value)} style={{ maxWidth: 190 }}>{PAY_MODES.map(m => <option key={m}>{m}</option>)}</select>}
            </div>}
          {calc.reste === 0 && <div className="co-paid"><Icon name="check" size={15} stroke={2.4} /> Note entièrement réglée.</div>}
          {!room && <div className="form-err" style={{ marginTop: 14 }}><Icon name="lock" size={14} /> Aucune chambre attribuée : tarif indisponible pour cette réservation.</div>}
        </div>
        <div className="m-foot">
          <button className="a-btn" onClick={onClose}>Annuler</button>
          <button className="a-btn" onClick={printInvoice}><Icon name="edit" size={15} /> Imprimer la facture</button>
          <button className="a-btn primary" onClick={doConfirm}><Icon name="logout" size={15} /> Confirmer le départ</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Disponibilités ---------- */
function AdminDispo() {
  const rooms = DB.all("rooms");
  return (
    <div>
      <div className="admin-h"><div><h1>Disponibilités des chambres</h1><div className="sub">Impact immédiat sur le site : badge « Complet » et liste de réservation.</div></div></div>
      <div className="grid" style={{ gap: 14 }}>
        {rooms.map(r => <DispoRow key={r.id} r={r} />)}
      </div>
    </div>
  );
}
function DispoRow({ r }) {
  const [d1, setD1] = useState(""); const [d2, setD2] = useState("");
  const addBlock = () => {
    if (!d1 || !d2) return;
    const blocks = (r.dates_bloquees || []).concat([{ debut: d1, fin: d2 }]);
    DB.update("rooms", r.id, { dates_bloquees: blocks }); setD1(""); setD2("");
  };
  const rm = (i) => DB.update("rooms", r.id, { dates_bloquees: r.dates_bloquees.filter((_, j) => j !== i) });
  return (
    <div className="a-card" style={{ padding: 18, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 18, alignItems: "center" }}>
      <Photo src={r.photos[0]} alt="" style={{ width: 84, height: 64, borderRadius: 10 }} />
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <strong style={{ color: "var(--marine)", fontSize: "1.05rem" }}>{r.nom}</strong>
          <span className="badge badge-gold">{r.type}</span>
          {!r.disponible && <span className="badge badge-full">Complet</span>}
        </div>
        <div style={{ display: "flex", gap: 18, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: ".88rem", fontWeight: 600, color: "var(--marine)" }}>
            <span className="switch"><input type="checkbox" checked={r.disponible} onChange={e => DB.update("rooms", r.id, { disponible: e.target.checked, unites: e.target.checked && r.unites === 0 ? 1 : r.unites })} /><span className="sl"></span></span>
            {r.disponible ? "Disponible" : "Indisponible"}
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".88rem", color: "#6a7682" }}>
            Unités
            <input type="number" min="0" value={r.unites} onChange={e => { const v = Math.max(0, Number(e.target.value)); DB.update("rooms", r.id, { unites: v, disponible: v > 0 }); }}
              style={{ width: 66, padding: "7px 10px", border: "1px solid #DBE2E9", borderRadius: 8 }} />
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: ".82rem", color: "#8a96a2" }}>Bloquer une période :</span>
            <input type="date" value={d1} onChange={e => setD1(e.target.value)} style={{ padding: "6px 9px", border: "1px solid #DBE2E9", borderRadius: 8 }} />
            <span style={{ color: "#8a96a2" }}>→</span>
            <input type="date" value={d2} onChange={e => setD2(e.target.value)} style={{ padding: "6px 9px", border: "1px solid #DBE2E9", borderRadius: 8 }} />
            <button className="a-btn sm" onClick={addBlock}><Icon name="plus" size={14} /> Ajouter</button>
          </div>
          {(r.dates_bloquees || []).length > 0 &&
            <div className="chip-row" style={{ marginTop: 10 }}>
              {r.dates_bloquees.map((b, i) => (
                <span className="chip" key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {BC.dateShort(b.debut)} → {BC.dateShort(b.fin)}
                  <button onClick={() => rm(i)} style={{ border: 0, background: "none", color: "#d5534e", cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>}
        </div>
      </div>
      <div></div>
    </div>
  );
}

/* ---------- Service Restaurant (vue dédiée) ---------- */
function AdminRestaurant() {
  useDB();
  const [tab, setTab] = useState("carte");
  const dishes = DB.all("dishes");
  const res = DB.all("reservations");
  const today = todayISO();

  /* Clients actuellement en séjour (checkin fait, checkout pas encore) */
  const presents = res.filter(r =>
    r.checkin_at && !r.checkout_at &&
    r.statut !== "Annulée" && r.statut !== "Terminée"
  );

  /* Arrivées du jour sans encore de checkin (commande possible ce soir) */
  const arrivees = res.filter(r =>
    r.date_arrivee === today && !r.checkin_at &&
    r.statut !== "Annulée" && r.statut !== "Terminée"
  );

  /* Plats groupés par catégorie */
  const cats = [...new Set(dishes.map(d => d.categorie))];

  return (
    <div>
      <div className="admin-h">
        <div><h1>Service restaurant</h1><div className="sub">Carte du jour et informations clients — vue réservée à l'équipe de restauration.</div></div>
      </div>

      {/* Onglets */}
      <div className="rest-tabs">
        <button className={"rest-tab" + (tab === "carte" ? " active" : "")} onClick={() => setTab("carte")}>
          <Icon name="utensils" size={16} /> Carte &amp; plats
        </button>
        <button className={"rest-tab" + (tab === "clients" ? " active" : "")} onClick={() => setTab("clients")}>
          <Icon name="users" size={16} /> Clients présents
          <span className="nb" style={{ marginLeft: 8 }}>{presents.length + arrivees.length}</span>
        </button>
      </div>

      {tab === "carte" && (
        <div>
          {cats.length === 0 && <div className="empty-note">Aucun plat enregistré.</div>}
          {cats.map(cat => {
            const items = dishes.filter(d => d.categorie === cat);
            return (
              <div key={cat} className="a-card" style={{ marginBottom: 18, overflow: "hidden" }}>
                <div className="rest-cat-head">{cat}</div>
                <div className="rest-dish-list">
                  {items.map(d => (
                    <div key={d.id} className="rest-dish-row">
                      {d.image && <img src={d.image} alt={d.nom} className="rest-dish-img" />}
                      <div className="rest-dish-body">
                        <div className="rest-dish-name">{d.nom}</div>
                        {d.description && <div className="rest-dish-desc">{d.description}</div>}
                      </div>
                      <div className="rest-dish-prix">{d.prix_txt ? d.prix_txt : (d.prix ? BC.xof(d.prix) : "—")}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "clients" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {presents.length === 0 && arrivees.length === 0 && (
            <div className="empty-note">Aucun client actuellement en séjour.</div>
          )}
          {presents.length > 0 && (
            <div className="a-card" style={{ overflow: "hidden" }}>
              <div className="rest-cat-head" style={{ background: "#E3F6EA", color: "#1E7A44" }}>
                <Icon name="check" size={15} /> Clients en séjour ({presents.length})
              </div>
              {presents.map(r => (
                <div key={r.id} className="rest-client-row">
                  <div className="rest-client-main">
                    <strong>{piiName(r.nom_complet)}</strong>
                    <span className="badge badge-gold" style={{ marginLeft: 10, fontSize: ".66rem" }}>{r.type_chambre || "Chambre NC"}</span>
                  </div>
                  <div className="rest-client-sub">
                    Séjour : {BC.dateShort(r.date_arrivee)} → {BC.dateShort(r.date_depart)} · {r.nombre_personnes} pers.
                  </div>
                  {r.message && (
                    <div className="rest-client-note">
                      <Icon name="sparkle" size={13} /> {r.message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {arrivees.length > 0 && (
            <div className="a-card" style={{ overflow: "hidden" }}>
              <div className="rest-cat-head" style={{ background: "#FFF3DC", color: "#9B6B10" }}>
                <Icon name="arrow" size={15} /> Arrivées ce soir ({arrivees.length})
              </div>
              {arrivees.map(r => (
                <div key={r.id} className="rest-client-row">
                  <div className="rest-client-main">
                    <strong>{piiName(r.nom_complet)}</strong>
                    <span className="badge badge-ocean" style={{ marginLeft: 10, fontSize: ".66rem" }}>{r.type_chambre || "Chambre NC"}</span>
                  </div>
                  <div className="rest-client-sub">
                    Arrivée le {BC.dateShort(r.date_arrivee)} · {r.nombre_personnes} pers.
                  </div>
                  {r.message && (
                    <div className="rest-client-note">
                      <Icon name="sparkle" size={13} /> {r.message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Contenus (CRUD générique) ---------- */
const SCHEMAS = {
  rooms: {
    label: "Chambres", singular: "chambre", titleKey: "nom", thumb: r => r.photos && r.photos[0],
    sub: r => r.type + " · " + BC.xof(r.prix),
    fields: [
      { k: "nom", l: "Nom", t: "text" }, { k: "type", l: "Type", t: "select", opts: ["Standard", "Supérieure", "Suite"] },
      { k: "prix", l: "Prix indicatif / nuit (FCFA)", t: "number" }, { k: "capacite", l: "Capacité (pers.)", t: "number" },
      { k: "description", l: "Description", t: "textarea" }, { k: "equipements", l: "Équipements (séparés par des virgules)", t: "list" },
      { k: "photos", l: "Photos de la chambre", t: "images" },
      { k: "unites", l: "Unités disponibles", t: "number" },
      { k: "disponible", l: "Disponible", t: "bool" }, { k: "mise_en_avant", l: "Mise en avant (accueil)", t: "bool" }
    ],
    blank: { nom: "", type: "Standard", prix: 60000, capacite: 2, description: "", equipements: [], photos: [], unites: 1, dates_bloquees: [], disponible: true, mise_en_avant: false }
  },
  experiences: {
    label: "Expériences", singular: "expérience", titleKey: "titre", thumb: e => e.image,
    sub: e => e.categorie + " · " + (e.tarif ? BC.xof(e.tarif) : "sur demande"),
    fields: [
      { k: "titre", l: "Titre", t: "text" }, { k: "categorie", l: "Catégorie", t: "select", opts: ["Mer", "Plage", "Excursion", "Bien-être"] },
      { k: "duree", l: "Durée", t: "text" }, { k: "tarif", l: "Tarif indicatif (FCFA)", t: "number" },
      { k: "description", l: "Description", t: "textarea" }, { k: "image", l: "Image de l'expérience", t: "image" }
    ],
    blank: { titre: "", categorie: "Mer", duree: "2 h", tarif: 0, description: "", image: "" }
  },
  dishes: {
    label: "Carte (plats)", singular: "plat", titleKey: "nom", thumb: d => d.image,
    sub: d => d.categorie + " · " + (d.prix_txt || (d.prix ? BC.xof(d.prix) : "—")),
    fields: [
      { k: "nom", l: "Nom", t: "text" }, { k: "categorie", l: "Catégorie", t: "select", opts: ["Signature", "Entrée", "Kedjenou", "Sauce", "Plat", "Grillade", "Accompagnement", "Dessert", "Boisson"] },
      { k: "prix", l: "Prix (FCFA)", t: "number" }, { k: "prix_txt", l: "Prix affiché (texte, ex. « 8 000 – 10 000 FCFA » — laisser vide pour le prix ci-dessus)", t: "text" }, { k: "description", l: "Description", t: "text" }, { k: "image", l: "Photo du plat", t: "image" }
    ],
    blank: { nom: "", categorie: "Signature", prix: 5000, prix_txt: "", description: "", image: "" }
  },
  gallery: {
    label: "Galerie", singular: "photo", titleKey: "legende", thumb: p => p.image,
    sub: p => p.categorie,
    fields: [
      { k: "legende", l: "Légende", t: "text" }, { k: "categorie", l: "Catégorie", t: "select", opts: ["Chambres", "Restaurant", "Extérieurs", "Plage", "Événements"] },
      { k: "image", l: "Image", t: "image" }
    ],
    blank: { legende: "", categorie: "Extérieurs", image: "" }
  },
  reviews: {
    label: "Avis", singular: "avis", titleKey: "nom_client", thumb: null,
    sub: a => "★".repeat(Math.max(0, Math.min(5, a.note || 0))) + " · " + (a.affiche ? "Affiché sur le site" : "En attente de validation") + (a.source ? " · " + a.source : ""),
    fields: [
      { k: "nom_client", l: "Nom du client", t: "text" }, { k: "note", l: "Note", t: "stars" },
      { k: "commentaire", l: "Commentaire", t: "textarea" }, { k: "affiche", l: "Afficher sur le site", t: "bool" }
    ],
    blank: { nom_client: "", note: 5, commentaire: "", affiche: true, lu: true, source: "Saisi par l'admin" }
  }
};

function AdminContent() {
  const [tab, setTab] = useState("rooms");
  const [edit, setEdit] = useState(null); // {coll, item} ou {coll, item:null} pour nouveau
  useEffect(() => {
    if (tab === "reviews") {
      const unread = DB.all("reviews").filter(r => !r.lu);
      if (unread.length) unread.forEach(r => DB.update("reviews", r.id, { lu: true }));
    }
  }, [tab]);
  const sc = SCHEMAS[tab];
  const items = DB.all(tab);
  return (
    <div>
      <div className="admin-h">
        <div><h1>Contenus</h1><div className="sub">Ajoutez, modifiez ou supprimez les éléments du site — sans toucher au code.</div></div>
        <button className="a-btn primary" onClick={() => setEdit({ coll: tab, item: null })}><Icon name="plus" size={16} /> Ajouter {sc.singular === "avis" ? "un avis" : (sc.singular === "photo" || sc.singular === "chambre" || sc.singular === "expérience") ? "une " + sc.singular : "un " + sc.singular}</button>
      </div>
      <div className="seg" style={{ marginBottom: 20, flexWrap: "wrap" }}>
        {Object.keys(SCHEMAS).map(k => <button key={k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>{SCHEMAS[k].label}</button>)}
      </div>
      <div className="a-card" style={{ overflow: "auto" }}>
        <table className="a-table">
          <tbody>
            {items.map(it => (
              <tr key={it.id}>
                <td style={{ width: 60 }}>{sc.thumb && sc.thumb(it) ? <Photo src={sc.thumb(it)} alt="" style={{ width: 46, height: 46, borderRadius: 8 }} /> : <span style={{ width: 46, height: 46, borderRadius: 8, background: "var(--ocean-soft)", display: "grid", placeItems: "center", color: "var(--profond)" }}><Icon name="star" size={18} /></span>}</td>
                <td><strong style={{ color: "var(--marine)" }}>{it[sc.titleKey] || "(sans titre)"}</strong>{tab === "reviews" && !it.affiche ? <span className="pending-pill">En attente</span> : null}<div style={{ color: "#8a96a2", fontSize: ".84rem" }}>{sc.sub(it)}</div></td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button className="icon-btn" onClick={() => setEdit({ coll: tab, item: it })} aria-label="Modifier" style={{ marginRight: 8 }}><Icon name="edit" size={16} /></button>
                  <button className="icon-btn danger" onClick={() => { if (confirm("Supprimer « " + (it[sc.titleKey] || "") + " » ?")) DB.remove(tab, it.id); }} aria-label="Supprimer"><Icon name="trash" size={16} /></button>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td><div className="empty-note" style={{ border: 0 }}>Aucun élément. Cliquez sur « Ajouter ».</div></td></tr>}
          </tbody>
        </table>
      </div>
      {edit && <ContentEditor coll={edit.coll} item={edit.item} onClose={() => setEdit(null)} />}
    </div>
  );
}

function ContentEditor({ coll, item, onClose }) {
  const sc = SCHEMAS[coll];
  const [f, setF] = useState(() => item ? Object.assign({}, item) : Object.assign({}, sc.blank));
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const save = () => {
    const out = Object.assign({}, f);
    sc.fields.forEach(fl => { if (fl.t === "number") out[fl.k] = Number(out[fl.k]) || 0; });
    if (item) DB.update(coll, item.id, out);
    else DB.insert(coll, out);
    fireToast({ title: "Enregistré", msg: sc.label + " mis à jour avec succès.", duration: 3500 });
    onClose();
  };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="m-head"><h3>{item ? "Modifier" : "Ajouter"} — {sc.singular}</h3><button className="icon-btn" onClick={onClose}><Icon name="close" size={16} /></button></div>
        <div className="m-body">
          {sc.fields.map(fl => (
            <div className="field" key={fl.k}>
              <label>{fl.l}</label>
              {fl.t === "text" && <input value={f[fl.k] ?? ""} onChange={e => set(fl.k, e.target.value)} />}
              {fl.t === "number" && <input type="number" value={f[fl.k] ?? 0} onChange={e => set(fl.k, e.target.value)} />}
              {fl.t === "textarea" && <textarea value={f[fl.k] ?? ""} onChange={e => set(fl.k, e.target.value)} />}
              {fl.t === "select" && <select value={f[fl.k]} onChange={e => set(fl.k, e.target.value)}>{fl.opts.map(o => <option key={o}>{o}</option>)}</select>}
              {fl.t === "list" && <textarea value={(f[fl.k] || []).join(", ")} onChange={e => set(fl.k, e.target.value.split(",").map(s => s.trim()).filter(Boolean))} style={{ minHeight: 70 }} />}
              {fl.t === "image" && <ImageInput value={f[fl.k] || ""} onChange={v => set(fl.k, v)} />}
              {fl.t === "images" && <ImagesInput value={f[fl.k] || []} onChange={v => set(fl.k, v)} />}
              {fl.t === "stars" && <StarInput value={Number(f[fl.k]) || 0} onChange={v => set(fl.k, v)} />}
              {fl.t === "bool" &&
                <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: ".9rem", color: "#6a7682", marginTop: 4 }}>
                  <span className="switch"><input type="checkbox" checked={!!f[fl.k]} onChange={e => set(fl.k, e.target.checked)} /><span className="sl"></span></span>
                  {f[fl.k] ? "Oui" : "Non"}
                </label>}
            </div>
          ))}
        </div>
        <div className="m-foot">
          <button className="a-btn" onClick={onClose}>Annuler</button>
          <button className="a-btn primary" onClick={save}><Icon name="check" size={15} /> Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Messages ---------- */
function AdminMessages() {
  const [open, setOpen] = useState(null);
  const list = DB.all("messages").slice().sort((a, b) => b.date_creation - a.date_creation);
  const openMsg = (m) => { if (!m.lu) DB.update("messages", m.id, { lu: true }); if (piiMasked()) logAudit("Consultation message (données voilées)", m.nom); setOpen(m.id); };
  const current = open ? DB.find("messages", open) : null;
  return (
    <div>
      <div className="admin-h"><div><h1>Messages de contact</h1><div className="sub">{list.filter(m => !m.lu).length} non lu(s) sur {list.length}</div></div></div>
      <div className="a-card" style={{ overflow: "auto" }}>
        <table className="a-table">
          <thead><tr><th>Expéditeur</th><th>Sujet</th><th>Reçu le</th><th></th></tr></thead>
          <tbody>
            {list.map(m => (
              <tr key={m.id} className={(!m.lu ? "unread " : "") + "a-row-link"} onClick={() => openMsg(m)}>
                <td><strong>{piiName(m.nom)}</strong><div style={{ color: "#8a96a2", fontSize: ".82rem" }}>{piiEmail(m.email)}</div></td>
                <td>{m.sujet || "—"}</td>
                <td style={{ color: "#8a96a2", fontSize: ".84rem", whiteSpace: "nowrap" }}>{BC.date(m.date_creation)}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {!m.lu && <button className="a-btn sm" onClick={(e) => { e.stopPropagation(); DB.update("messages", m.id, { lu: true }); }}>Marquer lu</button>}
                  <button className="icon-btn" onClick={(e) => { e.stopPropagation(); openMsg(m); }} style={{ marginLeft: 8 }}><Icon name="eye" size={16} /></button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan="4"><div className="empty-note" style={{ border: 0 }}>Aucun message.</div></td></tr>}
          </tbody>
        </table>
      </div>
      {current &&
        <div className="modal-bg" onClick={() => setOpen(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="m-head"><h3>{current.sujet || "Message"}</h3><button className="icon-btn" onClick={() => setOpen(null)}><Icon name="close" size={16} /></button></div>
            <div className="m-body">
              {[["De", piiName(current.nom)], ["E-mail", piiEmail(current.email)], ["Téléphone", piiPhone(current.telephone) || "—"], ["Reçu le", BC.date(current.date_creation)]].map((d, i) =>
                <div className="detail-row" key={i}><span className="dl">{d[0]}</span><span className="dv">{d[1]}</span></div>)}
              <p style={{ marginTop: 16, lineHeight: 1.7, color: "var(--anthracite)" }}>{current.message}</p>
            </div>
            <div className="m-foot">
              {current.telephone && <a className="a-btn" href={waLink("Bonjour " + piiName(current.nom) + ", suite à votre message à l'Hôtel Blue Caravelle…", piiPhone(current.telephone))} target="_blank" rel="noopener"><Icon name="wa" size={15} /> WhatsApp</a>}
              <a className="a-btn" href={"mailto:" + piiEmail(current.email) + "?subject=" + encodeURIComponent("Re : " + (current.sujet || "Votre message") + " — Hôtel Blue Caravelle")}><Icon name="mail" size={15} /> Répondre</a>
              <button className="a-btn danger" onClick={() => { if (confirm("Supprimer ce message ?")) { DB.remove("messages", current.id); setOpen(null); } }}><Icon name="trash" size={15} /> Supprimer</button>
            </div>
          </div>
        </div>}
    </div>
  );
}

/* ---------- Paramètres du site (super admin uniquement) ---------- */
const SITE_IMAGES = [
  { k: "heroBeach", l: "Accueil — image principale", ratio: "16/9" },
  { k: "ext1", l: "Accueil — collage : terrasse", ratio: "3/4" },
  { k: "pool", l: "Accueil — collage : piscine", ratio: "1/1" },
  { k: "food1", l: "Accueil — collage : gastronomie", ratio: "1/1" },
  { k: "restaurant", l: "Accueil — section restaurant", ratio: "4/3" },
  { k: "about", l: "À propos — couverture", ratio: "16/9" },
  { k: "ext2", l: "À propos — photo « histoire »", ratio: "4/5" },
  { k: "suite", l: "Chambres — couverture", ratio: "16/9" },
  { k: "dining", l: "Restaurant — couverture", ratio: "16/9" },
  { k: "food4", l: "Restaurant — collage 1", ratio: "3/4" },
  { k: "food5", l: "Restaurant — collage 2", ratio: "1/1" },
  { k: "food6", l: "Restaurant — collage 3", ratio: "1/1" },
  { k: "beach", l: "Plage (galerie & bandeau citation)", ratio: "16/9" },
  { k: "boat", l: "Expériences — couverture", ratio: "16/9" },
  { k: "room2", l: "Réservation — visuel", ratio: "4/5" }
];

function AdminSettings() {
  useDB();
  const settings = DB.getSettings();
  const info = settings.info || {};
  const [form, setForm] = useState({
    adresse: info.adresse || "", telephone: info.telephone || "", whatsapp: info.whatsapp || "", email: info.email || ""
  });
  const dirty = (form.adresse || "") !== (info.adresse || "") || (form.telephone || "") !== (info.telephone || "")
    || (form.whatsapp || "") !== (info.whatsapp || "") || (form.email || "") !== (info.email || "");
  const saveInfo = () => {
    DB.updateInfo({ adresse: form.adresse.trim(), telephone: form.telephone.trim(), whatsapp: form.whatsapp.trim(), email: form.email.trim() });
    fireToast({ title: "Informations mises à jour", msg: "Les coordonnées du site ont été enregistrées.", duration: 3500 });
  };
  return (
    <div>
      <div className="admin-h"><div><h1>Paramètres du site</h1><div className="sub">Mettez à jour les visuels et les informations affichés sur le site public. Vos modifications sont visibles immédiatement sur le site.</div></div></div>

      <div className="a-card" style={{ padding: "24px 26px", marginBottom: 22 }}>
        <h3 className="h3" style={{ marginBottom: 4 }}>Informations & coordonnées</h3>
        <p className="muted" style={{ marginBottom: 20, fontSize: ".9rem" }}>Affichées dans le pied de page, la page Contact et les boutons WhatsApp du site.</p>
        <div className="row-2">
          <div className="field"><label>Adresse</label><input value={form.adresse} onChange={e => setForm(s => ({ ...s, adresse: e.target.value }))} placeholder={BC.ADDRESS} /></div>
          <div className="field"><label>Téléphone</label><input value={form.telephone} onChange={e => setForm(s => ({ ...s, telephone: e.target.value }))} placeholder={BC.PHONE} /></div>
        </div>
        <div className="row-2">
          <div className="field"><label>Numéro WhatsApp</label><input value={form.whatsapp} onChange={e => setForm(s => ({ ...s, whatsapp: e.target.value }))} placeholder={BC.WHATSAPP_DISPLAY} /></div>
          <div className="field"><label>E-mail</label><input value={form.email} onChange={e => setForm(s => ({ ...s, email: e.target.value }))} placeholder={BC.EMAIL} /></div>
        </div>
        <button className="a-btn primary" onClick={saveInfo} disabled={!dirty}><Icon name="check" size={15} /> Enregistrer les informations</button>
      </div>

      <FacturationCard />

      <div className="a-card" style={{ padding: "24px 26px" }}>
        <h3 className="h3" style={{ marginBottom: 4 }}>Images du site</h3>
        <p className="muted" style={{ marginBottom: 22, fontSize: ".9rem" }}>Chargez vos propres photos pour remplacer les visuels par défaut. Format paysage conseillé pour les couvertures.</p>
        <div className="settings-img-grid">
          {SITE_IMAGES.map(si => {
            const overridden = !!(settings.images && settings.images[si.k]);
            return (
              <div className="setting-img" key={si.k}>
                <label className="si-label">{si.l}{overridden ? <span className="si-tag">Personnalisée</span> : null}</label>
                <ImageInput value={DB.IMG[si.k]} ratio={si.ratio} onChange={(v) => DB.setSiteImage(si.k, v)} />
                {overridden && <button type="button" className="a-btn sm" style={{ marginTop: 8 }} onClick={() => DB.setSiteImage(si.k, "")}><Icon name="arrowL" size={13} /> Rétablir l'image d'origine</button>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AdminApp });
