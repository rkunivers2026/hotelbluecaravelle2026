/* =========================================================
   BLUE CARAVELLE — Application & routeur
   ========================================================= */

const TITLES = {
  "/": ["Blue Caravelle — Hôtel · San Pedro", "Hôtel balnéaire premium à San Pedro, Côte d'Ivoire. Chambres face à l'Atlantique, restaurant raffiné, expériences sur mesure."],
  "/a-propos": ["À propos — Blue Caravelle · San Pedro", "L'histoire et les valeurs de l'Hôtel Blue Caravelle, refuge balnéaire premium à San Pedro."],
  "/chambres": ["Chambres & Suites — Blue Caravelle", "Découvrez nos chambres et suites face à la mer à San Pedro. Réservez votre séjour à l'Hôtel Blue Caravelle."],
  "/restaurant": ["Restaurant Le Sextant — Blue Caravelle", "Cuisine ivoirienne et internationale face à l'océan, au restaurant de l'Hôtel Blue Caravelle, San Pedro."],
  "/galerie": ["Galerie — Blue Caravelle · San Pedro", "Photos de l'Hôtel Blue Caravelle : chambres, restaurant, plage et extérieurs à San Pedro."],
  "/experiences": ["Expériences & Activités — Blue Caravelle", "Sorties en mer, plage privée, excursions et bien-être à l'Hôtel Blue Caravelle, San Pedro."],
  "/reservation": ["Réserver — Blue Caravelle · San Pedro", "Demandez votre séjour à l'Hôtel Blue Caravelle. Réponse sous 24 h."],
  "/contact": ["Contact — Blue Caravelle · San Pedro", "Contactez l'Hôtel Blue Caravelle à San Pedro, Côte d'Ivoire."],
  "/avis": ["Donner mon avis — Blue Caravelle", "Partagez votre expérience à l'Hôtel Blue Caravelle, San Pedro. Votre avis nous aide à cultiver l'excellence."],
  "/admin": ["Administration — Blue Caravelle", ""],
  "/mentions-legales": ["Mentions légales — Blue Caravelle", ""],
  "/politique-confidentialite": ["Politique de confidentialité — Blue Caravelle", "Protection des données personnelles — Hôtel Blue Caravelle, San Pedro, Côte d'Ivoire."],
  "/conditions-reservation": ["Conditions de réservation — Blue Caravelle", "Conditions de réservation de l'Hôtel Blue Caravelle — San Pedro, Côte d'Ivoire."]
};

function setMeta(path) {
  const base = TITLES[path.startsWith("/chambre/") ? "/chambres" : path] || TITLES["/"];
  document.title = base[0];
  if (base[1]) {
    let m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute("content", base[1]);
  }
}

function App() {
  useDB();
  const { path, params } = useHashRoute();
  useEffect(() => { setMeta(path); }, [path]);

  // Route admin : plein écran
  if (path === "/admin") return (<React.Fragment><AdminApp /><ToastZone /></React.Fragment>);

  // Mode maintenance : le site public est fermé (le back-office reste accessible).
  if (siteInfo().maintenance) return (<React.Fragment><MaintenancePage /><ToastZone /></React.Fragment>);

  const heroPages = ["/", "/a-propos", "/chambres", "/restaurant", "/galerie", "/experiences", "/contact", "/avis"];
  const isHero = heroPages.includes(path) || path.startsWith("/chambre/");

  let page;
  if (path === "/") page = <HomePage />;
  else if (path === "/a-propos") page = <AboutPage />;
  else if (path === "/chambres") page = <RoomsPage />;
  else if (path.startsWith("/chambre/")) page = <RoomDetailPage id={path.split("/")[2]} />;
  else if (path === "/restaurant") page = <RestaurantPage />;
  else if (path === "/galerie") page = <GalleryPage />;
  else if (path === "/experiences") page = <ExperiencesPage />;
  else if (path === "/reservation") page = <ReservationPage params={params} />;
  else if (path === "/contact") page = <ContactPage />;
  else if (path === "/avis") page = <AvisPage params={params} />;
  else if (path === "/mentions-legales") page = <LegalPage />;
  else if (path === "/politique-confidentialite") page = <PrivacyPage />;
  else if (path === "/conditions-reservation") page = <ReservationConditionsPage />;
  else page = <NotFound />;

  return (
    <React.Fragment>
      <Header path={path} heroPage={isHero} />
      {page}
      <Footer />
      <AnnonceBar />
      <WhatsAppFab />
      <ToastZone />
      <CookieBanner />
    </React.Fragment>
  );
}

// Le rendu attend la détection du backend (mode API) ou le repli localStorage.
DB.ready.then(function () {
  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
});
