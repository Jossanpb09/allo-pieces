# ALLO PIECES 76 - PRD (Product Requirements Document)

## Problème original
Site web pour ALLO PIECES 76 - Magasin de pièces auto situé en Normandie (76).
- Page publique one-page avec catalogue et recherche
- Paiement en ligne Stripe
- Système de devis
- Admin pour gestion produits et devis
- Page /pro avec accès par code

## Architecture technique
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + TailwindCSS + Shadcn UI
- **Paiement**: Stripe Checkout (clé TEST)
- **Auth**: JWT pour admin

## Personas utilisateurs
1. **Particuliers** - Cherchent des pièces pour leur véhicule personnel
2. **Professionnels** - Garagistes, carrossiers (accès WhatsApp dédié)
3. **Admin** - Gestion du catalogue produits et demandes de devis

## Fonctionnalités implémentées (25/01/2026)

### Page d'accueil (/)
- ✅ Header sticky avec logo ALLO PIECES 76
- ✅ Hero avec recherche de produits
- ✅ Bouton "Demander un devis" (formulaire modal)
- ✅ 6 catégories (Carrosserie, Éclairage, Rétroviseur, Refroidissement, Mécanique, Accessoires)
- ✅ Catalogue produits avec filtrage
- ✅ Badges stock (En stock, Sur commande, Rupture)
- ✅ Boutons WhatsApp Pro / Téléphone / Leboncoin
- ✅ Section livraison France
- ✅ Section contact & horaires
- ✅ Footer avec email allopiece27@gmail.com
- ✅ Barre mobile fixe en bas (APPELER / WHATSAPP)

### Système de Devis (NOUVEAU)
- ✅ Formulaire de demande de devis (nom, email, téléphone, plaque/VIN, pièce)
- ✅ Stockage en base MongoDB
- ✅ Gestion admin avec onglet dédié
- ✅ Statistiques (total, en attente, traités, envoyés)
- ✅ Détail et mise à jour de statut
- ✅ Notes admin internes

### Page Admin (/admin)
- ✅ Authentification JWT (admin@allopieces76.fr / admin123)
- ✅ Onglet Produits: Liste, recherche, CRUD
- ✅ Onglet Devis: Liste, statistiques, détail, mise à jour statut

### Page Pro (/pro)
- ✅ Gatekeeper avec code d'accès (jossanpb09)
- ✅ Notes internes et procédures
- ✅ Informations fournisseurs
- ✅ Références prioritaires

### Paiement Stripe
- ✅ Modal de paiement avec montant personnalisé
- ✅ Redirection vers Stripe Checkout
- ✅ Pages success/cancel

## Contacts intégrés
- Email: allopiece27@gmail.com
- WhatsApp Pro: +33 6 86 72 13 72
- Téléphone: 02 32 51 04 33
- Leboncoin: https://www.leboncoin.fr/boutique/6876238/allo_pieces_76.htm
- Horaires: Lun-Sam 09h30-18h30

## Backlog P0/P1/P2

### P0 (Critique) - FAIT
- [x] Page d'accueil one-page
- [x] Catalogue produits
- [x] Admin CRUD produits
- [x] Paiement Stripe
- [x] Page Pro
- [x] Système de devis

### P1 (Important)
- [ ] Intégrer le logo officiel (en attente du fichier)
- [ ] Passer aux clés Stripe LIVE pour production
- [ ] Envoi email automatique lors d'une demande de devis

### P2 (Améliorations futures)
- [ ] Images pour les produits
- [ ] Génération PDF de devis
- [ ] Tarifs pros / remises (page /pro)
- [ ] Historique des paiements dans admin
- [ ] Panier d'achat
- [ ] Notifications email après commande

## Prochaines étapes
1. Télécharger et intégrer le logo officiel du client
2. Configurer les clés Stripe LIVE
3. Ajouter envoi email automatique (nécessite service email)
