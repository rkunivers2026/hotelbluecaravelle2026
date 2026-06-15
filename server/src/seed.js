/* =========================================================
   Bleu Caravelle — Données initiales (seed)
   Reproduit le jeu de démonstration du front (db.js) afin
   qu'un serveur vierge présente le même contenu.
   ========================================================= */

function U(id, w) {
  return "https://images.unsplash.com/photo-" + id + "?auto=format&fit=crop&w=" + (w || 1100) + "&q=70";
}

const IMG = {
  heroBeach: U("1507525428034-b723cf961d3e", 1900),
  room1: U("1611892440504-42a792e24d32"),
  room2: U("1582719478250-c89cae4dc85b"),
  room3: U("1590490360182-c33d57733427"),
  room4: U("1631049307264-da0ec9d70304"),
  room5: U("1578683010236-d716f9a3f461"),
  room6: U("1505693416388-ac5ce068fe85"),
  suite: U("1551882547-ff40c63fe5fa"),
  restaurant: U("1517248135467-4c7edcad34c4"),
  food6: U("1551024601-bec78aea704b"),
  boat: U("1544551763-46a013bb70d5"),
  beach: U("1519046904884-53103b34b206"),
  nature: U("1441974231531-c6227db76b6e"),
  spa: U("1540555700478-4be289fbecef"),
  surf: U("1502680390469-be75c86b636f"),
  ext1: U("1571896349842-33c89424de2d"),
  ext2: U("1520250497591-112f2f40a3f4"),
  event1: U("1519671482749-fd09be7ccebf"),
  event2: U("1530103862676-de8c9debad1d"),
  pool: U("1566073771259-6a8506099945")
};

// Générateur d'identifiants (même format que le front : préfixe + suffixe aléatoire)
export function uid(p) {
  return (p || "id") + "_" + Math.random().toString(36).slice(2, 9);
}

function isoOff(n) {
  const x = new Date();
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
}

export function buildSeed() {
  const DAY = 86400000;
  const roomAtlantique = uid("ch");
  const roomLagune = uid("ch");
  const roomBrise = uid("ch");

  const data = {
    settings: { info: {}, images: {} },

    rooms: [
      { id: roomAtlantique, nom: "Suite Atlantique", type: "Suite", prix: 180000, capacite: 3,
        description: "Notre suite signature ouvre en grand sur l'océan. Terrasse privée face au large, lit king-size habillé de lin, salle de bain en marbre et baignoire îlot. Le murmure de l'Atlantique pour seule bande-son.",
        equipements: ["Vue mer panoramique", "Terrasse privée", "Climatisation", "Wi-Fi fibre", "Petit-déjeuner inclus", "Minibar", "Coffre-fort", "Salle de bain en marbre"],
        photos: [IMG.suite, IMG.room2, IMG.ext1], disponible: true, unites: 2, dates_bloquees: [], mise_en_avant: true },
      { id: roomLagune, nom: "Lagune d'Or", type: "Supérieure", prix: 95000, capacite: 2,
        description: "Une chambre baignée de lumière, aux teintes sable et doré. Balcon avec vue partielle sur la mer, idéale pour un séjour à deux entre raffinement et sérénité.",
        equipements: ["Vue mer partielle", "Balcon privé", "Climatisation", "Wi-Fi fibre", "Petit-déjeuner inclus", "Minibar", "Coffre-fort"],
        photos: [IMG.room1, IMG.room3, IMG.pool], disponible: true, unites: 4, dates_bloquees: [], mise_en_avant: true },
      { id: roomBrise, nom: "Brise du Large", type: "Supérieure", prix: 110000, capacite: 2,
        description: "Spacieuse et lumineuse, ouverte sur les jardins de cocotiers et la piscine. Un cocon contemporain où dominent le bleu marine et le bois clair.",
        equipements: ["Vue jardin & piscine", "Balcon privé", "Climatisation", "Wi-Fi fibre", "Petit-déjeuner inclus", "Minibar"],
        photos: [IMG.room3, IMG.room4, IMG.pool], disponible: true, unites: 3, dates_bloquees: [], mise_en_avant: true },
      { id: uid("ch"), nom: "Suite Présidentielle Sassandra", type: "Suite", prix: 280000, capacite: 4,
        description: "L'expression ultime du luxe balnéaire. 80 m², salon séparé, double terrasse, accès direct à la plage privée et service de majordome. Pensée pour les séjours d'exception.",
        equipements: ["Vue mer panoramique", "Double terrasse", "Accès plage privée", "Majordome", "Climatisation", "Wi-Fi fibre", "Petit-déjeuner inclus", "Minibar", "Coffre-fort", "Salle de bain en marbre"],
        photos: [IMG.room2, IMG.suite, IMG.ext1], disponible: true, unites: 1, dates_bloquees: [], mise_en_avant: false },
      { id: uid("ch"), nom: "Caravelle Marine", type: "Standard", prix: 65000, capacite: 2,
        description: "L'essentiel du confort Bleu Caravelle. Une chambre élégante et apaisante, ouverte sur les jardins, parfaite pour découvrir San Pedro sans renoncer au raffinement.",
        equipements: ["Vue jardin", "Climatisation", "Wi-Fi fibre", "Petit-déjeuner inclus", "Coffre-fort"],
        photos: [IMG.room5, IMG.room6], disponible: true, unites: 6, dates_bloquees: [], mise_en_avant: false },
      { id: uid("ch"), nom: "Sable Doux", type: "Standard", prix: 70000, capacite: 2,
        description: "Une chambre douce et chaleureuse aux accents crème et laiton, à deux pas du restaurant et de la piscine. Le repaire idéal des voyageurs en quête de calme.",
        equipements: ["Vue jardin", "Climatisation", "Wi-Fi fibre", "Petit-déjeuner inclus", "Coffre-fort"],
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

    dishes: [
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
      { id: uid("pl"), nom: "Salade de fruits frais", categorie: "Dessert", prix: 4000, description: "", image: "assets/salade_fruits.png" },
      { id: uid("pl"), nom: "Crème brûlée à la vanille", categorie: "Dessert", prix: 5000, description: "", image: "" },
      { id: uid("pl"), nom: "Glace artisanale", categorie: "Dessert", prix: 4000, description: "", image: "" }
    ],

    gallery: [
      { id: uid("ph"), image: IMG.suite, categorie: "Chambres", legende: "Suite Atlantique au lever du jour" },
      { id: uid("ph"), image: IMG.room1, categorie: "Chambres", legende: "Lagune d'Or, lumière dorée" },
      { id: uid("ph"), image: IMG.restaurant, categorie: "Restaurant", legende: "La salle du restaurant Le Sextant" },
      { id: uid("ph"), image: IMG.food6, categorie: "Restaurant", legende: "Filet de bœuf, sauce au poivre" },
      { id: uid("ph"), image: IMG.ext1, categorie: "Extérieurs", legende: "La terrasse face à l'océan" },
      { id: uid("ph"), image: IMG.pool, categorie: "Extérieurs", legende: "Piscine à débordement" },
      { id: uid("ph"), image: IMG.beach, categorie: "Plage", legende: "Notre plage privée de sable fin" },
      { id: uid("ph"), image: IMG.boat, categorie: "Plage", legende: "Sortie en mer au crépuscule" },
      { id: uid("ph"), image: IMG.event1, categorie: "Événements", legende: "Dîner d'exception sous les étoiles" },
      { id: uid("ph"), image: IMG.event2, categorie: "Événements", legende: "Réception en bord de mer" },
      { id: uid("ph"), image: IMG.ext2, categorie: "Extérieurs", legende: "Jardins de cocotiers" },
      { id: uid("ph"), image: IMG.spa, categorie: "Chambres", legende: "Espace bien-être & spa" }
    ],

    reviews: [
      { id: uid("av"), nom_client: "Awa K.", note: 5, commentaire: "Un écrin de paix face à l'Atlantique. L'accueil, la vue, le restaurant : tout est pensé dans le moindre détail. Nous reviendrons sans hésiter.", affiche: true, lu: true, source: "Boîte à suggestions", date_creation: Date.now() - DAY * 9 },
      { id: uid("av"), nom_client: "Jean-Marc D.", note: 5, commentaire: "Service impeccable et cuisine raffinée aux saveurs locales. La Suite Atlantique est un véritable cocon. Le meilleur hôtel de San Pedro, sans conteste.", affiche: true, lu: true, source: "Boîte à suggestions", date_creation: Date.now() - DAY * 16 },
      { id: uid("av"), nom_client: "Fatou C.", note: 4, commentaire: "Séjour magnifique, vue à couper le souffle au réveil. La sortie en mer au coucher du soleil restera un souvenir inoubliable.", affiche: true, lu: true, source: "Boîte à suggestions", date_creation: Date.now() - DAY * 23 }
    ],

    reservations: [
      { id: uid("rs"), nom_complet: "Koffi N'Guessan", email: "koffi.ng@example.ci", telephone_whatsapp: "+225 07 11 22 33 44", type_chambre: "Suite Atlantique", date_arrivee: "2026-06-14", date_depart: "2026-06-18", nombre_personnes: 2, message: "Possibilité d'un transfert depuis l'aéroport ?", statut: "Nouvelle", lu: false, date_creation: Date.now() - 1000 * 60 * 60 * 5 },
      { id: uid("rs"), nom_complet: "Aïcha Traoré", email: "aicha.traore@example.com", telephone_whatsapp: "+225 05 66 77 88 99", type_chambre: "Lagune d'Or", date_arrivee: "2026-07-02", date_depart: "2026-07-05", nombre_personnes: 2, message: "Anniversaire de mariage, surprise possible ?", statut: "Traitée", lu: true, date_creation: Date.now() - 1000 * 60 * 60 * 30 },
      { id: uid("rs"), nom_complet: "Pierre Lefèvre", email: "p.lefevre@example.fr", telephone_whatsapp: "+33 6 12 34 56 78", type_chambre: "Suite Présidentielle Sassandra", date_arrivee: "2026-08-10", date_depart: "2026-08-20", nombre_personnes: 4, message: "Séjour en famille, deux enfants.", statut: "Confirmée", lu: true, date_creation: Date.now() - 1000 * 60 * 60 * 72 },
      { id: uid("rs"), nom_complet: "Awa Diomandé", email: "awa.diomande@example.ci", telephone_whatsapp: "+225 07 22 33 44 55", type_chambre: "Lagune d'Or", date_arrivee: isoOff(-2), date_depart: isoOff(3), nombre_personnes: 2, message: "", statut: "Confirmée", lu: true, date_creation: Date.now() - DAY * 6, chambre_id: roomLagune, unite: 1, checkin_at: Date.now() - DAY * 2 },
      { id: uid("rs"), nom_complet: "Hugo Bertin", email: "hugo.bertin@example.fr", telephone_whatsapp: "+33 6 88 77 66 55", type_chambre: "Suite Atlantique", date_arrivee: isoOff(-1), date_depart: isoOff(0), nombre_personnes: 2, message: "", statut: "Confirmée", lu: true, date_creation: Date.now() - DAY * 4, chambre_id: roomAtlantique, unite: 1, checkin_at: Date.now() - DAY * 1 },
      { id: uid("rs"), nom_complet: "Salimata Cissé", email: "salimata.c@example.ci", telephone_whatsapp: "+225 05 11 22 33 44", type_chambre: "Brise du Large", date_arrivee: isoOff(0), date_depart: isoOff(4), nombre_personnes: 2, message: "Arrivée prévue en fin d'après-midi.", statut: "Confirmée", lu: true, date_creation: Date.now() - DAY * 3 }
    ],

    messages: [
      { id: uid("ms"), nom: "Mariam Bamba", email: "mariam.b@example.ci", telephone: "+225 01 23 45 67 89", sujet: "Privatisation pour séminaire", message: "Bonjour, nous souhaitons organiser un séminaire d'entreprise de 40 personnes en septembre. Quelles sont vos formules ?", lu: false, date_creation: Date.now() - 1000 * 60 * 60 * 8 },
      { id: uid("ms"), nom: "David Kouamé", email: "david.k@example.com", telephone: "+225 07 98 76 54 32", sujet: "Mariage en bord de mer", message: "Nous cherchons un lieu pour notre mariage en décembre. Avez-vous une offre événementielle ?", lu: true, date_creation: Date.now() - 1000 * 60 * 60 * 40 }
    ],

    // Comptes du personnel — passHash est ajouté à la création via l'API (jamais exposé au front).
    accounts: [
      { id: uid("ac"), nom: "Administrateur", user: "admin", actif: true, role: "manager", date_creation: Date.now() }
    ],

    clients: [],
    audit: [],
    memos: [
      { id: uid("mo"), texte: "Bienvenue sur les notes de service — utilisez ce fil pour la coordination entre la réception, le restaurant, le housekeeping, la comptabilité et la direction.", user: "Administrateur", auteur: "admin", role: "Directeur", ts: Date.now() - DAY, lu_par: [] }
    ],

    // Super administrateur (créé via /api/auth/setup ou variables d'environnement).
    superadmin: null
  };

  return data;
}
