# ALLO PIECES 76 - PRD (Product Requirements Document)

## Problème original
Site web pour ALLO PIECES 76 - Magasin de pièces auto situé en Normandie (76).

## Architecture technique
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + TailwindCSS + Shadcn UI
- **Paiement**: Stripe Checkout (clé TEST)
- **Auth**: JWT pour admin

## Fonctionnalités implémentées ✅

### Page d'accueil (/)
- ✅ Header sticky avec logo ALLO PIECES 76 + bouton "Devis gratuit"
- ✅ Hero avec recherche de produits et boutons CTA
- ✅ 6 catégories cliquables avec filtrage
- ✅ Catalogue produits avec badges stock (En stock / Sur commande / Rupture)
- ✅ Section livraison France (métropolitaine, 24-72h, retrait possible)
- ✅ Section "Besoin d'un devis ?" (fond jaune, CTA visible)
- ✅ Section Contact 3 colonnes (contacts, horaires, devis rapide)
- ✅ Footer complet avec email allopiece27@gmail.com
- ✅ Barre mobile fixe en bas (APPELER rouge / WHATSAPP vert)

### Système de Devis
- ✅ Formulaire modal (Nom, Email, Téléphone, Plaque/VIN, Pièce)
- ✅ Bouton accessible depuis header, hero, section CTA, section contact
- ✅ Stockage en base MongoDB
- ✅ Gestion admin avec statistiques

### Page Admin (/admin)
- ✅ Login JWT (admin@allopieces76.fr / admin123)
- ✅ Onglet Produits: CRUD complet + recherche
- ✅ Onglet Devis: Liste + stats + détail + mise à jour statut

### Page Pro (/pro)
- ✅ Gatekeeper avec code d'accès (jossanpb09)
- ✅ Notes internes, fournisseurs, références prioritaires

### Paiement Stripe
- ✅ Modal avec montant personnalisé
- ✅ Redirection Stripe Checkout
- ✅ Pages success/cancel

### Mobile-First
- ✅ Design responsive complet
- ✅ Menu hamburger fonctionnel
- ✅ Barre fixe bas (APPELER / WHATSAPP)

## Contacts intégrés
- Email: allopiece27@gmail.com
- WhatsApp Pro: +33 6 86 72 13 72
- Téléphone: 02 32 51 04 33
- Leboncoin: https://www.leboncoin.fr/boutique/6876238/allo_pieces_76.htm
- Horaires: Lun-Sam 09h30-18h30, Dim fermé

## Tests effectués
- Backend: 92.3% succès
- Frontend: 98% succès
- Global: 95% succès

## En attente (fournis par le client)
- [ ] Logo officiel
- [ ] Clés Stripe LIVE
- [ ] Clé API email (optionnel)

## Version
- Date: 25/01/2026
- Statut: PRÊT POUR VALIDATION
