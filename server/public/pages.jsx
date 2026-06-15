/* =========================================================
   BLUE CARAVELLE — Pages publiques
   ========================================================= */

/* ---------- Briques réutilisables ---------- */
function SectionHead({ eyebrow, title, lead, center, light }) {
  return (
    <Reveal className={center ? "center" : ""} style={{ maxWidth: center ? 760 : 720, margin: center ? "0 auto" : 0 }}>
      {eyebrow && <span className={"eyebrow" + (center ? " center" : "")} style={{ fontSize: "15px" }}>{eyebrow}</span>}
      <h2 className="h2" style={{ marginTop: 16, marginBottom: lead ? 16 : 0, color: light ? "#fff" : undefined }}>{title}</h2>
      {lead && <p className="lead" style={{ color: light ? "rgba(255,255,255,.8)" : undefined }}>{lead}</p>}
    </Reveal>);

}

function RoomCard({ r, delay }) {
  return (
    <Reveal delay={delay} className="card">
      <div style={{ position: "relative", aspectRatio: "4/3" }}>
        <Photo src={r.photos[0]} alt={r.nom} zoom label={null} style={{ position: "absolute", inset: 0 }} />
        <div style={{ position: "absolute", top: 14, left: 14, zIndex: 3 }}>
          <span className="badge badge-gold">{r.type}</span>
        </div>
        {!r.disponible &&
        <div style={{ position: "absolute", top: 14, right: 14, zIndex: 3 }}>
            <span className="badge badge-full">Complet</span>
          </div>}
      </div>
      <div className="card-body">
        <h3 className="h3">{r.nom}</h3>
        <div className="chip-row" style={{ margin: "2px 0 4px" }}>
          <span className="chip"><Icon name="users" size={14} style={{ verticalAlign: "-2px", marginRight: 5 }} />{r.capacite} pers.</span>
          {r.equipements.slice(0, 2).map((e, i) => <span className="chip" key={i}>{e}</span>)}
        </div>
        <p className="muted" style={{ fontSize: ".93rem" }}>{r.description.slice(0, 96)}…</p>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingTop: 14 }}>
          <span className="price">{BC.xof(r.prix)}<small> / nuit</small></span>
          <a href={"#/chambre/" + r.id} className="link-arrow">Découvrir <Icon name="arrow" size={16} /></a>
        </div>
      </div>
    </Reveal>);

}

/* ---------- Booking bar (hero) ---------- */
function BkField({ label, children }) {
  return (
    <div className="bk-field">
      <span className="bk-field-label">{label}</span>
      {children}
    </div>
  );
}

function BookingBar() {
  const [arr, setArr] = React.useState("");
  const [dep, setDep] = React.useState("");
  const [pers, setPers] = React.useState("2");
  const href = "#/reservation" + (arr ? "?arrivee=" + arr + (dep ? "&depart=" + dep : "") : "");
  return (
    <div className="bk-bar">
      <div className="wrap">
        <div style={{ display: "flex", alignItems: "stretch", flexWrap: "wrap" }}>
          <BkField label="Arrivée">
            <input type="date" value={arr} onChange={e => setArr(e.target.value)} />
          </BkField>
          <div className="bk-div" />
          <BkField label="Départ">
            <input type="date" value={dep} onChange={e => setDep(e.target.value)} />
          </BkField>
          <div className="bk-div" />
          <BkField label="Personnes">
            <select value={pers} onChange={e => setPers(e.target.value)} style={{ appearance: "none" }}>
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} {n > 1 ? "personnes" : "personne"}</option>)}
            </select>
          </BkField>
          <div className="bk-cta">
            <a href={href} className="btn btn-gold" style={{ whiteSpace: "nowrap" }}>
              Vérifier les disponibilités
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Carte chambre featured (layout horizontal) ---------- */
function FeaturedRoomCard({ r }) {
  return (
    <Reveal className="card featured-room">
      <div className="fr-img">
        <Photo src={r.photos[0]} alt={r.nom} zoom label={null}
          style={{ position: "absolute", inset: 0, height: "100%" }} />
        <div style={{ position: "absolute", top: 18, left: 18, zIndex: 3 }}>
          <span className="badge badge-gold">{r.type}</span>
        </div>
      </div>
      <div className="fr-body">
        <span className="eyebrow" style={{ fontSize: "11px" }}>Suite signature</span>
        <h3 className="h2" style={{ marginTop: 4 }}>{r.nom}</h3>
        <p className="lead" style={{ fontSize: "1rem" }}>{r.description.slice(0, 130)}…</p>
        <div className="chip-row" style={{ margin: "2px 0" }}>
          {r.equipements.slice(0, 3).map((e, i) => <span className="chip" key={i}>{e}</span>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 18, borderTop: "1px solid var(--line)", marginTop: "auto" }}>
          <span className="price" style={{ fontSize: "1.6rem" }}>{BC.xof(r.prix)}<small> / nuit</small></span>
          <a href={"#/chambre/" + r.id} className="btn btn-gold btn-sm">
            Découvrir <Icon name="arrow" size={14} />
          </a>
        </div>
      </div>
    </Reveal>
  );
}

/* ---------- Ambiance hero : photo animée + bruit des vagues ---------- */
/* Bruit de vague synthétisé (Web Audio) — aucun fichier audio requis */
let bcWaveCtx = null;
function playWaves() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  try {
    if (!bcWaveCtx) bcWaveCtx = new Ctx();
    const ctx = bcWaveCtx;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const dur = 4.6;
    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    /* bruit blanc — matière première de la vague */
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    /* couche 1 : le rouleau — grave qui monte, déferle puis se retire */
    const roll = ctx.createBufferSource(); roll.buffer = buf;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(220, now);
    lp.frequency.exponentialRampToValueAtTime(1500, now + 1.5);
    lp.frequency.exponentialRampToValueAtTime(320, now + dur);
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.0001, now);
    g1.gain.exponentialRampToValueAtTime(0.5, now + 1.4);
    g1.gain.exponentialRampToValueAtTime(0.14, now + 2.9);
    g1.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    roll.connect(lp); lp.connect(g1); g1.connect(master);
    roll.start(now); roll.stop(now + dur);
    /* couche 2 : l'écume — souffle aigu au moment du déferlement */
    const foam = ctx.createBufferSource(); foam.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1800; hp.Q.value = 0.5;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, now + 0.6);
    g2.gain.exponentialRampToValueAtTime(0.22, now + 1.7);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    foam.connect(hp); hp.connect(g2); g2.connect(master);
    foam.start(now + 0.6); foam.stop(now + dur);
  } catch (e) { /* audio indisponible : silencieux */ }
}

/* ===================== ACCUEIL ===================== */
function HomePage() {
  const featured = DB.all("rooms").filter((r) => r.mise_en_avant).slice(0, 3);
  const reviews = DB.all("reviews").filter((r) => r.affiche);
  const heroRef = useRef(null);
  useEffect(() => {
    const on = () => {if (heroRef.current) heroRef.current.style.transform = "scale(" + (1 + Math.min(window.scrollY, 600) / 5000) + ") translateY(" + window.scrollY / 6 + "px)";};
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <main>
      {/* HERO — direction 02 « Centré éditorial » · photo animée · bruit des vagues au clic */}
      <section
        onClick={() => playWaves()}
        style={{ position: "relative", height: "100svh", minHeight: 640, overflow: "hidden", color: "#fff" }}>
        {/* Vidéo d'ambiance — vagues en boucle — + parallax. L'image sert d'affiche le temps du chargement. */}
        <div ref={heroRef} style={{ position: "absolute", inset: "-4%", zIndex: 0, willChange: "transform" }}>
          <video
            src="https://res.cloudinary.com/drg6w7z0e/video/upload/q_auto/f_auto/v1781066113/Looping_waves_for_website_backgr__202606100431_quww7i.mp4"
            poster={DB.IMG.heroBeach}
            autoPlay muted loop playsInline preload="auto" aria-hidden="true"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}></video>
        </div>
        {/* Voile symétrique : lisible en haut comme en bas */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(180deg, rgba(8,22,42,.50) 0%, rgba(8,22,42,.30) 45%, rgba(8,22,42,.68) 100%)" }}></div>
        {/* Contenu centré */}
        <div className="wrap" style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <div style={{ maxWidth: 780 }}>
            <span className="eyebrow center heroin" style={{ "--eyebrow-color": "var(--or-clair)", display: "flex", animationDelay: ".1s" }}>
              San Pedro · Côte d'Ivoire
            </span>
            <h1 className="display heroin" style={{ color: "#fff", margin: "26px 0 0", animationDelay: ".22s" }}>
              L'océan pour<br /><em style={{ fontWeight: 400, color: "var(--or-clair)" }}>seul horizon</em>
            </h1>
            <p className="lead heroin" style={{ color: "rgba(255,255,255,.88)", maxWidth: 520, margin: "28px auto 38px", animationDelay: ".36s" }}>
              Un refuge balnéaire premium sur le littoral ivoirien. Chambres face au large,
              table raffinée, expériences sur mesure.
            </p>
            <a href="#/reservation" className="btn btn-light heroin" style={{ padding: "18px 44px", animationDelay: ".5s" }}>Réserver votre séjour</a>
          </div>
        </div>
        {/* Coin gauche : ambiance sonore (le clic remonte jusqu'au hero) */}
        <button type="button" className="hero-sound heroin" style={{ animationDelay: ".64s" }} aria-label="Écouter le bruit des vagues">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 10c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"></path>
            <path d="M2 16c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"></path>
          </svg>
          Bruit des vagues
        </button>
        {/* Coin droit : preuve sociale */}
        <div className="heroin" style={{ position: "absolute", bottom: 34, right: "var(--gut)", zIndex: 3, fontFamily: "var(--sans)", fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(255,255,255,.6)", display: "flex", alignItems: "center", gap: 8, animationDelay: ".64s" }}>
          <span style={{ color: "var(--or-clair)", letterSpacing: "0" }}>★★★★★</span> 4.9 · avis vérifiés
        </div>
        {/* Indicateur de scroll */}
        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "rgba(255,255,255,.6)" }}>
          <span className="scroll-mouse"></span>
        </div>

      </section>

      {/* PROMESSE */}
      <section className="section">
        <div className="wrap grid cols-2" style={{ alignItems: "center", gap: "clamp(30px,5vw,72px)" }}>
          <Reveal>
            <span className="eyebrow">La promesse Blue Caravelle</span>
            <h2 className="h2" style={{ margin: "16px 0 18px" }}>Le luxe discret d'une maison face à la mer</h2>
            <p className="lead" style={{ marginBottom: 18 }}>
              Né de la passion d'un littoral encore préservé, Blue Caravelle conjugue le confort des grands hôtels
              et la chaleur de l'hospitalité ivoirienne.
            </p>
            <p className="muted" style={{ marginBottom: 26 }}>
              Architecture épurée, matériaux nobles, lumière de l'Atlantique : chaque détail est pensé pour
              le repos des sens. Ici, le temps ralentit au rythme des vagues.
            </p>
            <div className="grid cols-3" style={{ gap: 18 }}>
              {[["28", "Chambres & suites"], ["120", "Mètres de plage privée"], ["4.9", "Note moyenne des avis"]].map((s, i) =>
              <div className="stat" key={i}><div className="n">{s[0]}</div><div className="l">{s[1]}</div></div>)}
            </div>
          </Reveal>
          <Reveal delay={2} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Photo src={DB.IMG.ext1} alt="Terrasse" zoom style={{ aspectRatio: "3/4", borderRadius: "var(--r-lg)", gridRow: "span 2" }} />
            <Photo src={DB.IMG.pool} alt="Piscine" zoom style={{ aspectRatio: "1/1", borderRadius: "var(--r-lg)" }} />
            <Photo src={DB.IMG.food1} alt="Gastronomie" zoom style={{ aspectRatio: "1/1", borderRadius: "var(--r-lg)" }} />
          </Reveal>
        </div>
      </section>

      {/* CHAMBRES MISES EN AVANT */}
      <section className="section bg-sable">
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 48 }}>
            <SectionHead eyebrow="Chambres & suites" title="Nos plus belles adresses" />
            <Reveal delay={1}><a href="#/chambres" className="link-arrow">Toutes les chambres <Icon name="arrow" size={16} /></a></Reveal>
          </div>
          {featured.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(18px,2.4vw,28px)" }}>
              <FeaturedRoomCard r={featured[0]} />
              {featured.length > 1 && (
                <div className="grid cols-2">
                  {featured.slice(1).map((r, i) => <RoomCard key={r.id} r={r} delay={i + 1} />)}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* RESTAURANT */}
      <section className="section" style={{ background: "var(--marine)", color: "var(--sable)", overflow: "hidden" }}>
        <div className="wrap grid cols-2" style={{ alignItems: "center", gap: "clamp(30px,5vw,72px)" }}>
          <Reveal style={{ order: 1 }}>
            <Photo src={DB.IMG.restaurant} alt="Restaurant Le Sextant" zoom style={{ aspectRatio: "4/3", borderRadius: "var(--r-lg)" }} />
          </Reveal>
          <Reveal delay={1}>
            <span className="eyebrow" style={{ fontSize: "15px" }}>Le Sextant · Restaurant</span>
            <h2 className="h2" style={{ color: "#fff", margin: "16px 0 18px" }}>Une cuisine de la mer, entre racines et grand large</h2>
            <p style={{ color: "rgba(255,255,255,.82)", marginBottom: 18, fontSize: "1.08rem", lineHeight: 1.7 }}>
              Notre chef sublime la pêche du jour et les produits du terroir ivoirien dans une carte
              qui voyage de Sassandra à la Méditerranée. Le tout, les pieds presque dans le sable.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "grid", gap: 12 }}>
              {["Poisson braisé & grillades au feu de bois", "Fruits de mer et spécialités ivoiriennes", "Bar · Lounge face au coucher de soleil"].map((t, i) =>
              <li key={i} style={{ display: "flex", gap: 12, alignItems: "center", color: "rgba(255,255,255,.9)" }}>
                  <span style={{ color: "var(--or-clair)" }}><Icon name="check" size={20} stroke={2} /></span>{t}
                </li>)}
            </ul>
            <a href="#/restaurant" className="btn btn-gold">Découvrir la carte</a>
          </Reveal>
        </div>
      </section>

      {/* EXPERIENCES */}
      <section className="section">
        <div className="wrap">
          <SectionHead center eyebrow="Expériences & activités" title="Au-delà de la chambre, des souvenirs"
          lead="Sorties en mer, plage privée, excursions nature et bien-être : composez un séjour à votre image." />
          <div className="grid cols-3" style={{ marginTop: 48 }}>
            {DB.all("experiences").slice(0, 3).map((e, i) => <ExperienceCard key={e.id} e={e} delay={i % 3 + 1} />)}
          </div>
          <Reveal className="center" style={{ marginTop: 40 }}>
            <a href="#/experiences" className="btn btn-outline">Toutes les expériences <Icon name="arrow" size={16} /></a>
          </Reveal>
        </div>
      </section>

      {/* QUOTE BAND */}
      <QuoteBand />

      {/* AVIS */}
      <section className="section bg-sable">
        <div className="wrap">
          <SectionHead center eyebrow="Ils ont séjourné chez nous" title="La parole à nos hôtes" />
          <div className="grid cols-3" style={{ marginTop: 48 }}>
            {reviews.map((a, i) =>
            <Reveal key={a.id} delay={i % 3 + 1} className="card" style={{ padding: "30px 28px" }}>
                <Stars note={a.note} />
                <p className="serif-it" style={{ fontSize: "1.18rem", color: "var(--marine)", lineHeight: 1.5, margin: "16px 0 20px" }}>« {a.commentaire} »</p>
                <strong style={{ color: "var(--anthracite)", marginTop: "auto" }}>{a.nom_client}</strong>
              </Reveal>
            )}
          </div>
          <Reveal className="center" style={{ marginTop: 44 }}>
            <a href="#/avis" className="btn btn-outline"><Icon name="star" size={17} fill="currentColor" /> Donner mon avis</a>
          </Reveal>
        </div>
      </section>

      {/* CARTE + CTA */}
      <section className="section">
        <div className="wrap grid cols-2" style={{ gap: "clamp(28px,4vw,56px)", alignItems: "center" }}>
          <Reveal>
            <span className="eyebrow">Nous trouver</span>
            <h2 className="h2" style={{ margin: "16px 0 16px" }}>Au cœur du littoral de San Pedro</h2>
            <p className="muted" style={{ marginBottom: 24 }}>{BC.ADDRESS}</p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <a href="#/reservation" className="btn btn-primary">Réserver</a>
              <a href={waLink()} target="_blank" rel="noopener" className="btn btn-wa"><Icon name="wa" size={18} fill="currentColor" /> WhatsApp</a>
            </div>
          </Reveal>
          <Reveal delay={1}>
            <MapEmbed />
          </Reveal>
        </div>
      </section>
    </main>);

}

function MapEmbed() {
  return (
    <iframe className="map-embed" title="Carte San Pedro" loading="lazy"
    referrerPolicy="no-referrer-when-downgrade"
    src="https://www.google.com/maps?q=San+Pedro+Cote+d'Ivoire+bord+de+mer&output=embed"></iframe>);

}

/* ===================== À PROPOS ===================== */
function AboutPage() {
  return (
    <main>
      <PageHero img={DB.IMG.about} eyebrow="Notre maison" title="L'âme d'un littoral, l'élégance d'un refuge"
      sub="Depuis sa rénovation, Blue Caravelle réinvente l'hospitalité balnéaire à San Pedro." />
      <section className="section">
        <div className="wrap grid cols-2" style={{ gap: "clamp(30px,5vw,72px)", alignItems: "center" }}>
          <Reveal>
            <span className="eyebrow">Notre histoire</span>
            <h2 className="h2" style={{ margin: "16px 0 18px" }}>Né d'une rencontre avec l'océan</h2>
            <p className="lead" style={{ marginBottom: 16 }}>
              Ancienne demeure de bord de mer entièrement repensée en 2023, Blue Caravelle est le fruit
              d'une rénovation respectueuse, menée par des artisans locaux.
            </p>
            <p className="muted" style={{ marginBottom: 14 }}>
              Nous avons voulu un lieu qui respire San Pedro : la lumière de l'Atlantique, la générosité de la
              cuisine ivoirienne, la douceur du sable. Un hôtel où le luxe se vit sans ostentation.
            </p>
            <p className="muted">
              Aujourd'hui, notre équipe perpétue cette promesse au quotidien : celle d'un accueil sincère,
              attentif, et profondément ancré dans son territoire.
            </p>
          </Reveal>
          <Reveal delay={1}>
            <Photo src={DB.IMG.ext2} alt="Les jardins" zoom style={{ aspectRatio: "4/5", borderRadius: "var(--r-lg)" }} />
          </Reveal>
        </div>
      </section>
      <section className="section bg-sable">
        <div className="wrap">
          <SectionHead center eyebrow="Nos valeurs" title="Ce qui nous anime" />
          <div className="grid cols-3" style={{ marginTop: 48 }}>
            {[
            ["sun", "L'art de recevoir", "Une hospitalité chaleureuse et sur mesure, où chaque hôte est unique."],
            ["waves", "Ancrage local", "Produits, savoir-faire et talents de San Pedro et de la Côte d'Ivoire."],
            ["sparkle", "Élégance durable", "Un luxe sobre et responsable, respectueux du littoral qui nous accueille."]].
            map((v, i) =>
            <Reveal key={i} delay={i % 3 + 1} className="card" style={{ padding: "32px 28px" }}>
                <span className="ic" style={{ width: 54, height: 54, borderRadius: 14, display: "grid", placeItems: "center", background: "var(--or-soft)", color: "var(--or)" }}>
                  <Icon name={v[0]} size={26} />
                </span>
                <h3 className="h3" style={{ margin: "18px 0 8px" }}>{v[1]}</h3>
                <p className="muted">{v[2]}</p>
              </Reveal>
            )}
          </div>
        </div>
      </section>
      <CTAband />
    </main>);

}

/* ===================== CHAMBRES ===================== */
function RoomsPage() {
  useDB();
  const [type, setType] = useState("Toutes");
  const [animKey, setAnimKey] = useState(0);
  const rooms = DB.all("rooms");
  const types = ["Toutes", "Standard", "Supérieure", "Suite"];
  const list = type === "Toutes" ? rooms : rooms.filter((r) => r.type === type);
  const setFilter = (t) => { setType(t); setAnimKey(k => k + 1); };
  return (
    <main>
      <PageHero img={DB.IMG.suite} eyebrow="Chambres & suites" title="Des nuits face à l'Atlantique"
      sub="Six adresses singulières, du raffinement essentiel à la suite d'exception." />
      <section className="section">
        <div className="wrap">
          <div className="rooms-filter-bar">
            {types.map((t) => (
              <button key={t} className={"rfb-btn" + (type === t ? " active" : "")} onClick={() => setFilter(t)}>
                {t}
                {type === t && <span className="rfb-pill">{list.length}</span>}
              </button>
            ))}
          </div>
          <div key={animKey} className="grid cols-3 rooms-filtered">
            {list.map((r, i) => <RoomCard key={r.id} r={r} delay={i % 3 + 1} />)}
          </div>
          {list.length === 0 && (
            <div className="empty-note" style={{ margin: "40px auto", maxWidth: 400 }}>
              Aucune chambre de cette catégorie disponible pour le moment.
            </div>
          )}
        </div>
      </section>
      <CTAband />
    </main>
  );
}

function RoomDetailPage({ id }) {
  useDB();
  const r = DB.find("rooms", id);
  const [active, setActive] = useState(0);
  if (!r) return <NotFound />;
  return (
    <main>
      <div style={{ height: 84 }}></div>
      <section className="section tight">
        <div className="wrap">
          <Reveal><a href="#/chambres" className="link-arrow" style={{ marginBottom: 22 }}><Icon name="arrowL" size={16} /> Retour aux chambres</a></Reveal>
          <div className="grid cols-2" style={{ gap: "clamp(28px,4vw,56px)", alignItems: "flex-start", marginTop: 18 }}>
            <Reveal>
              <Photo src={r.photos[active]} alt={r.nom} style={{ aspectRatio: "4/3", borderRadius: "var(--r-lg)" }} />
              {r.photos.length > 1 &&
              <div className="chip-row" style={{ marginTop: 14, gap: 12 }}>
                  {r.photos.map((p, i) =>
                <button key={i} onClick={() => setActive(i)} style={{ padding: 0, border: "2px solid " + (i === active ? "var(--ocean)" : "transparent"), borderRadius: 12, overflow: "hidden", background: "none", flex: "1 1 0", maxWidth: 120 }}>
                      <Photo src={p} alt="" style={{ aspectRatio: "4/3" }} />
                    </button>
                )}
                </div>}
            </Reveal>
            <Reveal delay={1}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                <span className="badge badge-gold">{r.type}</span>
                {!r.disponible && <span className="badge badge-full">Complet</span>}
              </div>
              <h1 className="h1" style={{ marginBottom: 10 }}>{r.nom}</h1>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 20 }}>
                <span className="price" style={{ fontSize: "1.7rem" }}>{BC.xof(r.prix)}<small> / nuit</small></span>
                <span className="muted" style={{ fontSize: ".92rem" }}><Icon name="users" size={15} style={{ verticalAlign: "-2px" }} /> Jusqu'à {r.capacite} personnes</span>
              </div>
              <p className="lead" style={{ marginBottom: 24 }}>{r.description}</p>
              <h4 style={{ fontFamily: "var(--sans)", fontSize: ".82rem", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--or)", marginBottom: 14 }}>Équipements</h4>
              <div className="chip-row" style={{ marginBottom: 30 }}>
                {r.equipements.map((e, i) => <span className="chip" key={i}><Icon name="check" size={13} style={{ verticalAlign: "-1px", marginRight: 5, color: "var(--ocean)" }} />{e}</span>)}
              </div>
              {r.disponible ?
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <a href={"#/reservation?chambre=" + encodeURIComponent(r.nom)} className="btn btn-gold">Demander cette chambre</a>
                  <a href={waLink("Bonjour, je souhaite des informations sur la chambre « " + r.nom + " ».")} target="_blank" rel="noopener" className="btn btn-outline"><Icon name="wa" size={18} /> WhatsApp</a>
                </div> :

              <div className="empty-note" style={{ textAlign: "left", padding: 22 }}>
                  Cette chambre est actuellement <strong>complète</strong>. Contactez-nous pour connaître les prochaines disponibilités ou découvrir une chambre similaire.
                  <div style={{ marginTop: 14 }}><a href={waLink("Bonjour, la chambre « " + r.nom + " » est complète. Pouvez-vous m'indiquer les prochaines disponibilités ?")} target="_blank" rel="noopener" className="btn btn-wa btn-sm"><Icon name="wa" size={16} /> Nous écrire</a></div>
                </div>
              }
            </Reveal>
          </div>
        </div>
      </section>
    </main>);

}

/* ===================== RESTAURANT ===================== */
function RestaurantPage() {
  useDB();
  const dishes = DB.all("dishes");
  const cats = [
    ["Signature", "Les Signatures Blue Caravelle"],
    ["Entrée", "Entrées"],
    ["Kedjenou", "Plats principaux — Kedjenou"],
    ["Sauce", "Sauces"],
    ["Accompagnement", "Accompagnements"],
    ["Grillade", "Grillades"],
    ["Dessert", "Desserts"],
    ["Boisson", "Boissons"],
  ];
  return (
    <main>
      <PageHero img={DB.IMG.dining} eyebrow="Le Sextant · Restaurant — Bar — Lounge" title="La table de Blue Caravelle"
      sub="L'exception au bord de la mer — saveurs ivoiriennes et accents du grand large, face au coucher de soleil." />
      <section className="section">
        <div className="wrap grid cols-2" style={{ gap: "clamp(30px,5vw,72px)", alignItems: "center" }}>
          <Reveal>
            <span className="eyebrow">L'ambiance</span>
            <h2 className="h2" style={{ margin: "16px 0 16px" }}>Une cuisine généreuse, une vue infinie</h2>
            <p className="lead" style={{ marginBottom: 16 }}>
              Le Sextant marie les produits du terroir ivoirien aux techniques de la grande cuisine.
              Poissons de ligne, épices locales, fruits gorgés de soleil.
            </p>
            <p className="muted" style={{ marginBottom: 24 }}>
              Déjeuner les pieds dans le sable, dîner aux chandelles ou simple cocktail au bar :
              chaque moment a sa table.
            </p>
            <div className="grid cols-2" style={{ gap: 18 }}>
              <div className="feature"><span className="ic"><Icon name="clock" size={22} /></span><div><strong style={{ color: "var(--marine)" }}>Horaires</strong><div className="muted" style={{ fontSize: ".9rem" }}>Petit-déj. 7h–10h30<br />Déjeuner 12h–15h<br />Dîner 19h–22h30</div></div></div>
              <div className="feature"><span className="ic"><Icon name="utensils" size={22} /></span><div><strong style={{ color: "var(--marine)" }}>Réserver une table</strong><div className="muted" style={{ fontSize: ".9rem" }}>Sur place ou par WhatsApp, 7j/7.</div></div></div>
            </div>
            <a href={waLink("Bonjour, je souhaite réserver une table au restaurant Le Sextant.")} target="_blank" rel="noopener" className="btn btn-gold" style={{ marginTop: 28 }}><Icon name="wa" size={18} fill="currentColor" /> Réserver une table</a>
          </Reveal>
          <Reveal delay={1} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Photo src={(window.__resources||{}).poissonGrille||"assets/poisson_entier_grille.png"} alt="Poisson entier grillé" zoom style={{ aspectRatio: "3/4", borderRadius: "var(--r-lg)", gridRow: "span 2" }} />
            <Photo src={(window.__resources||{}).mixGrill||"assets/mix_grill.png"} alt="Mix grill" zoom style={{ aspectRatio: "1/1", borderRadius: "var(--r-lg)" }} />
            <Photo src={(window.__resources||{}).risottoFruitsMer||"assets/risotto_fruits_mer.png"} alt="Risotto aux fruits de mer" zoom style={{ aspectRatio: "1/1", borderRadius: "var(--r-lg)" }} />
          </Reveal>
        </div>
      </section>
      <section className="section bg-sable">
        <div className="wrap" style={{ maxWidth: 880 }}>
          <SectionHead center eyebrow="La carte" title="Une sélection de saison" />
          <div style={{ marginTop: 44 }}>
            {cats.map(([key, label]) => {
              const items = dishes.filter((d) => d.categorie === key);
              if (!items.length) return null;
              return (
                <Reveal key={key} style={{ marginBottom: 50 }}>
                  <h3 className="h3" style={{ color: "var(--or)", textAlign: "center", marginBottom: 26 }}>{label}</h3>
                  <div style={{ maxWidth: 720, margin: "0 auto" }}>
                    {items.map((d) =>
                    <div className="menu-line" key={d.id}>
                        <div className="ml-head">
                          <span className="ml-name">{d.nom}</span>
                          <span className="ml-dots" aria-hidden="true" />
                          <span className="ml-price">{d.prix_txt ? d.prix_txt : (d.prix ? BC.xof(d.prix) : "")}</span>
                        </div>
                        {d.description && <div className="ml-desc">{d.description}</div>}
                      </div>
                    )}
                  </div>
                </Reveal>);

            })}
          </div>
        </div>
      </section>
    </main>);

}

/* ===================== GALERIE ===================== */
function GalleryPage() {
  useDB();
  const [cat, setCat] = useState("Tout");
  const [light, setLight] = useState(null);
  const photos = DB.all("gallery");
  const cats = ["Tout", "Chambres", "Restaurant", "Extérieurs", "Plage", "Événements"];
  const list = cat === "Tout" ? photos : photos.filter((p) => p.categorie === cat);
  return (
    <main>
      <PageHero img={DB.IMG.beach} eyebrow="Galerie" title="Un avant-goût du séjour"
      sub="Chambres, table, plage et instants d'exception." />
      <section className="section">
        <div className="wrap">
          <Reveal className="chip-row" style={{ justifyContent: "center", marginBottom: 40 }}>
            {cats.map((c) =>
            <button key={c} className="btn btn-sm" onClick={() => setCat(c)}
            style={{ background: cat === c ? "var(--marine)" : "#fff", color: cat === c ? "#fff" : "var(--marine)", border: "1.5px solid " + (cat === c ? "var(--marine)" : "var(--line)") }}>{c}</button>
            )}
          </Reveal>
          <div style={{ columnCount: 3, columnGap: 18 }} className="masonry">
            {list.map((p, i) =>
            <Reveal key={p.id} delay={i % 3 + 1} style={{ breakInside: "avoid", marginBottom: 18 }}>
                <button onClick={() => setLight(p)} style={{ padding: 0, border: 0, background: "none", width: "100%", cursor: "zoom-in", borderRadius: "var(--r-lg)", overflow: "hidden", display: "block" }}>
                  <Photo src={p.image} alt={p.legende} zoom label={p.legende} style={{ aspectRatio: i % 3 === 1 ? "3/4" : "4/3" }} />
                </button>
              </Reveal>
            )}
          </div>
        </div>
      </section>
      {light &&
      <div onClick={() => setLight(null)} style={{ position: "fixed", inset: 0, background: "rgba(8,20,38,.92)", zIndex: 300, display: "grid", placeItems: "center", padding: 24, cursor: "zoom-out" }}>
          <div style={{ maxWidth: 1000, width: "100%" }}>
            <Photo src={light.image} alt={light.legende} eager style={{ borderRadius: "var(--r-lg)", maxHeight: "78vh" }} />
            <p className="serif-it" style={{ color: "#fff", textAlign: "center", marginTop: 16, fontSize: "1.2rem" }}>{light.legende}</p>
          </div>
        </div>}
    </main>);

}

/* ===================== EXPERIENCES ===================== */
function ExperienceCard({ e, delay }) {
  return (
    <Reveal delay={delay} className="card">
      <Photo src={e.image} alt={e.titre} zoom style={{ aspectRatio: "4/3" }} />
      <div className="card-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="badge badge-ocean">{e.categorie}</span>
          <span className="muted" style={{ fontSize: ".84rem" }}><Icon name="clock" size={14} style={{ verticalAlign: "-2px" }} /> {e.duree}</span>
        </div>
        <h3 className="h3" style={{ marginTop: 6 }}>{e.titre}</h3>
        <p className="muted" style={{ fontSize: ".93rem" }}>{e.description}</p>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14 }}>
          <span className="price" style={{ fontSize: "1.15rem" }}>{e.tarif ? "dès " + BC.xof(e.tarif) : "Sur demande"}</span>
          <a href={waLink("Bonjour, je suis intéressé(e) par l'expérience « " + e.titre + " ».")} target="_blank" rel="noopener" className="link-arrow">Réserver <Icon name="arrow" size={16} /></a>
        </div>
      </div>
    </Reveal>);

}
function ExperiencesPage() {
  useDB();
  return (
    <main>
      <PageHero img={DB.IMG.boat} eyebrow="Expériences & activités" title="Le large, à votre rythme"
      sub="Sorties en mer, plage privée, excursions et bien-être : votre séjour prend vie." />
      <section className="section">
        <div className="wrap">
          <div className="grid cols-3">
            {DB.all("experiences").map((e, i) => <ExperienceCard key={e.id} e={e} delay={i % 3 + 1} />)}
          </div>
        </div>
      </section>
      <CTAband />
    </main>);

}

/* ===================== RÉSERVATION ===================== */
function ReservationPage({ params }) {
  useDB();
  const prefill = params.get("chambre") || "";
  const available = DB.all("rooms").filter((r) => r.disponible);
  const empty = { nom_complet: "", email: "", telephone_whatsapp: "", type_chambre: prefill, date_arrivee: "", date_depart: "", nombre_personnes: 2, message: "", consent: false };
  const [f, setF] = useState(empty);
  const [errs, setErrs] = useState({});
  const [last, setLast] = useState(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  useEffect(() => {setF((s) => ({ ...s, type_chambre: prefill || s.type_chambre }));}, [prefill]);
  useEffect(() => {setPhotoIdx(0);}, [f.type_chambre]);
  const selRoom = DB.all("rooms").find((r) => r.nom === f.type_chambre);
  const selPhotos = selRoom ? (selRoom.photos || []).filter(Boolean) : [];
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const validate = () => {
    const er = {};
    if (!f.nom_complet.trim()) er.nom_complet = "Votre nom est requis.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) er.email = "E-mail invalide.";
    if (f.telephone_whatsapp.replace(/\D/g, "").length < 8) er.telephone_whatsapp = "Numéro invalide.";
    if (!f.date_arrivee) er.date_arrivee = "Date requise.";
    if (!f.date_depart) er.date_depart = "Date requise.";
    if (f.date_arrivee && f.date_depart && f.date_depart <= f.date_arrivee) er.date_depart = "Le départ doit suivre l'arrivée.";
    if (!f.consent) er.consent = "Veuillez accepter la politique de confidentialité.";
    setErrs(er);return Object.keys(er).length === 0;
  };
  const submit = (e) => {
    e.preventDefault();
    if (!validate()) {fireToast({ title: "Formulaire incomplet", msg: "Merci de corriger les champs en rouge.", duration: 4500 });return;}
    const rec = Object.assign({}, f, { nombre_personnes: Number(f.nombre_personnes), statut: "Nouvelle", lu: false, source: "Direct (site)", date_creation: Date.now() });
    DB.insert("reservations", rec);
    // notification e-mail admin (simulée)
    console.info("[E-mail admin simulé] Nouvelle demande de réservation de " + rec.nom_complet);
    fireToast({ title: "Demande envoyée", msg: "Votre demande de réservation a bien été envoyée. Notre équipe vous recontacte sous 24 h." });
    setLast(rec);
    setF(empty);setErrs({});
  };
  const waFinalize = () => {
    const r = last;if (!r) return "";
    const msg = "Bonjour, je viens d'envoyer une demande de réservation :\n" +
    "• Nom : " + r.nom_complet + "\n• Chambre : " + (r.type_chambre || "à définir") +
    "\n• Arrivée : " + BC.dateShort(r.date_arrivee) + "\n• Départ : " + BC.dateShort(r.date_depart) +
    "\n• Personnes : " + r.nombre_personnes + (r.message ? "\n• Message : " + r.message : "");
    return waLink(msg);
  };
  return (
    <main>
      <div style={{ height: 84 }}></div>
      <section className="section tight">
        <div className="wrap" style={{ maxWidth: 920 }}>
          <SectionHead center eyebrow="Réservation" title="Demande de séjour"
          lead="Indiquez vos dates et préférences : notre équipe vous répond sous 24 h pour confirmer la disponibilité." />
          <div className="grid cols-2" style={{ marginTop: 44, gap: "clamp(28px,4vw,52px)", alignItems: "flex-start" }}>
            <Reveal className="card" style={{ padding: "clamp(24px,3vw,38px)" }}>
              <form onSubmit={submit} noValidate>
                <div className={"field" + (errs.nom_complet ? " err" : "")}>
                  <label>Nom complet <span className="req">*</span></label>
                  <input value={f.nom_complet} onChange={set("nom_complet")} placeholder="Ex. Awa Koné" />
                  {errs.nom_complet && <span className="hint">{errs.nom_complet}</span>}
                </div>
                <div className="row-2">
                  <div className={"field" + (errs.email ? " err" : "")}>
                    <label>E-mail <span className="req">*</span></label>
                    <input type="email" value={f.email} onChange={set("email")} placeholder="vous@email.com" />
                    {errs.email && <span className="hint">{errs.email}</span>}
                  </div>
                  <div className={"field" + (errs.telephone_whatsapp ? " err" : "")}>
                    <label>Téléphone / WhatsApp <span className="req">*</span></label>
                    <input value={f.telephone_whatsapp} onChange={set("telephone_whatsapp")} placeholder="+225 07 00 00 00 00" />
                    {errs.telephone_whatsapp && <span className="hint">{errs.telephone_whatsapp}</span>}
                  </div>
                </div>
                <div className="field">
                  <label>Type de chambre</label>
                  <select value={f.type_chambre} onChange={set("type_chambre")}>
                    <option value="">Sans préférence</option>
                    {available.map((r) => <option key={r.id} value={r.nom}>{r.nom} — {r.type} ({BC.xof(r.prix)})</option>)}
                  </select>
                </div>
                <div className="row-2">
                  <div className={"field" + (errs.date_arrivee ? " err" : "")}>
                    <label>Arrivée <span className="req">*</span></label>
                    <input type="date" value={f.date_arrivee} onChange={set("date_arrivee")} />
                    {errs.date_arrivee && <span className="hint">{errs.date_arrivee}</span>}
                  </div>
                  <div className={"field" + (errs.date_depart ? " err" : "")}>
                    <label>Départ <span className="req">*</span></label>
                    <input type="date" value={f.date_depart} onChange={set("date_depart")} />
                    {errs.date_depart && <span className="hint">{errs.date_depart}</span>}
                  </div>
                </div>
                <div className="field">
                  <label>Nombre de personnes</label>
                  <select value={f.nombre_personnes} onChange={set("nombre_personnes")}>
                    {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} {n > 1 ? "personnes" : "personne"}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Message (optionnel)</label>
                  <textarea value={f.message} onChange={set("message")} placeholder="Occasion spéciale, demandes particulières…"></textarea>
                </div>
                <div className={"field" + (errs.consent ? " err" : "")}>
                  <label className="consent-label">
                    <input type="checkbox" checked={f.consent} onChange={e => setF(s => ({...s, consent: e.target.checked}))} />
                    <span>J'accepte que les informations transmises soient utilisées par l'hôtel Blue Caravelle pour traiter ma demande, conformément à la <a href="#/politique-confidentialite">Politique de confidentialité</a>.</span>
                  </label>
                  {errs.consent && <span className="hint">{errs.consent}</span>}
                </div>
                <button type="submit" className="btn btn-gold btn-block">Envoyer ma demande</button>
                {last &&
                <a href={waFinalize()} target="_blank" rel="noopener" className="btn btn-wa btn-block" style={{ marginTop: 12 }}>
                    <Icon name="wa" size={18} fill="currentColor" /> Finaliser sur WhatsApp
                  </a>}
              </form>
            </Reveal>
            <Reveal delay={1}>
              {selRoom && selPhotos.length > 0 ? (
                <div className="card" style={{ marginBottom: 22, overflow: "hidden" }}>
                  <Photo key={selRoom.id + "-" + photoIdx} src={selPhotos[Math.min(photoIdx, selPhotos.length - 1)]} alt={selRoom.nom} eager style={{ aspectRatio: "4/3" }} />
                  {selPhotos.length > 1 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(" + selPhotos.length + ", 1fr)", gap: 8, padding: "10px 14px 0" }}>
                      {selPhotos.map((p, i) => (
                        <button type="button" key={i} onClick={() => setPhotoIdx(i)} aria-label={"Photo " + (i + 1) + " — " + selRoom.nom}
                          style={{ padding: 0, background: "none", cursor: "pointer", borderRadius: 8, overflow: "hidden", border: i === photoIdx ? "2px solid var(--or)" : "2px solid transparent", opacity: i === photoIdx ? 1 : .65, transition: "opacity .25s, border-color .25s" }}>
                          <Photo src={p} alt="" eager style={{ aspectRatio: "4/3", borderRadius: 6 }} />
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{ padding: "16px 20px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                      <h3 className="h3" style={{ margin: 0 }}>{selRoom.nom}</h3>
                      <span className="price" style={{ fontSize: "1.3rem" }}>{BC.xof(selRoom.prix)}<small> / nuit</small></span>
                    </div>
                    <p className="muted" style={{ fontSize: ".9rem", marginTop: 6 }}>
                      {selRoom.type} · jusqu'à {selRoom.capacite} {selRoom.capacite > 1 ? "personnes" : "personne"}
                    </p>
                  </div>
                </div>
              ) : (
                <Photo src={DB.IMG.room2} alt="Suite" style={{ aspectRatio: "4/5", borderRadius: "var(--r-lg)", marginBottom: 22 }} />
              )}
              <div className="card" style={{ padding: "24px 26px", boxShadow: "none", border: "1px solid var(--line)" }}>
                <h3 className="h3" style={{ marginBottom: 12 }}>Besoin d'une réponse immédiate ?</h3>
                <p className="muted" style={{ marginBottom: 18, fontSize: ".94rem" }}>Notre conciergerie répond 7j/7 sur WhatsApp pour organiser votre séjour.</p>
                <a href={waLink()} target="_blank" rel="noopener" className="btn btn-wa btn-block"><Icon name="wa" size={18} fill="currentColor" /> Écrire sur WhatsApp</a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </main>);

}

/* ===================== CONTACT ===================== */
function ContactPage() {
  const empty = { nom: "", email: "", telephone: "", sujet: "", message: "", consent: false };
  const [f, setF] = useState(empty);
  const [errs, setErrs] = useState({});
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (!f.nom.trim()) er.nom = "Votre nom est requis.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) er.email = "E-mail invalide.";
    if (!f.message.trim()) er.message = "Votre message est requis.";
    if (!f.consent) er.consent = "Veuillez accepter la politique de confidentialité.";
    setErrs(er);
    if (Object.keys(er).length) {fireToast({ title: "Formulaire incomplet", msg: "Merci de corriger les champs en rouge.", duration: 4500 });return;}
    DB.insert("messages", Object.assign({}, f, { lu: false, date_creation: Date.now() }));
    console.info("[E-mail admin simulé] Nouveau message de contact de " + f.nom);
    fireToast({ title: "Message envoyé", msg: "Votre message a bien été envoyé. Notre équipe vous recontacte sous 24 h." });
    setF(empty);setErrs({});
  };
  return (
    <main>
      <PageHero img={DB.IMG.ext1} eyebrow="Contact" title="Parlons de votre séjour"
      sub="Une question, un projet, un événement ? Notre équipe est à votre écoute." />
      <section className="section">
        <div className="wrap grid cols-2" style={{ gap: "clamp(28px,4vw,56px)", alignItems: "flex-start" }}>
          <Reveal>
            <span className="eyebrow">Coordonnées</span>
            <h2 className="h2" style={{ margin: "16px 0 22px" }}>Hôtel Blue Caravelle</h2>
            <div className="f-contact" style={{ gap: 18, marginBottom: 26 }}>
              <div className="ci" style={{ alignItems: "flex-start" }}><span style={{ color: "var(--ocean)" }}><Icon name="pin" size={20} /></span><span>{BC.ADDRESS}</span></div>
              <div className="ci"><span style={{ color: "var(--ocean)" }}><Icon name="phone" size={20} /></span><a href={"tel:" + BC.PHONE.replace(/\s/g, "")} style={{ color: "var(--anthracite)" }}>{BC.PHONE}</a></div>
              <div className="ci"><span style={{ color: "var(--ocean)" }}><Icon name="wa" size={20} fill="currentColor" /></span><a href={waLink()} target="_blank" rel="noopener" style={{ color: "var(--anthracite)" }}>{BC.WHATSAPP_DISPLAY}</a></div>
              <div className="ci"><span style={{ color: "var(--ocean)" }}><Icon name="mail" size={20} /></span><a href={"mailto:" + BC.EMAIL} style={{ color: "var(--anthracite)" }}>{BC.EMAIL}</a></div>
            </div>
            <div className="socials" style={{ marginBottom: 26 }}>
              <a href="https://facebook.com" target="_blank" rel="noopener" aria-label="Facebook" style={{ borderColor: "var(--line)", color: "var(--marine)" }}><Icon name="fb" size={18} /></a>
              <a href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram" style={{ borderColor: "var(--line)", color: "var(--marine)" }}><Icon name="ig" size={18} /></a>
              <a href="https://tiktok.com" target="_blank" rel="noopener" aria-label="TikTok" style={{ borderColor: "var(--line)", color: "var(--marine)" }}><Icon name="tiktok" size={18} /></a>
            </div>
            <MapEmbed />
          </Reveal>
          <Reveal delay={1} className="card" style={{ padding: "clamp(24px,3vw,38px)" }}>
            <form onSubmit={submit} noValidate>
              <div className={"field" + (errs.nom ? " err" : "")}>
                <label>Nom <span className="req">*</span></label>
                <input value={f.nom} onChange={set("nom")} placeholder="Votre nom" />
                {errs.nom && <span className="hint">{errs.nom}</span>}
              </div>
              <div className="row-2">
                <div className={"field" + (errs.email ? " err" : "")}>
                  <label>E-mail <span className="req">*</span></label>
                  <input type="email" value={f.email} onChange={set("email")} placeholder="vous@email.com" />
                  {errs.email && <span className="hint">{errs.email}</span>}
                </div>
                <div className="field">
                  <label>Téléphone</label>
                  <input value={f.telephone} onChange={set("telephone")} placeholder="+225 …" />
                </div>
              </div>
              <div className="field">
                <label>Sujet</label>
                <input value={f.sujet} onChange={set("sujet")} placeholder="Objet de votre message" />
              </div>
              <div className={"field" + (errs.message ? " err" : "")}>
                <label>Message <span className="req">*</span></label>
                <textarea value={f.message} onChange={set("message")} placeholder="Votre message…"></textarea>
                {errs.message && <span className="hint">{errs.message}</span>}
              </div>
              <div className={"field" + (errs.consent ? " err" : "")}>
                <label className="consent-label">
                  <input type="checkbox" checked={f.consent} onChange={e => setF(s => ({...s, consent: e.target.checked}))} />
                  <span>J'accepte que les informations transmises soient utilisées par l'hôtel Blue Caravelle pour traiter ma demande, conformément à la <a href="#/politique-confidentialite">Politique de confidentialité</a>.</span>
                </label>
                {errs.consent && <span className="hint">{errs.consent}</span>}
              </div>
              <button type="submit" className="btn btn-gold btn-block">Envoyer le message</button>
            </form>
          </Reveal>
        </div>
      </section>
    </main>);

}

/* ===================== AVIS / BOÎTE À SUGGESTIONS ===================== */
function AvisPage({ params }) {
  useDB();
  const resId = params.get("res") || "";
  const res = resId ? DB.find("reservations", resId) : null;
  const prefillName = params.get("n") || (res ? res.nom_complet : "");
  const [f, setF] = useState({ nom_client: prefillName, email: res ? res.email : "", note: 0, commentaire: "", consent: false });
  const [errs, setErrs] = useState({});
  const [sent, setSent] = useState(false);
  const set = (k, v) => { setF(s => ({ ...s, [k]: v })); setErrs(e => ({ ...e, [k]: "" })); };
  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (!f.nom_client.trim()) er.nom_client = "Votre nom est requis.";
    if (!f.note) er.note = "Choisissez une note.";
    if (!f.commentaire.trim()) er.commentaire = "Partagez quelques mots sur votre séjour.";
    if (!f.consent) er.consent = "Veuillez accepter la publication de votre avis.";
    setErrs(er);
    if (Object.keys(er).length) { fireToast({ title: "Formulaire incomplet", msg: "Merci de compléter les champs requis.", duration: 4500 }); return; }
    DB.insert("reviews", {
      nom_client: f.nom_client.trim(), email: f.email.trim(), note: Number(f.note),
      commentaire: f.commentaire.trim(), affiche: false, lu: false,
      source: "Boîte à suggestions", reservation_id: resId || null, date_creation: Date.now()
    });
    if (res && !res.avis_recu && (DB.mode() === "local" || DB.isAuthed())) DB.update("reservations", res.id, { avis_recu: true });
    console.info("[Avis reçu] " + f.nom_client + " — " + f.note + "/5");
    setSent(true);
    fireToast({ title: "Merci !", msg: "Votre avis a bien été transmis à notre équipe.", duration: 5000 });
  };
  return (
    <main>
      <PageHero img={DB.IMG.about} eyebrow="Votre avis compte" title="Partagez votre expérience"
        sub="Votre retour nous aide à cultiver l'excellence. Quelques minutes suffisent." />
      <section className="section tight">
        <div className="wrap" style={{ maxWidth: 680 }}>
          {sent ? (
            <Reveal className="card" style={{ padding: "clamp(34px,5vw,56px)", textAlign: "center" }}>
              <span className="avis-done"><Icon name="check" size={34} stroke={2.4} /></span>
              <h2 className="h2" style={{ margin: "20px 0 12px" }}>Merci pour votre retour</h2>
              <p className="lead" style={{ marginBottom: 26 }}>Votre avis a été transmis à notre équipe. Après validation, il pourra être publié sur notre site.</p>
              <a href="#/" className="btn btn-gold">Retour à l'accueil</a>
            </Reveal>
          ) : (
            <Reveal className="card" style={{ padding: "clamp(24px,3.4vw,40px)" }}>
              {res && <div className="avis-context"><Icon name="bed" size={18} /> <span>Séjour : <strong>{res.type_chambre || "votre séjour"}</strong> · {BC.dateShort(res.date_arrivee)} → {BC.dateShort(res.date_depart)}</span></div>}
              <form onSubmit={submit} noValidate>
                <div className={"field" + (errs.note ? " err" : "")}>
                  <label>Votre note <span className="req">*</span></label>
                  <StarInput value={f.note} onChange={v => set("note", v)} />
                  {errs.note && <span className="hint">{errs.note}</span>}
                </div>
                <div className={"field" + (errs.nom_client ? " err" : "")}>
                  <label>Votre nom <span className="req">*</span></label>
                  <input value={f.nom_client} onChange={e => set("nom_client", e.target.value)} placeholder="Ex. Awa Koné" />
                  {errs.nom_client && <span className="hint">{errs.nom_client}</span>}
                </div>
                <div className="field">
                  <label>E-mail (optionnel)</label>
                  <input type="email" value={f.email} onChange={e => set("email", e.target.value)} placeholder="vous@email.com" />
                </div>
                <div className={"field" + (errs.commentaire ? " err" : "")}>
                  <label>Votre message <span className="req">*</span></label>
                  <textarea value={f.commentaire} onChange={e => set("commentaire", e.target.value)} placeholder="Ce que vous avez aimé, vos suggestions pour rendre votre prochain séjour encore plus beau…"></textarea>
                  {errs.commentaire && <span className="hint">{errs.commentaire}</span>}
                </div>
                <div className={"field" + (errs.consent ? " err" : "")}>
                  <label className="consent-label">
                    <input type="checkbox" checked={f.consent} onChange={e => set("consent", e.target.checked)} />
                    <span>J'accepte que mon avis (nom ou pseudonyme, note et commentaire) soit publié sur le site, conformément à la <a href="#/politique-confidentialite">Politique de confidentialité</a>. Je peux en demander le retrait à tout moment.</span>
                  </label>
                  {errs.consent && <span className="hint">{errs.consent}</span>}
                </div>
                <button type="submit" className="btn btn-gold btn-block">Envoyer mon avis</button>
                <p className="muted" style={{ fontSize: ".82rem", textAlign: "center", marginTop: 14 }}>Votre avis est relu par notre équipe avant publication.</p>
              </form>
            </Reveal>
          )}
        </div>
      </section>
    </main>
  );
}

/* ---------- Communs ---------- */
function PageHero({ img, eyebrow, title, sub }) {
  return (
    <section className="page-hero">
      <Photo src={img} alt={title} eager />
      <div className="scrim"></div>
      <div className="ph-inner">
        <div className="wrap">
          <Reveal><span className="eyebrow" style={{ color: "var(--or-clair)" }}>{eyebrow}</span>
            <h1 className="h1" style={{ color: "#fff", margin: "16px 0 12px", maxWidth: 820 }}>{title}</h1>
            {sub && <p className="lead" style={{ color: "rgba(255,255,255,.88)", maxWidth: 620 }}>{sub}</p>}
          </Reveal>
        </div>
      </div>
    </section>);

}
function QuoteBand() {
  const rootRef = useRef(null);
  const lineRef = useRef(null);
  const quoteRef = useRef(null);
  const attrRef = useRef(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setTimeout(() => lineRef.current  && lineRef.current.classList.add("qb-in"), 0);
      setTimeout(() => quoteRef.current && quoteRef.current.classList.add("qb-in"), 380);
      setTimeout(() => attrRef.current  && attrRef.current.classList.add("qb-in"), 1020);
      io.unobserve(el);
    }, { threshold: 0.22 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section style={{ position: "relative", minHeight: "68vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
      <Photo src={DB.IMG.beach} alt="Le littoral de San Pedro" eager style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,30,55,.46) 0%, rgba(10,30,55,.70) 100%)" }}></div>
      <div ref={rootRef} className="wrap" style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
        <span ref={lineRef} className="qb-line" aria-hidden="true"></span>
        <p ref={quoteRef} className="qb-quote serif-it">
          Ici, le luxe n'est pas une ostentation. C'est le silence du large,
          la lumière du matin sur le sable, et le sentiment d'être exactement à sa place.
        </p>
        <p ref={attrRef} className="qb-attr">L'esprit Blue Caravelle</p>
      </div>
    </section>
  );
}
function CTAband() {
  return (
    <section style={{ background: "linear-gradient(120deg, var(--marine), var(--profond))", color: "#fff" }}>
      <div className="wrap" style={{ paddingBlock: "clamp(48px,7vw,90px)", textAlign: "center" }}>
        <Reveal>
          <span className="eyebrow center" style={{ color: "var(--or-clair)" }}>Prêt à embarquer ?</span>
          <h2 className="h2" style={{ color: "#fff", margin: "16px auto 14px", maxWidth: 620 }}>Réservez votre échappée face à l'Atlantique</h2>
          <p className="lead" style={{ color: "rgba(255,255,255,.82)", maxWidth: 540, margin: "0 auto 30px" }}>Notre équipe vous répond sous 24 h pour composer le séjour idéal.</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#/reservation" className="btn btn-gold">Réserver un séjour</a>
            <a href={waLink()} target="_blank" rel="noopener" className="btn btn-light"><Icon name="wa" size={18} fill="currentColor" /> WhatsApp</a>
          </div>
        </Reveal>
      </div>
    </section>);

}
function NotFound() {
  return (
    <main><div style={{ height: 120 }}></div>
      <section className="section center"><div className="wrap">
        <h1 className="h1">Page introuvable</h1>
        <p className="lead" style={{ margin: "14px 0 26px" }}>Cette page n'existe pas ou plus.</p>
        <a href="#/" className="btn btn-gold">Retour à l'accueil</a>
      </div></section>
    </main>);

}
function LegalPage() {
  return (
    <main><div style={{ height: 84 }}></div>
      <section className="section"><div className="wrap" style={{ maxWidth: 760 }}>
        <span className="eyebrow">Informations</span>
        <h1 className="h1" style={{ margin: "14px 0 28px" }}>Mentions légales</h1>
        <div style={{ marginBottom: 26 }}>
          <h3 className="h3" style={{ marginBottom: 8 }}>Éditeur du site</h3>
          <p className="muted">Hôtel Blue Caravelle. Forme juridique et numéro RCCM : [à compléter]. Siège social : {BC.ADDRESS}. Directeur de la publication : [nom et qualité]. Téléphone : {BC.PHONE}. E-mail : {BC.EMAIL}.</p>
        </div>
        <div style={{ marginBottom: 26 }}>
          <h3 className="h3" style={{ marginBottom: 8 }}>Hébergement</h3>
          <p className="muted">Site hébergé par [nom de l'hébergeur], [adresse]. Contact hébergeur : [e-mail hébergeur].</p>
        </div>
        <div style={{ marginBottom: 26 }}>
          <h3 className="h3" style={{ marginBottom: 8 }}>Données personnelles</h3>
          <p className="muted">Les informations recueillies via les formulaires sont utilisées uniquement pour traiter vos demandes. Consultez notre <a href="#/politique-confidentialite">Politique de confidentialité</a> pour en savoir plus.</p>
        </div>
        <div style={{ marginBottom: 26 }}>
          <h3 className="h3" style={{ marginBottom: 8 }}>Conditions de réservation</h3>
          <p className="muted">Le site ne réalise aucune vente ni paiement en ligne. Les réservations sont des demandes ; la confirmation et le règlement s'effectuent hors ligne. Consultez nos <a href="#/conditions-reservation">Conditions de réservation</a>.</p>
        </div>
        <div style={{ marginBottom: 26 }}>
          <h3 className="h3" style={{ marginBottom: 8 }}>Propriété intellectuelle</h3>
          <p className="muted">L'ensemble des éléments de ce site (textes, logo, visuels) est la propriété de l'Hôtel Blue Caravelle. Toute reproduction sans autorisation est interdite.</p>
        </div>
      </div></section>
    </main>);
}

/* ===================== POLITIQUE DE CONFIDENTIALITÉ ===================== */
function PrivacyPage() {
  return (
    <main><div style={{ height: 84 }}></div>
      <section className="section"><div className="wrap" style={{ maxWidth: 760 }}>
        <span className="eyebrow">Informations légales</span>
        <h1 className="h1" style={{ margin: "14px 0 8px" }}>Politique de confidentialité</h1>
        <p className="muted" style={{ marginBottom: 36, fontSize: ".9rem" }}>Dernière mise à jour : 4 juin 2026 · Conforme à la Loi n°2013-450 du 19 juin 2013</p>
        {[
          ["1. Responsable du traitement", "Hôtel Blue Caravelle — " + BC.ADDRESS + ". Téléphone : " + BC.PHONE + ". E-mail : " + BC.EMAIL + ". Le site ne réalise aucune transaction ni paiement en ligne."],
          ["2. Données collectées et finalités", "Formulaire de réservation : nom, e-mail, téléphone/WhatsApp, dates, nombre de personnes — pour traiter la demande de séjour (confirmation et paiement hors ligne). Formulaire de contact : nom, e-mail, téléphone, message — pour répondre aux demandes. Avis clients : nom ou pseudonyme, note, commentaire — pour publication après modération et consentement exprès."],
          ["3. Base juridique", "Le traitement repose sur le consentement explicite de la personne, recueilli via la case à cocher présente sur chaque formulaire. Pour les réservations, le traitement est également fondé sur l'exécution de mesures précontractuelles prises à votre demande."],
          ["4. Durée de conservation", "Les données sont conservées le temps nécessaire à leur finalité : demandes de réservation (3 ans), messages de contact (2 ans), avis clients jusqu'au retrait demandé par la personne concernée. Aucune conservation indéfinie n'est pratiquée."],
          ["5. Destinataires", "Vos données sont destinées au personnel habilité de l'hôtel. Elles ne sont ni vendues ni cédées à des tiers à des fins commerciales."],
          ["6. Hébergement et transferts", "Les données sont hébergées par le prestataire technique de l'hôtel. L'hôtel privilégie l'auto-hébergement des ressources (polices, scripts) afin de limiter les transferts hors de Côte d'Ivoire, conformément à l'article 47 de la Loi n°2013-450."],
          ["7. Sécurité", "L'hôtel met en œuvre des mesures techniques et organisationnelles appropriées : HTTPS/SSL, authentification sécurisée avec mots de passe hachés, base de données à accès restreint, sauvegardes régulières et journalisation, conformément à l'article 37 de la Loi n°2013-450."],
          ["8. Vos droits", "Vous disposez des droits d'accès, de rectification, de suppression et d'opposition concernant vos données. Ces droits s'exercent en écrivant à " + BC.EMAIL + ". L'hôtel s'engage à répondre dans un délai d'un mois. Vous pouvez également introduire une réclamation auprès de l'ARTCI."],
          ["9. Cookies et traceurs", "Le site n'utilise que les traceurs strictement nécessaires à son fonctionnement. Aucun traceur non essentiel n'est déposé sans votre consentement préalable, recueilli via le bandeau affiché lors de votre première visite."],
          ["10. Déclaration ARTCI", "Les traitements décrits font l'objet d'une déclaration auprès de l'ARTCI, conformément aux articles 57 à 68 de la Loi n°2013-450 du 19 juin 2013."]
        ].map((s, i) =>
          <div key={i} style={{ marginBottom: 26 }}>
            <h3 className="h3" style={{ marginBottom: 8 }}>{s[0]}</h3>
            <p className="muted">{s[1]}</p>
          </div>
        )}
        <div style={{ marginTop: 40, padding: "20px 24px", background: "var(--sable-2)", borderRadius: "var(--r)", border: "1px solid var(--line)" }}>
          <p style={{ fontSize: ".9rem", color: "var(--ink-2)", margin: 0, lineHeight: 1.65 }}>
            <strong>Contact protection des données :</strong> {BC.EMAIL} — {BC.PHONE}<br />
            Toute réclamation peut également être adressée à l'<strong>ARTCI</strong> — Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire, Abidjan-Plateau.
          </p>
        </div>
      </div></section>
    </main>
  );
}

/* ===================== CONDITIONS DE RÉSERVATION ===================== */
function ReservationConditionsPage() {
  return (
    <main><div style={{ height: 84 }}></div>
      <section className="section"><div className="wrap" style={{ maxWidth: 760 }}>
        <span className="eyebrow">Informations légales</span>
        <h1 className="h1" style={{ margin: "14px 0 8px" }}>Conditions de réservation</h1>
        <p className="muted" style={{ marginBottom: 36, fontSize: ".9rem" }}>Site sans vente ni paiement en ligne — en vigueur depuis le 4 juin 2026</p>
        {[
          ["Nature du service", "Le site bleucaravelle.ci permet d'adresser une demande de réservation. Il ne constitue pas un point de vente en ligne et ne collecte aucun paiement. La confirmation ferme et le règlement s'effectuent hors ligne, en contact direct avec l'hôtel."],
          ["Confirmation", "Une demande soumise via le formulaire ne vaut pas réservation ferme. Celle-ci n'est confirmée qu'après validation expresse de l'hôtel par téléphone, e-mail ou WhatsApp, dans un délai maximum de 24 heures."],
          ["Accusé de réception", "Un e-mail automatique confirme la bonne réception de chaque demande et communique un numéro de référence unique permettant de suivre et d'identifier la demande."],
          ["Paiement", "Le règlement s'effectue hors ligne, en contact direct avec l'hôtel : Mobile Money, espèces, virement ou tout autre mode convenu lors de la confirmation."],
          ["Tarifs", "Les tarifs affichés sur le site sont donnés à titre indicatif et susceptibles de modification sans préavis. Les tarifs définitifs sont confirmés lors de la validation de la réservation par l'hôtel."],
          ["Annulation et modification", "Toute demande d'annulation ou de modification doit être adressée à l'hôtel par e-mail ou WhatsApp dans les meilleurs délais. Les conditions détaillées sont précisées lors de la confirmation."],
          ["Contact", "Hôtel Blue Caravelle — " + BC.ADDRESS + ". Téléphone : " + BC.PHONE + ". E-mail : " + BC.EMAIL + "."]
        ].map((s, i) =>
          <div key={i} style={{ marginBottom: 26 }}>
            <h3 className="h3" style={{ marginBottom: 8 }}>{s[0]}</h3>
            <p className="muted">{s[1]}</p>
          </div>
        )}
      </div></section>
    </main>
  );
}

/* ===================== BANDEAU COOKIES ===================== */
function CookieBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (!localStorage.getItem("bc_cookies_choice")) setVisible(true); }, []);
  const choose = (v) => { localStorage.setItem("bc_cookies_choice", v); setVisible(false); };
  if (!visible) return null;
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9998,
      background: "var(--anthracite)", padding: "14px clamp(16px,4vw,40px)",
      display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
      boxShadow: "0 -4px 32px rgba(0,0,0,.28)"
    }}>
      <p style={{ margin: 0, flex: 1, minWidth: 260, fontSize: ".88rem", lineHeight: 1.65, color: "rgba(255,255,255,.85)" }}>
        Ce site utilise uniquement les traceurs strictement nécessaires à son fonctionnement.
        Avec votre accord, des ressources complémentaires peuvent être chargées.{" "}
        <a href="#/politique-confidentialite" style={{ color: "var(--or-clair)", textDecoration: "underline" }}>En savoir plus</a>
      </p>
      <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
        <button onClick={() => choose("refused")} style={{ background: "transparent", border: "1px solid rgba(255,255,255,.28)", color: "rgba(255,255,255,.7)", borderRadius: "var(--r-sm)", padding: "8px 16px", fontSize: ".88rem", cursor: "pointer", fontFamily: "inherit" }}>Refuser</button>
        <button onClick={() => choose("accepted")} className="btn btn-gold" style={{ padding: "8px 20px", fontSize: ".88rem" }}>Accepter</button>
      </div>
    </div>
  );
}

Object.assign(window, {
  HomePage, AboutPage, RoomsPage, RoomDetailPage, RestaurantPage,
  GalleryPage, ExperiencesPage, ReservationPage, ContactPage, AvisPage,
  PageHero, CTAband, QuoteBand, NotFound, LegalPage, MapEmbed, SectionHead, RoomCard, ExperienceCard,
  PrivacyPage, ReservationConditionsPage, CookieBanner
});