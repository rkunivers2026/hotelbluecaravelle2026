/* =========================================================
   BLUE CARAVELLE — Couche de données (base locale)
   Persistance via localStorage. Partagée entre le site
   public et le back-office /admin.
   ========================================================= */
(function () {
  "use strict";

  var KEY = "bleucaravelle_db_v4";
  var AUTH_KEY = "bleucaravelle_session";
  // Durée de session : expiration glissante après 30 min d'inactivité.
  var SESSION_TTL = 30 * 60 * 1000;
  // Base de l'API : window.BLEU_API (front-end sur une autre origine) ou
  // même origine (""). Si aucun backend n'est joignable, repli localStorage.
  var API = (typeof window !== "undefined" && window.BLEU_API) || "";
  var MODE = "local"; // devient "api" si un backend Blue Caravelle est détecté
  var apiNeedsSetup = false; // en mode API : le super admin reste-t-il à créer ?
  // ⛔  SÉCURITÉ — aucun mot de passe dans le code source (fichier servi publiquement).
  // L'authentification passe par le backend (server/ : JWT + bcrypt). En l'absence de
  // backend, la connexion locale reste désactivée (pass = null) et #/admin propose la
  // création du compte super administrateur.
  var SUPERADMIN = { user: "rk.univers", pass: null, nom: "RK Univers" };

  // ---- Setup initial super admin (première mise en ligne) ----
  var SA_KEY = "bleucaravelle_superadmin_v1";
  function loadSuperAdminSetup() {
    try {
      var raw = localStorage.getItem(SA_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && s.user && s.pass) {
        SUPERADMIN.user = s.user;
        SUPERADMIN.pass = s.pass;
        SUPERADMIN.nom  = s.nom || "RK Univers";
      }
    } catch (e) {}
  }

  // Banque d'images (chargement progressif + repli dégradé si hors-ligne)
  function U(id, w) { return "https://images.unsplash.com/photo-" + id + "?auto=format&fit=crop&w=" + (w || 1100) + "&q=70"; }
  var IMG = {
    heroBeach:  U("1507525428034-b723cf961d3e", 1900),
    heroPool:   U("1571003123894-1f0594d2b5d9", 1900),
    heroRoom:   U("1582719478250-c89cae4dc85b", 1900),
    room1:      U("1611892440504-42a792e24d32"),
    room2:      U("1582719478250-c89cae4dc85b"),
    room3:      U("1590490360182-c33d57733427"),
    room4:      U("1631049307264-da0ec9d70304"),
    room5:      U("1578683010236-d716f9a3f461"),
    room6:      U("1505693416388-ac5ce068fe85"),
    suite:      U("1551882547-ff40c63fe5fa"),
    restaurant: U("1517248135467-4c7edcad34c4"),
    dining:     U("1414235077428-338989a2e8c0"),
    food1:      U("1565299624946-b28f40a0ae38"),
    food2:      U("1546069901-ba9599a7e63c"),
    food3:      U("1467003909585-2f8a72700288"),
    food4:      U("1473093295043-cdd812d0e601"),
    food5:      U("1565958011703-44f9829ba187"),
    food6:      U("1551024601-bec78aea704b"),
    boat:       U("1544551763-46a013bb70d5"),
    beach:      U("1519046904884-53103b34b206"),
    nature:     U("1441974231531-c6227db76b6e"),
    spa:        U("1540555700478-4be289fbecef"),
    surf:       U("1502680390469-be75c86b636f"),
    ext1:       U("1571896349842-33c89424de2d"),
    ext2:       U("1520250497591-112f2f40a3f4"),
    event1:     U("1519671482749-fd09be7ccebf"),
    event2:     U("1530103862676-de8c9debad1d"),
    pool:       U("1566073771259-6a8506099945"),
    about:      U("1564501049412-61c2a3083791")
  };
  // Version autonome (hors-ligne) : le bundler injecte les images dans window.__resources
  // (mêmes clés que IMG). En ligne, cette variable n'existe pas → aucun effet.
  if (typeof window !== "undefined" && window.__resources) {
    Object.keys(IMG).forEach(function (k) { if (window.__resources[k]) IMG[k] = window.__resources[k]; });
  }
  var IMG_DEFAULTS = Object.assign({}, IMG);
  var BC_DEFAULTS = null;

  function uid(p) { return (p || "id") + "_" + Math.random().toString(36).slice(2, 9); }

  // ---- Carte du restaurant Le Sextant (source de vérité) ----
  var MENU_VERSION = 5;
  function res(k) { return (typeof window !== "undefined" && window.__resources && window.__resources[k]) || null; }
  function SEED_DISHES() {
    return [
      // — Les Signatures Blue Caravelle —
      { id: uid("pl"), nom: "Lapin à la moutarde", categorie: "Signature", prix: 25000, description: "Pour 4 personnes", image: "" },
      { id: uid("pl"), nom: "Kedjenou de la mer", categorie: "Signature", prix: 30000, description: "Pour 4 personnes", image: "" },
      { id: uid("pl"), nom: "Darne de poisson au citron", categorie: "Signature", prix: 15000, description: "", image: "" },
      { id: uid("pl"), nom: "Cailles braisées", categorie: "Signature", prix: 5000, description: "", image: "" },
      { id: uid("pl"), nom: "Riz surprise Caravelle", categorie: "Signature", prix: 0, prix_txt: "Selon le marché", description: "La surprise du chef", image: "" },
      { id: uid("pl"), nom: "Riz aux champignons noirs au poisson", categorie: "Signature", prix: 10000, description: "", image: "" },
      { id: uid("pl"), nom: "Fonio à la sauce arachide et pintade", categorie: "Signature", prix: 10000, description: "", image: "" },
      { id: uid("pl"), nom: "Riz au gras royal", categorie: "Signature", prix: 10000, description: "Au poisson, à la viande ou au poulet", image: "" },
      // — Entrées —
      { id: uid("pl"), nom: "Crudités", categorie: "Entrée", prix: 18000, description: "", image: "" },
      { id: uid("pl"), nom: "Assiette de charcuterie", categorie: "Entrée", prix: 0, description: "", image: "" },
      { id: uid("pl"), nom: "Avocat au thon", categorie: "Entrée", prix: 0, description: "", image: "" },
      { id: uid("pl"), nom: "Avocat vinaigrette", categorie: "Entrée", prix: 0, description: "", image: "" },
      { id: uid("pl"), nom: "Avocat crevettes", categorie: "Entrée", prix: 0, description: "", image: "" },
      { id: uid("pl"), nom: "Cocktail d'écrevisses", categorie: "Entrée", prix: 0, description: "", image: "" },
      { id: uid("pl"), nom: "Cocktail d'escargots", categorie: "Entrée", prix: 0, description: "", image: "" },
      { id: uid("pl"), nom: "Coquilles Saint-Jacques", categorie: "Entrée", prix: 0, prix_txt: "Sur commande", description: "Sur commande", image: "" },
      { id: uid("pl"), nom: "Gratin de poisson", categorie: "Entrée", prix: 0, prix_txt: "Sur commande", description: "Sur commande", image: "" },
      { id: uid("pl"), nom: "Salade de thon", categorie: "Entrée", prix: 4000, description: "", image: "" },
      { id: uid("pl"), nom: "Salade de tomates nature", categorie: "Entrée", prix: 2000, description: "", image: "" },
      // — Plats principaux — Kedjenou —
      { id: uid("pl"), nom: "Kedjenou de pintade", categorie: "Kedjenou", prix: 9000, description: "½ pintade", image: "" },
      { id: uid("pl"), nom: "Kedjenou de poulet africain", categorie: "Kedjenou", prix: 6000, description: "½ poulet", image: "" },
      { id: uid("pl"), nom: "Kedjenou de lapin", categorie: "Kedjenou", prix: 10000, description: "", image: "" },
      { id: uid("pl"), nom: "Kedjenou de pigeon", categorie: "Kedjenou", prix: 10000, description: "", image: "" },
      { id: uid("pl"), nom: "Kedjenou de carpe", categorie: "Kedjenou", prix: 6500, description: "", image: "" },
      { id: uid("pl"), nom: "Kedjenou de machoiron", categorie: "Kedjenou", prix: 10000, description: "", image: "" },
      { id: uid("pl"), nom: "Kedjenou de langouste", categorie: "Kedjenou", prix: 15000, description: "", image: "" },
      { id: uid("pl"), nom: "Kedjenou d'escargot", categorie: "Kedjenou", prix: 10000, description: "", image: "" },
      // — Sauces —
      { id: uid("pl"), nom: "Sauce arachide", categorie: "Sauce", prix: 8000, description: "Pintade ou poulet", image: "" },
      { id: uid("pl"), nom: "Sauce aubergine", categorie: "Sauce", prix: 5000, description: "Poisson frais, fumé, queue de bœuf", image: "" },
      { id: uid("pl"), nom: "Sauce feuille", categorie: "Sauce", prix: 8000, description: "Queue de bœuf, pattes de bœuf", image: "" },
      { id: uid("pl"), nom: "Sauce graine", categorie: "Sauce", prix: 8000, description: "", image: "" },
      { id: uid("pl"), nom: "Pépé soupe mouton", categorie: "Sauce", prix: 6000, description: "", image: "" },
      { id: uid("pl"), nom: "Pépé soupe poisson", categorie: "Sauce", prix: 8000, description: "", image: "" },
      { id: uid("pl"), nom: "Sauce gibier", categorie: "Sauce", prix: 10000, description: "", image: "" },
      // — Accompagnements (1 000 FCFA chacun) —
      { id: uid("pl"), nom: "Accompagnements", categorie: "Accompagnement", prix: 1000, description: "Alloco · Attiéké · Frites de pomme de terre ou d'igname · Pomme vapeur · Pommes de terre sautées · Riz · Banane bouillie · Foutou (banane, igname) — chacun", image: "" },
      // — Grillades —
      { id: uid("pl"), nom: "Brochettes de bœuf", categorie: "Grillade", prix: 10000, description: "La paire", image: "" },
      { id: uid("pl"), nom: "Pigeon braisé", categorie: "Grillade", prix: 10000, description: "La paire", image: "" },
      { id: uid("pl"), nom: "Poulet braisé", categorie: "Grillade", prix: 5000, description: "½", image: "" },
      { id: uid("pl"), nom: "Poulet sauté", categorie: "Grillade", prix: 5000, description: "½", image: "" },
      { id: uid("pl"), nom: "Poulet grillé", categorie: "Grillade", prix: 3500, description: "½", image: "" },
      { id: uid("pl"), nom: "Saucisses de Toulouse", categorie: "Grillade", prix: 5500, description: "", image: "" },
      { id: uid("pl"), nom: "Brochettes de filet de poisson", categorie: "Grillade", prix: 10000, description: "", image: "" },
      { id: uid("pl"), nom: "Carpe braisée", categorie: "Grillade", prix: 8000, prix_txt: "8 000 – 10 000 FCFA", description: "Selon la taille", image: "" },
      { id: uid("pl"), nom: "Machoiron braisé", categorie: "Grillade", prix: 10000, prix_txt: "10 000 – 20 000 FCFA", description: "Selon la taille", image: "" },
      { id: uid("pl"), nom: "Darne de poisson braisé", categorie: "Grillade", prix: 10000, description: "", image: "" },
      { id: uid("pl"), nom: "Poisson à la poêle", categorie: "Grillade", prix: 10000, description: "", image: "" },
      { id: uid("pl"), nom: "Sole braisée", categorie: "Grillade", prix: 10000, prix_txt: "10 000 – 12 000 FCFA", description: "Selon la taille", image: "" },
      { id: uid("pl"), nom: "Langouste braisée", categorie: "Grillade", prix: 15000, description: "", image: "" },
      { id: uid("pl"), nom: "Brochettes d'écrevisses", categorie: "Grillade", prix: 10000, description: "La paire", image: "" },
      { id: uid("pl"), nom: "Brochettes d'escargots", categorie: "Grillade", prix: 10000, description: "La paire", image: "" },
      { id: uid("pl"), nom: "Brochettes de gambas", categorie: "Grillade", prix: 13000, description: "La paire", image: "" },
      // — Desserts —
      { id: uid("pl"), nom: "Fondant au chocolat", categorie: "Dessert", prix: 5000, description: "", image: "" },
      { id: uid("pl"), nom: "Douceur coco ananas", categorie: "Dessert", prix: 5000, description: "", image: "" },
      { id: uid("pl"), nom: "Salade de fruits frais", categorie: "Dessert", prix: 4000, description: "", image: res("saladeFruits") || "assets/salade_fruits.png" },
      { id: uid("pl"), nom: "Crème brûlée à la vanille", categorie: "Dessert", prix: 5000, description: "", image: "" },
      { id: uid("pl"), nom: "Glace artisanale", categorie: "Dessert", prix: 4000, description: "", image: "" }
    ];
  }

  function seed() {
    var DAY = 86400000;
    function isoOff(n) { var x = new Date(); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }
    var data = {
      settings: { info: {}, images: {} },
      menu_version: MENU_VERSION,
      rooms: [
        { id: uid("ch"), nom: "Suite Atlantique", type: "Suite", prix: 180000, capacite: 3,
          description: "Notre suite signature ouvre en grand sur l'océan. Terrasse privée face au large, lit king-size habillé de lin, salle de bain en marbre et baignoire îlot. Le murmure de l'Atlantique pour seule bande-son.",
          equipements: ["Vue mer panoramique","Terrasse privée","Climatisation","Wi-Fi fibre","Petit-déjeuner inclus","Minibar","Coffre-fort","Salle de bain en marbre"],
          photos: [IMG.suite, IMG.room2, IMG.ext1], disponible: true, unites: 2, dates_bloquees: [], mise_en_avant: true },
        { id: uid("ch"), nom: "Lagune d'Or", type: "Supérieure", prix: 95000, capacite: 2,
          description: "Une chambre baignée de lumière, aux teintes sable et doré. Balcon avec vue partielle sur la mer, idéale pour un séjour à deux entre raffinement et sérénité.",
          equipements: ["Vue mer partielle","Balcon privé","Climatisation","Wi-Fi fibre","Petit-déjeuner inclus","Minibar","Coffre-fort"],
          photos: [IMG.room1, IMG.room3, IMG.pool], disponible: true, unites: 4, dates_bloquees: [], mise_en_avant: true },
        { id: uid("ch"), nom: "Brise du Large", type: "Supérieure", prix: 110000, capacite: 2,
          description: "Spacieuse et lumineuse, ouverte sur les jardins de cocotiers et la piscine. Un cocon contemporain où dominent le bleu marine et le bois clair.",
          equipements: ["Vue jardin & piscine","Balcon privé","Climatisation","Wi-Fi fibre","Petit-déjeuner inclus","Minibar"],
          photos: [IMG.room3, IMG.room4, IMG.pool], disponible: true, unites: 3, dates_bloquees: [], mise_en_avant: true },
        { id: uid("ch"), nom: "Suite Présidentielle Sassandra", type: "Suite", prix: 280000, capacite: 4,
          description: "L'expression ultime du luxe balnéaire. 80 m², salon séparé, double terrasse, accès direct à la plage privée et service de majordome. Pensée pour les séjours d'exception.",
          equipements: ["Vue mer panoramique","Double terrasse","Accès plage privée","Majordome","Climatisation","Wi-Fi fibre","Petit-déjeuner inclus","Minibar","Coffre-fort","Salle de bain en marbre"],
          photos: [IMG.room2, IMG.suite, IMG.ext1], disponible: true, unites: 1, dates_bloquees: [], mise_en_avant: false },
        { id: uid("ch"), nom: "Caravelle Marine", type: "Standard", prix: 65000, capacite: 2,
          description: "L'essentiel du confort Blue Caravelle. Une chambre élégante et apaisante, ouverte sur les jardins, parfaite pour découvrir San Pedro sans renoncer au raffinement.",
          equipements: ["Vue jardin","Climatisation","Wi-Fi fibre","Petit-déjeuner inclus","Coffre-fort"],
          photos: [IMG.room5, IMG.room6], disponible: true, unites: 6, dates_bloquees: [], mise_en_avant: false },
        { id: uid("ch"), nom: "Sable Doux", type: "Standard", prix: 70000, capacite: 2,
          description: "Une chambre douce et chaleureuse aux accents crème et laiton, à deux pas du restaurant et de la piscine. Le repaire idéal des voyageurs en quête de calme.",
          equipements: ["Vue jardin","Climatisation","Wi-Fi fibre","Petit-déjeuner inclus","Coffre-fort"],
          photos: [IMG.room6, IMG.room5], disponible: false, unites: 0, dates_bloquees: [], mise_en_avant: false }
      ],
      experiences: [
        { id: uid("ex"), titre: "Coucher de soleil en mer", categorie: "Mer", duree: "2 h", tarif: 45000, image: IMG.boat,
          description: "Embarquez au crépuscule pour une croisière le long du littoral. Champagne, fruits de mer et l'horizon qui s'embrase sur l'Atlantique." },
        { id: uid("ex"), titre: "Plage privée & farniente", categorie: "Plage", duree: "Journée", tarif: 15000, image: IMG.beach,
          description: "Transats, parasols et service en bord de mer sur notre plage privée de sable fin. La détente à l'état pur, rythmée par les vagues." },
        { id: uid("ex"), titre: "Excursion nature — Parc de Taï", categorie: "Excursion", duree: "Journée", tarif: 75000, image: IMG.nature,
          description: "Partez à la rencontre de la forêt primaire classée au patrimoine mondial. Guide naturaliste, déjeuner local et immersion totale." },
        { id: uid("ex"), titre: "Rituel bien-être & spa", categorie: "Bien-être", duree: "90 min", tarif: 55000, image: IMG.spa,
          description: "Massage aux huiles de karité et de coco, gommage au sable et soin du visage. Une parenthèse sensorielle face à l'océan." },
        { id: uid("ex"), titre: "Initiation au surf à Monogaga", categorie: "Mer", duree: "2 h", tarif: 35000, image: IMG.surf,
          description: "Les plus belles vagues de la région, encadrées par nos moniteurs diplômés. Pour tous les niveaux, planche et combinaison fournies." }
      ],
      dishes: SEED_DISHES(),
      gallery: [
        { id: uid("ph"), image: IMG.suite,      categorie: "Chambres",   legende: "Suite Atlantique au lever du jour" },
        { id: uid("ph"), image: IMG.room1,      categorie: "Chambres",   legende: "Lagune d'Or, lumière dorée" },
        { id: uid("ph"), image: IMG.restaurant, categorie: "Restaurant", legende: "La salle du restaurant Le Sextant" },
        { id: uid("ph"), image: IMG.food6,      categorie: "Restaurant", legende: "Filet de bœuf, sauce au poivre" },
        { id: uid("ph"), image: IMG.ext1,       categorie: "Extérieurs", legende: "La terrasse face à l'océan" },
        { id: uid("ph"), image: IMG.pool,       categorie: "Extérieurs", legende: "Piscine à débordement" },
        { id: uid("ph"), image: IMG.beach,      categorie: "Plage",      legende: "Notre plage privée de sable fin" },
        { id: uid("ph"), image: IMG.boat,       categorie: "Plage",      legende: "Sortie en mer au crépuscule" },
        { id: uid("ph"), image: IMG.event1,     categorie: "Événements", legende: "Dîner d'exception sous les étoiles" },
        { id: uid("ph"), image: IMG.event2,     categorie: "Événements", legende: "Réception en bord de mer" },
        { id: uid("ph"), image: IMG.ext2,       categorie: "Extérieurs", legende: "Jardins de cocotiers" },
        { id: uid("ph"), image: IMG.spa,        categorie: "Chambres",   legende: "Espace bien-être & spa" }
      ],
      reviews: [
        { id: uid("av"), nom_client: "Awa K.",      note: 5, commentaire: "Un écrin de paix face à l'Atlantique. L'accueil, la vue, le restaurant : tout est pensé dans le moindre détail. Nous reviendrons sans hésiter.", affiche: true, lu: true, source: "Boîte à suggestions", date_creation: Date.now() - 1000*60*60*24*9 },
        { id: uid("av"), nom_client: "Jean-Marc D.", note: 5, commentaire: "Service impeccable et cuisine raffinée aux saveurs locales. La Suite Atlantique est un véritable cocon. Le meilleur hôtel de San Pedro, sans conteste.", affiche: true, lu: true, source: "Boîte à suggestions", date_creation: Date.now() - 1000*60*60*24*16 },
        { id: uid("av"), nom_client: "Fatou C.",    note: 4, commentaire: "Séjour magnifique, vue à couper le souffle au réveil. La sortie en mer au coucher du soleil restera un souvenir inoubliable.", affiche: true, lu: true, source: "Boîte à suggestions", date_creation: Date.now() - 1000*60*60*24*23 }
      ],
      reservations: [
        { id: uid("rs"), nom_complet: "Koffi N'Guessan", email: "koffi.ng@example.ci", telephone_whatsapp: "+225 07 11 22 33 44", type_chambre: "Suite Atlantique", date_arrivee: "2026-06-14", date_depart: "2026-06-18", nombre_personnes: 2, message: "Possibilité d'un transfert depuis l'aéroport ?", statut: "Nouvelle", lu: false, date_creation: Date.now() - 1000*60*60*5 },
        { id: uid("rs"), nom_complet: "Aïcha Traoré", email: "aicha.traore@example.com", telephone_whatsapp: "+225 05 66 77 88 99", type_chambre: "Lagune d'Or", date_arrivee: "2026-07-02", date_depart: "2026-07-05", nombre_personnes: 2, message: "Anniversaire de mariage, surprise possible ?", statut: "Traitée", lu: true, date_creation: Date.now() - 1000*60*60*30 },
        { id: uid("rs"), nom_complet: "Pierre Lefèvre", email: "p.lefevre@example.fr", telephone_whatsapp: "+33 6 12 34 56 78", type_chambre: "Suite Présidentielle Sassandra", date_arrivee: "2026-08-10", date_depart: "2026-08-20", nombre_personnes: 4, message: "Séjour en famille, deux enfants.", statut: "Confirmée", lu: true, date_creation: Date.now() - 1000*60*60*72 }
      ],
      accounts: [
        // ⛔ Aucun mot de passe en clair — connexion locale désactivée en production.
        // Déployez le backend backend-postgres/ pour une authentification sécurisée.
        { id: uid("ac"), nom: "Administrateur", user: "admin", actif: true, role: "manager", date_creation: Date.now() }
      ],
      clients: [],
      audit: [],
      messages: [
        { id: uid("ms"), nom: "Mariam Bamba", email: "mariam.b@example.ci", telephone: "+225 01 23 45 67 89", sujet: "Privatisation pour séminaire", message: "Bonjour, nous souhaitons organiser un séminaire d'entreprise de 40 personnes en septembre. Quelles sont vos formules ?", lu: false, date_creation: Date.now() - 1000*60*60*8 },
        { id: uid("ms"), nom: "David Kouamé", email: "david.k@example.com", telephone: "+225 07 98 76 54 32", sujet: "Mariage en bord de mer", message: "Nous cherchons un lieu pour notre mariage en décembre. Avez-vous une offre événementielle ?", lu: true, date_creation: Date.now() - 1000*60*60*40 }
      ]
    };
    // Démonstration du plan des chambres : séjours en cours, départ & arrivée du jour.
    var roomId = function (nom) { var r = data.rooms.find(function (x) { return x.nom === nom; }); return r ? r.id : null; };
    data.reservations.push(
      { id: uid("rs"), nom_complet: "Awa Diomandé", email: "awa.diomande@example.ci", telephone_whatsapp: "+225 07 22 33 44 55", type_chambre: "Lagune d'Or", date_arrivee: isoOff(-2), date_depart: isoOff(3), nombre_personnes: 2, message: "", statut: "Confirmée", lu: true, date_creation: Date.now() - DAY*6, chambre_id: roomId("Lagune d'Or"), unite: 1, checkin_at: Date.now() - DAY*2 },
      { id: uid("rs"), nom_complet: "Hugo Bertin", email: "hugo.bertin@example.fr", telephone_whatsapp: "+33 6 88 77 66 55", type_chambre: "Suite Atlantique", date_arrivee: isoOff(-1), date_depart: isoOff(0), nombre_personnes: 2, message: "", statut: "Confirmée", lu: true, date_creation: Date.now() - DAY*4, chambre_id: roomId("Suite Atlantique"), unite: 1, checkin_at: Date.now() - DAY*1 },
      { id: uid("rs"), nom_complet: "Salimata Cissé", email: "salimata.c@example.ci", telephone_whatsapp: "+225 05 11 22 33 44", type_chambre: "Brise du Large", date_arrivee: isoOff(0), date_depart: isoOff(4), nombre_personnes: 2, message: "Arrivée prévue en fin d'après-midi.", statut: "Confirmée", lu: true, date_creation: Date.now() - DAY*3 }
    );
    return data;
  }

  var state = null;
  var listeners = [];

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { state = JSON.parse(raw); migrate(); return; }
    } catch (e) {}
    state = seed();
    persist();
  }
  // Migration douce : ajoute les collections manquantes sur une base existante.
  function migrate() {
    var changed = false;
    if (!Array.isArray(state.accounts)) {
      // ⛔ Nouveau compte sans mot de passe en clair.
      state.accounts = [{ id: uid("ac"), nom: "Administrateur", user: "admin", actif: true, date_creation: Date.now() }];
      changed = true;
    }
    // ⛔ Purge des mots de passe stockés en clair dans localStorage (conformité ARTCI).
    if (Array.isArray(state.accounts)) {
      state.accounts.forEach(function (a) { if (a.pass) { delete a.pass; changed = true; } });
    }
    if (!Array.isArray(state.clients)) { state.clients = []; changed = true; }
    if (!Array.isArray(state.audit)) { state.audit = []; changed = true; }
    (state.accounts || []).forEach(function (a) { if (!a.role) { a.role = "manager"; changed = true; } });
    if (!state.settings || typeof state.settings !== "object") { state.settings = { info: {}, images: {} }; changed = true; }
    if (!state.settings.info) { state.settings.info = {}; changed = true; }
    if (!state.settings.images) { state.settings.images = {}; changed = true; }
    if (Array.isArray(state.reviews)) {
      state.reviews.forEach(function (r) { if (r.lu === undefined) { r.lu = true; changed = true; } });
    }
    if (state.menu_version !== MENU_VERSION) {
      state.dishes = SEED_DISHES();
      state.menu_version = MENU_VERSION;
      changed = true;
    }
    if (changed) persist();
  }
  // Applique les surcharges (images & infos) du super admin sur les objets vivants IMG / BC.
  function applySettings() {
    var s = (state && state.settings) || { info: {}, images: {} };
    Object.keys(IMG_DEFAULTS).forEach(function (k) { IMG[k] = IMG_DEFAULTS[k]; });
    if (s.images) Object.keys(s.images).forEach(function (k) { if (s.images[k]) IMG[k] = s.images[k]; });
    if (window.BC && BC_DEFAULTS) {
      var i = s.info || {};
      BC.ADDRESS = (i.adresse && i.adresse.trim()) || BC_DEFAULTS.ADDRESS;
      BC.PHONE = (i.telephone && i.telephone.trim()) || BC_DEFAULTS.PHONE;
      BC.EMAIL = (i.email && i.email.trim()) || BC_DEFAULTS.EMAIL;
      if (i.whatsapp && i.whatsapp.trim()) {
        BC.WHATSAPP_DISPLAY = i.whatsapp.trim();
        BC.WHATSAPP = i.whatsapp.replace(/\D/g, "");
      } else {
        BC.WHATSAPP_DISPLAY = BC_DEFAULTS.WHATSAPP_DISPLAY;
        BC.WHATSAPP = BC_DEFAULTS.WHATSAPP;
      }
    }
  }
  function setSession(obj) {
    try { sessionStorage.setItem(AUTH_KEY, JSON.stringify(Object.assign({}, obj, { exp: Date.now() + SESSION_TTL }))); } catch (e) {}
  }
  function getSession() {
    try {
      var s = JSON.parse(sessionStorage.getItem(AUTH_KEY) || "null");
      if (!s) return null;
      // Session expirée (inactivité) → purge et déconnexion.
      if (!s.exp || Date.now() > s.exp) { sessionStorage.removeItem(AUTH_KEY); return null; }
      // Expiration glissante : toute lecture pendant une session valide la prolonge.
      s.exp = Date.now() + SESSION_TTL;
      sessionStorage.setItem(AUTH_KEY, JSON.stringify(s));
      return s;
    } catch (e) { return null; }
  }
  function persist() {
    if (MODE !== "local") return; // en mode API, la source de vérité est le serveur
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { if (window.fireToast) window.fireToast({ title: "Stockage saturé", msg: "Impossible d'enregistrer : les images sont trop volumineuses. Réduisez leur taille ou leur nombre.", duration: 6000 }); }
  }
  function notify() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }
  function emit() { persist(); notify(); }

  // ---- Couche réseau (mode API) ----
  function collEndpoint(coll, id) {
    var base = "/api/" + coll;
    return id ? base + "/" + encodeURIComponent(id) : base;
  }
  function api(method, path, body) {
    return fetch(API + path, {
      method: method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (e) {
        var err = new Error((e && e.error) || ("HTTP " + r.status)); err.status = r.status; throw err;
      });
      return r.status === 204 ? null : r.json();
    });
  }
  function apiFail(e) {
    if (window.fireToast) window.fireToast({ title: "Action non enregistrée", msg: (e && e.message) || "Le serveur a refusé l'opération.", duration: 6000 });
    hydrateApi().catch(function () {});
  }
  function replaceInColl(coll, id, saved) {
    if (!saved || !saved.id) return;
    state[coll] = (state[coll] || []).map(function (x) { return x.id === id ? saved : x; });
    notify();
  }
  // Charge l'intégralité des données accessibles depuis l'API.
  function hydrateApi() {
    return api("GET", "/api/bootstrap").then(function (d) {
      state = {
        settings: d.settings || { info: {}, images: {} },
        rooms: d.rooms || [], experiences: d.experiences || [], dishes: d.dishes || [],
        gallery: d.gallery || [], reviews: d.reviews || [], reservations: d.reservations || [],
        messages: d.messages || [], accounts: d.accounts || [], clients: d.clients || [], audit: d.audit || []
      };
      if (d.user) setSession({ user: d.user.user, nom: d.user.nom, role: d.user.role });
      else { try { sessionStorage.removeItem(AUTH_KEY); } catch (e) {} }
      applySettings(); notify();
    });
  }
  // Détecte le backend ; bascule en mode API ou en repli localStorage.
  function boot() {
    loadSuperAdminSetup();
    return fetch(API + "/api/health", { credentials: "include" })
      .then(function (r) { return r.ok; }, function () { return false; })
      .then(function (ok) {
        if (ok) {
          MODE = "api";
          return api("GET", "/api/auth/needs-setup")
            .then(function (d) { apiNeedsSetup = !!(d && d.needsSetup); }, function () {})
            .then(hydrateApi);
        }
        MODE = "local"; load(); applySettings();
      })
      .catch(function () { MODE = "local"; load(); applySettings(); });
  }

  var DB = {
    IMG: IMG,
    // Collections locales uniquement (jamais synchronisées avec l'API).
    LOCAL_ONLY: { trash: true, audit: true },
    subscribe: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },
    all: function (coll) { return ((state && state[coll]) || []).slice(); },
    find: function (coll, id) { return ((state && state[coll]) || []).find(function (x) { return x.id === id; }); },
    insert: function (coll, obj) {
      obj.id = obj.id || uid(coll.slice(0, 2));
      state[coll] = state[coll] || [];
      state[coll].unshift(obj);
      notify();
      if (MODE === "api" && !DB.LOCAL_ONLY[coll]) api("POST", collEndpoint(coll), obj).then(function (saved) { replaceInColl(coll, obj.id, saved); }, apiFail);
      else persist();
      return obj;
    },
    update: function (coll, id, patch) {
      state[coll] = (state[coll] || []).map(function (x) { return x.id === id ? Object.assign({}, x, patch) : x; });
      notify();
      if (MODE === "api" && !DB.LOCAL_ONLY[coll]) api("PATCH", collEndpoint(coll, id), patch).then(null, apiFail);
      else persist();
    },
    remove: function (coll, id) {
      // Corbeille : conserve une copie restaurable de tout contenu supprimé
      // (sauf le journal et la corbeille elle-même).
      if (coll !== "trash" && coll !== "audit") {
        var doc = (state[coll] || []).find(function (x) { return x.id === id; });
        if (doc) {
          state.trash = state.trash || [];
          state.trash.unshift({ id: "tr_" + Math.random().toString(36).slice(2, 9), coll: coll, data: doc, ts: Date.now() });
          if (state.trash.length > 100) state.trash = state.trash.slice(0, 100);
        }
      }
      state[coll] = (state[coll] || []).filter(function (x) { return x.id !== id; });
      notify();
      if (MODE === "api" && !DB.LOCAL_ONLY[coll]) api("DELETE", collEndpoint(coll, id)).then(null, apiFail);
      else persist();
    },
    // Restaure un élément de la corbeille dans sa collection d'origine.
    restoreTrash: function (trashId) {
      var entry = (state.trash || []).find(function (t) { return t.id === trashId; });
      if (!entry) return null;
      state.trash = state.trash.filter(function (t) { return t.id !== trashId; });
      var doc = entry.data;
      state[entry.coll] = state[entry.coll] || [];
      state[entry.coll].unshift(doc);
      notify();
      if (MODE === "api" && !DB.LOCAL_ONLY[entry.coll]) api("POST", collEndpoint(entry.coll), doc).then(null, apiFail);
      else persist();
      return entry;
    },
    emptyTrash: function () { state.trash = []; emit(); },
    // Export / import de la base complète (sauvegarde).
    exportData: function () { return JSON.stringify(state, null, 2); },
    importData: function (json) {
      var data = JSON.parse(json); // lève une exception si invalide
      if (!data || typeof data !== "object" || !data.settings) throw new Error("Fichier de sauvegarde invalide.");
      state = data;
      applySettings(); emit();
    },
    reset: function () { if (MODE === "api") return; state = seed(); emit(); },

    // ---- Authentification & rôles ----
    // Asynchrone : renvoie une promesse résolue en "superadmin", "admin" ou false.
    login: function (u, p) {
      u = (u || "").trim();
      if (MODE === "api") {
        return api("POST", "/api/auth/login", { user: u, pass: p }).then(function (d) {
          return hydrateApi().then(function () { return (d.user && d.user.role) || "admin"; });
        }, function () { return false; });
      }
      // Mode local — authentification désactivée si aucun mot de passe n'est défini.
      // En production, seul le backend backend-postgres/ (JWT + bcrypt) doit être utilisé.
      if (SUPERADMIN.pass && u === SUPERADMIN.user && p === SUPERADMIN.pass) {
        setSession({ user: SUPERADMIN.user, nom: SUPERADMIN.nom, role: "superadmin" });
        return Promise.resolve("superadmin");
      }
      var acc = (state.accounts || []).find(function (a) { return a.user === u && a.pass && a.pass === p && a.actif !== false; });
      if (acc) { setSession({ user: acc.user, nom: acc.nom || acc.user, role: "admin", metier: acc.role || "reception" }); return Promise.resolve("admin"); }
      return Promise.resolve(false);
    },
    logout: function () {
      try { sessionStorage.removeItem(AUTH_KEY); } catch (e) {}
      if (MODE === "api") api("POST", "/api/auth/logout").then(null, function () {});
    },
    isAuthed: function () { return !!getSession(); },
    currentUser: function () { return getSession(); },
    isSuperadmin: function () { var s = getSession(); return !!s && s.role === "superadmin"; },
    hasSuperAdminSetup: function () {
      if (MODE === "api") return !apiNeedsSetup;
      try { return !!localStorage.getItem(SA_KEY); } catch (e) { return false; }
    },
    setupSuperAdmin: function (user, pass) {
      if (MODE === "api") {
        return api("POST", "/api/auth/setup", { user: user, pass: pass })
          .then(function () { apiNeedsSetup = false; return hydrateApi().then(function () { return true; }); }, function () { return false; });
      }
      try {
        if (localStorage.getItem(SA_KEY)) return false;
        var data = { user: (user || "rk.univers").trim(), pass: pass, nom: "RK Univers" };
        localStorage.setItem(SA_KEY, JSON.stringify(data));
        SUPERADMIN.user = data.user;
        SUPERADMIN.pass = data.pass;
        SUPERADMIN.nom  = data.nom;
        return true;
      } catch (e) { return false; }
    },
    mode: function () { return MODE; },

    // ---- Paramètres du site (super admin) ----
    getSettings: function () { return (state && state.settings) || { info: {}, images: {} }; },
    updateInfo: function (patch) {
      state.settings.info = Object.assign({}, state.settings.info, patch);
      applySettings(); notify();
      if (MODE === "api") api("PATCH", "/api/settings/info", patch).then(null, apiFail);
      else persist();
    },
    setSiteImage: function (key, val) {
      state.settings.images = state.settings.images || {};
      if (val) state.settings.images[key] = val; else delete state.settings.images[key];
      applySettings(); notify();
      if (MODE === "api") api("PUT", "/api/settings/image/" + encodeURIComponent(key), { value: val }).then(null, apiFail);
      else persist();
    },
    imageDefault: function (key) { return IMG_DEFAULTS[key]; }
  };

  // ---- Helpers de format ----
  window.BC = {
    xof: function (n) { return (Number(n) || 0).toLocaleString("fr-FR").replace(/\u202f/g, " ") + " FCFA"; },
    date: function (ts) {
      var d = new Date(ts);
      return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) +
             " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    },
    dateShort: function (iso) {
      if (!iso) return "—";
      var d = new Date(iso);
      return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    },
    WHATSAPP: "2250708080716",
    WHATSAPP_DISPLAY: "+225 07 08 08 07 16",
    PHONE: "+225 27 34 72 98 63",
    EMAIL: "bluecaravelle2023@gmail.com",
    ADDRESS: "Quartier Balmer, face à la BCEAO, San Pedro, Côte d'Ivoire"
  };
  BC_DEFAULTS = {
    WHATSAPP: window.BC.WHATSAPP, WHATSAPP_DISPLAY: window.BC.WHATSAPP_DISPLAY,
    PHONE: window.BC.PHONE, EMAIL: window.BC.EMAIL, ADDRESS: window.BC.ADDRESS
  };
  applySettings();

  // Synchronisation temps réel entre sessions admin (même navigateur, plusieurs onglets) :
  // si un administrateur ou le super admin modifie les données dans un onglet,
  // les autres onglets se mettent à jour automatiquement.
  window.addEventListener("storage", function (e) {
    if (MODE !== "local") return; // en mode API, les autres onglets se resynchronisent via le serveur
    if (e.key !== KEY || !e.newValue) return;
    try {
      state = JSON.parse(e.newValue);
      applySettings();
      listeners.forEach(function (fn) { try { fn(); } catch (er) {} });
    } catch (er) {}
  });

  // Détection du backend au démarrage. Le front-end attend « DB.ready »
  // avant le premier rendu (voir app.jsx).
  DB.ready = boot();

  window.DB = DB;
})();
