/* =========================================================
   BLUE CARAVELLE — Composants & hooks partagés
   ========================================================= */
const { useState, useEffect, useRef, useCallback } = React;

/* ---------- Icônes ---------- */
const PATHS = {
  menu: "M3 6h18M3 12h18M3 18h18",
  close: "M6 6l12 12M18 6L6 18",
  arrow: "M5 12h14M13 6l6 6-6 6",
  arrowL: "M19 12H5M11 6l-6 6 6 6",
  phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6",
  pin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z|M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  check: "M20 6L9 17l-5-5",
  star: "M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z",
  fb: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
  ig: "M2 8a6 6 0 0 1 6-6h8a6 6 0 0 1 6 6v8a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6z|M16 11.4a4 4 0 1 1-7.9 1.2 4 4 0 0 1 7.9-1.2zM17.5 6.5h.01",
  tiktok: "M16 8.2a5.7 5.7 0 0 0 4 1.6V6.6a3.3 3.3 0 0 1-3.4-3.3H13.3v11.2a2.4 2.4 0 1 1-2.4-2.4c.2 0 .4 0 .6.1V8.7a5.8 5.8 0 1 0 4.5 5.6z",
  wa: "M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.7 1-.9 1.1-.2.2-.3.2-.6.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.5-.5.3-.5c.1-.2 0-.4 0-.5L9 5.7c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3A3 3 0 0 0 6.2 8c0 1.3.9 2.5 1.1 2.7.1.2 1.9 2.9 4.6 4 .6.3 1.1.5 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.7-.7 1.9-1.3.3-.7.3-1.2.2-1.3z|M12 22a10 10 0 1 0-8.6-15L2 22l5.2-1.4A10 10 0 0 0 12 22z",
  utensils: "M3 2v7a3 3 0 0 0 6 0V2M6 2v20M17 2c-1.7 0-3 2-3 5s1.3 5 3 5v10",
  wifi: "M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01",
  waves: "M2 7c2 0 2 1.5 4 1.5S8 7 10 7s2 1.5 4 1.5S16 7 18 7s2 1.5 4 1.5|M2 12c2 0 2 1.5 4 1.5S8 12 10 12s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5|M2 17c2 0 2 1.5 4 1.5s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  sparkle: "M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z",
  bed: "M2 8v10M2 13h20v5M22 13v-3a2 2 0 0 0-2-2h-7v5M6 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  trash: "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7|M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z",
  plus: "M12 5v14M5 12h14",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  calendar: "M3 4h18v18H3zM3 9h18M8 2v4M16 2v4",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2|M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  eyeoff: "M9.9 4.2A9.8 9.8 0 0 1 12 4c6 0 10 7 10 7a17.6 17.6 0 0 1-2.2 3M6.1 6.1A17.6 17.6 0 0 0 2 12s4 7 10 7a9.8 9.8 0 0 0 4.1-.9M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2",
  shield: "M12 2l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5z|M9 12l2 2 4-4",
  key: "M15 7a4 4 0 1 0-3.9 4.9L8 15v2H6v2H3v-3l5.1-5.1A4 4 0 0 0 15 7z|M16 6h.01",
  userPlus: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6",
  lock: "M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z|M8 11V7a4 4 0 0 1 8 0v4",
  image: "M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21",
  upload: "M12 15V3M8 7l4-4 4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 1.1-2.7H3a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"
};
function Icon({ name, size = 20, stroke = 1.6, fill, style, className }) {
  const d = PATHS[name] || "";
  const parts = d.split("|");
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style}
      fill={fill || "none"} stroke={fill ? "none" : "currentColor"} strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {parts.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

/* ---------- Routeur (hash) ---------- */
function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const on = () => { setHash(window.location.hash || "#/"); window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" }); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const path = (hash.replace(/^#/, "") || "/").split("?")[0];
  const query = (hash.split("?")[1] || "");
  return { path, query, params: new URLSearchParams(query) };
}
function go(path) { window.location.hash = path; }

/* ---------- Abonnement base ---------- */
function useDB() {
  const [, force] = useState(0);
  useEffect(() => DB.subscribe(() => force(n => n + 1)), []);
}

/* ---------- Reveal au scroll ---------- */
function Reveal({ children, delay = 0, as = "div", className = "", style }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => {
      es.forEach(e => { if (e.isIntersecting) { el.classList.add("in"); io.unobserve(el); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const Tag = as;
  return <Tag ref={ref} className={"reveal " + (delay ? "d" + delay + " " : "") + className} style={style}>{children}</Tag>;
}

/* ---------- Photo (chargement progressif + repli) ---------- */
function Photo({ src, alt = "", className = "", style, zoom = false, label, eager = false }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className={"photo " + (zoom ? "zoom " : "") + className} style={style} role="img" aria-label={alt}>
      {src && !failed &&
        <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async"
          className={loaded ? "loaded" : ""}
          onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />}
      {label && <span className="ph-label">{label}</span>}
    </div>
  );
}

/* ---------- Étoiles ---------- */
function Stars({ note = 5, size = 18 }) {
  return (
    <span className="rating" aria-label={note + " sur 5"}>
      {[1, 2, 3, 4, 5].map(i =>
        <Icon key={i} name="star" size={size} fill={i <= note ? "currentColor" : "none"}
          stroke={1.4} style={{ opacity: i <= note ? 1 : .3 }} />)}
    </span>
  );
}

/* ---------- Étoiles cliquables (saisie) ---------- */
function StarInput({ value = 0, onChange, size = 34 }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="star-input" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Note">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" className={"star-btn" + (i <= shown ? " on" : "")}
          onMouseEnter={() => setHover(i)} onClick={() => onChange(i)}
          aria-label={i + " étoile" + (i > 1 ? "s" : "")} aria-checked={value === i} role="radio">
          <Icon name="star" size={size} fill={i <= shown ? "currentColor" : "none"} stroke={1.4} />
        </button>
      ))}
    </div>
  );
}

/* ---------- Lien public du formulaire d'avis ---------- */
function avisUrl(res) {
  var base = window.location.href.split("#")[0];
  var q = "#/avis";
  if (res) q += "?res=" + encodeURIComponent(res.id) + "&n=" + encodeURIComponent(res.nom_complet || "");
  return base + q;
}

/* ---------- Toasts ---------- */
function fireToast(opts) { window.dispatchEvent(new CustomEvent("bc:toast", { detail: opts })); }
function ToastZone() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const on = (e) => {
      const id = Math.random().toString(36).slice(2);
      const t = Object.assign({ id, title: "", msg: "", duration: 6000 }, e.detail);
      setItems(l => [...l, t]);
      if (t.duration) setTimeout(() => setItems(l => l.filter(x => x.id !== id)), t.duration);
    };
    window.addEventListener("bc:toast", on);
    return () => window.removeEventListener("bc:toast", on);
  }, []);
  const close = (id) => setItems(l => l.filter(x => x.id !== id));
  return (
    <div className="toast-zone" role="region" aria-live="polite" aria-label="Notifications">
      {items.map(t => (
        <div className="toast" key={t.id} role="status">
          <span className="t-ic"><Icon name="check" size={22} stroke={2.4} /></span>
          <div className="t-body">
            <strong>{t.title}</strong>
            <span>{t.msg}</span>
          </div>
          <button className="t-x" onClick={() => close(t.id)} aria-label="Fermer">×</button>
          {t.duration ? <span className="t-prog" style={{ animationDuration: t.duration + "ms" }}></span> : null}
        </div>
      ))}
    </div>
  );
}

/* ---------- WhatsApp ---------- */
function waLink(msg, phone) {
  var num = String(phone || BC.WHATSAPP).replace(/[^\d]/g, "");
  return "https://wa.me/" + num + (msg ? "?text=" + encodeURIComponent(msg) : "");
}
function WhatsAppFab() {
  return (
    <a className="wa-fab" href={waLink("Bonjour, je vous contacte depuis le site de l'Hôtel Blue Caravelle.")}
      target="_blank" rel="noopener" aria-label="Contacter sur WhatsApp">
      <Icon name="wa" size={32} fill="currentColor" />
    </a>
  );
}

/* ---------- Navigation ---------- */
const NAV = [
  { p: "/", l: "Accueil" },
  { p: "/a-propos", l: "À propos" },
  { p: "/chambres", l: "Chambres" },
  { p: "/restaurant", l: "Restaurant" },
  { p: "/galerie", l: "Galerie" },
  { p: "/experiences", l: "Expériences" },
  { p: "/contact", l: "Contact" }
];

function Header({ path, heroPage }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => { setOpen(false); }, [path]);
  const isActive = (p) => p === "/" ? path === "/" : (path === p || path.startsWith(p + "/") || (p === "/chambres" && path.startsWith("/chambre")));
  const top = heroPage && !scrolled;
  return (
    <header className={"header " + (top ? "top" : "scrolled")}>
      <div className="wrap header-inner">
        <a className="brand" href="#/" aria-label="Blue Caravelle — Accueil">
          <img className="logo-color" src={(window.__resources||{}).logoColor||"https://res.cloudinary.com/drg6w7z0e/image/upload/v1781352895/logo-cream_shc5w5.png"} alt="Blue Caravelle" />
          <img className="logo-white" src={(window.__resources||{}).logoCream||"https://res.cloudinary.com/drg6w7z0e/image/upload/v1781352895/logo-cream_shc5w5.png"} alt="Blue Caravelle" />
        </a>
        <nav className="nav desktop" aria-label="Navigation principale">
          {NAV.map(n => (
            <a key={n.p} href={"#" + n.p} className={"nav-link" + (isActive(n.p) ? " active" : "")}>{n.l}</a>
          ))}
          <a href="#/reservation" className="btn btn-gold btn-sm nav-cta">Réserver</a>
        </nav>
        <button className="burger" aria-label="Menu" onClick={() => setOpen(true)}>
          <span></span><span></span><span></span>
        </button>
      </div>

      <div className={"drawer-bg" + (open ? " open" : "")} onClick={() => setOpen(false)}></div>
      <aside className={"drawer" + (open ? " open" : "")} aria-hidden={!open} role="dialog" aria-modal="true">
        <div className="d-head">
          <img src={(window.__resources||{}).logoCream||"https://res.cloudinary.com/drg6w7z0e/image/upload/v1781352895/logo-cream_shc5w5.png"} alt="Blue Caravelle" />
          <button className="x" onClick={() => setOpen(false)} aria-label="Fermer le menu">
            <Icon name="close" size={20} />
          </button>
        </div>
        <span className="d-label">Navigation</span>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {NAV.map(n => (
            <a key={n.p} href={"#" + n.p} className={isActive(n.p) ? "active" : ""}>
              {n.l}<Icon name="arrow" size={15} />
            </a>
          ))}
        </nav>
        <div className="d-foot">
          <div className="d-sep"></div>
          <a href="#/reservation" className="btn btn-gold btn-block" style={{ justifyContent: "center" }}>
            Réserver un séjour
          </a>
          <div className="d-socials">
            <a href="https://facebook.com" target="_blank" rel="noopener" aria-label="Facebook" className="d-soc"><Icon name="fb" size={16} /></a>
            <a href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram" className="d-soc"><Icon name="ig" size={16} /></a>
            <a href="https://tiktok.com" target="_blank" rel="noopener" aria-label="TikTok" className="d-soc"><Icon name="tiktok" size={16} /></a>
            <a href={waLink()} target="_blank" rel="noopener" aria-label="WhatsApp" className="d-soc"><Icon name="wa" size={16} fill="currentColor" /></a>
          </div>
          <a href="#/admin" className="d-admin">Espace administrateur</a>
        </div>
      </aside>
    </header>
  );
}

/* ---------- Pied de page ---------- */
function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="f-grid">
          <div>
            <img className="f-logo" src={(window.__resources||{}).logoCream||"https://res.cloudinary.com/drg6w7z0e/image/upload/v1781352895/logo-cream_shc5w5.png"} alt="Blue Caravelle" />
            <p style={{ maxWidth: 300, fontSize: ".94rem", lineHeight: 1.7 }}>
              L'art de vivre balnéaire à San Pedro. Un refuge premium face à l'Atlantique,
              où l'élégance rencontre l'âme ivoirienne.
            </p>
            <div className="socials" style={{ marginTop: 22 }}>
              <a href="https://facebook.com" target="_blank" rel="noopener" aria-label="Facebook"><Icon name="fb" size={18} /></a>
              <a href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram"><Icon name="ig" size={18} /></a>
              <a href="https://tiktok.com" target="_blank" rel="noopener" aria-label="TikTok"><Icon name="tiktok" size={18} /></a>
              <a href={waLink()} target="_blank" rel="noopener" aria-label="WhatsApp"><Icon name="wa" size={18} fill="currentColor" /></a>
            </div>
          </div>
          <div>
            <h4>Naviguer</h4>
            <div className="f-links">
              {NAV.map(n => <a key={n.p} href={"#" + n.p}>{n.l}</a>)}
            </div>
          </div>
          <div>
            <h4>Séjour</h4>
            <div className="f-links">
              <a href="#/reservation">Réserver</a>
              <a href="#/chambres">Nos chambres</a>
              <a href="#/experiences">Expériences</a>
              <a href="#/restaurant">Restaurant</a>
              <a href="#/avis">Donner mon avis</a>
              <a href="#/admin">Espace administrateur</a>
            </div>
          </div>
          <div>
            <h4>Nous trouver</h4>
            <div className="f-contact">
              <div className="ci"><Icon name="pin" size={18} /><span>{BC.ADDRESS}</span></div>
              <div className="ci"><Icon name="phone" size={18} /><a href={"tel:" + BC.PHONE.replace(/\s/g, "")}>{BC.PHONE}</a></div>
              <div className="ci"><Icon name="wa" size={18} fill="currentColor" /><a href={waLink()} target="_blank" rel="noopener">{BC.WHATSAPP_DISPLAY}</a></div>
              <div className="ci"><Icon name="mail" size={18} /><a href={"mailto:" + BC.EMAIL}>{BC.EMAIL}</a></div>
            </div>
          </div>
        </div>
        <div className="f-bottom">
          <span>© {new Date().getFullYear()} Hôtel Blue Caravelle — San Pedro, Côte d'Ivoire. Tous droits réservés.</span>
          <a href="#/mentions-legales">Mentions légales</a>
          <a href="#/politique-confidentialite">Confidentialité</a>
          <a href="#/conditions-reservation">Conditions de réservation</a>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, {
  Icon, useHashRoute, go, useDB, Reveal, Photo, Stars, StarInput, avisUrl,
  fireToast, ToastZone, WhatsAppFab, waLink, Header, Footer, NAV
});
