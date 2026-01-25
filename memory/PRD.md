# ALLO PIECES 76 - PRD (Product Requirements Document)

## Problème original
Site web pour ALLO PIECES 76 - Magasin de pièces auto situé en Normandie (76).
- Page publique one-page avec catalogue et recherche
- Paiement en ligne Stripe
- Admin pour gestion produits
- Page /pro avec accès par code

## Architecture technique
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + TailwindCSS + Shadcn UI
- **Paiement**: Stripe Checkout (clé TEST)
- **Auth**: JWT pour admin

## Personas utilisateurs
1. **Particuliers** - Cherchent des pièces pour leur véhicule personnel
2. **Professionnels** - Garagistes, carrossiers (accès WhatsApp dédié)
3. **Admin** - Gestion du catalogue produits

## Fonctionnalités implémentées (25/01/2026)

### Page d'accueil (/)
- ✅ Header sticky avec logo ALLO PIECES 76
- ✅ Hero avec recherche de produits
- ✅ 6 catégories (Carrosserie, Éclairage, Rétroviseur, Refroidissement, Mécanique, Accessoires)
- ✅ Catalogue produits avec filtrage
- ✅ Badges stock (En stock, Sur commande, Rupture)
- ✅ Boutons WhatsApp Pro / Téléphone / Leboncoin
- ✅ Section livraison France
- ✅ Section contact & horaires
- ✅ Footer complet
- ✅ Barre mobile fixe en bas (APPELER / WHATSAPP)

### Page Admin (/admin)
- ✅ Authentification JWT (admin@allopieces76.fr / admin123)
- ✅ Liste produits avec recherche
- ✅ Ajouter / Modifier / Supprimer produits
- ✅ Champs: Référence, Nom, Prix, Stock, Catégorie, Véhicule

### Page Pro (/pro)
- ✅ Gatekeeper avec code d'accès (jossanpb09)
- ✅ Notes internes et procédures
- ✅ Informations fournisseurs
- ✅ Références prioritaires

### Paiement Stripe
- ✅ Modal de paiement avec montant personnalisé
- ✅ Redirection vers Stripe Checkout
- ✅ Pages success/cancel
- ✅ Collection payment_transactions en DB

## Données de démo
- 15 produits créés automatiquement au démarrage
- Admin par défaut créé

## Contacts intégrés
- WhatsApp Pro: +33 6 86 72 13 72
- Téléphone: 02 32 51 04 33
- Leboncoin: https://www.leboncoin.fr/boutique/6876238/allo_pieces_76.htm
- Horaires: Lun-Sam 09h30-18h30

## Backlog P0/P1/P2

### P0 (Critique)
- [x] Toutes les fonctionnalités de base implémentées

### P1 (Important)
- [ ] Ajouter le logo officiel fourni par le client
- [ ] Passer aux clés Stripe LIVE pour production
- [ ] Ajouter images produits

### P2 (Améliorations futures)
- [ ] Tarifs pros / remises (page /pro)
- [ ] Historique des paiements dans admin
- [ ] Panier d'achat
- [ ] Notifications email après commande
- [ ] Système de devis

## Prochaines étapes
1. Télécharger et intégrer le logo officiel du client
2. Configurer les clés Stripe LIVE
3. Ajouter plus de produits réels au catalogue
