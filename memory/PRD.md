# ALLO PIECES 76 — PRD

## Original Problem Statement
Site e-commerce moderne et mobile-first pour la boutique de pièces auto **ALLO PIECES 76**. 100% en français, esthétique automobile rouge/noir/blanc.

Fonctionnalités clés :
- Catalogue produits public avec recherche + catégories
- Système de devis (Devis)
- Dashboard Admin JWT-secured (`/admin`)
- Page Pro protégée par code (`/pro`)
- Intégration Stripe (TEST → LIVE plus tard)
- Phase 2 : admin enrichi (uploads, CSV import, promotions, paramétrage, audit, etc.)

## Stack
- **Frontend** : React + Tailwind + Shadcn UI (`/app/frontend`)
- **Backend** : FastAPI + Motor (`/app/backend/server.py`)
- **DB** : MongoDB
- **Paiement** : Stripe (mode TEST)
- **Stockage fichiers** : local `/app/backend/uploads/` (mount FastAPI StaticFiles → `/uploads`)
- **Image processing** : Pillow (resize 2048px max + WebP + thumbnail 300x300)
- **CSV** : pandas/csv standard

## Personas
1. **Particulier** : cherche une pièce pour sa voiture, demande devis ou commande.
2. **Garagiste/Pro** : tarifs préférentiels, formulaire d'inscription Pro, contact direct.
3. **Admin (gérant boutique)** : gère catalogue, devis, promotions, paramètres — débutant, doit pouvoir tout faire sans code.

## Core Requirements (Phase 1 + Phase 2)

### Phase 1 — Marketing & UX (FAIT)
- Titre + bullets confiance (48h expédition, 5 ans expérience)
- Section "Pourquoi choisir Allo Pieces 76 ?" (4 cartes)
- FAQ 4 questions/réponses (accordéon)
- Sections conditionnelles (toggles ON/OFF côté admin)

### Phase 2 — Admin complet (FAIT — 2026-05-17)
- Multi-image upload (resize/WebP/thumb)
- PDF upload (max 10MB)
- Logo upload + animation (pulse) + couleurs brand
- Import CSV (template + preview + mapping auto + rapport d'erreurs + confirm)
- Promotions CRUD + bannière homepage (carrousel + planning ON/OFF)
- Quick Links CRUD + reorder + toggle (téléphone, WhatsApp, Leboncoin, email…)
- Feature Toggles (10 options) — activer/désactiver sections du site
- Site Settings (logo, animation, couleurs, contacts)
- Inscription Pro publique → notification WhatsApp + email (mocked) + validation admin
- Mot de passe oublié (token dev mode)
- Soft-delete corbeille + restauration + suppression définitive
- Audit Log (toutes les actions admin)
- Produits épinglés (vedettes affichées en haut de homepage)
- Analytics Dashboard (compteurs + activité récente)
- Page "How To" / guide d'utilisation 5 étapes

## API Endpoints

### Public
- `GET /api/products` (search, category, featured)
- `GET /api/products/{id}`
- `POST /api/quotes`
- `POST /api/pro-registrations`
- `POST /api/pro/validate` (code pro)
- `GET /api/promotions` (actives uniquement)
- `GET /api/quicklinks` (actifs)
- `GET /api/feature-toggles`
- `GET /api/settings`
- `GET /api/categories`
- `POST /api/payments/checkout` (Stripe)

### Auth
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### Admin (JWT bearer required)
- Products CRUD + soft-delete + `/restore` + `/permanent` + `/pin` + `/trash/list`
- `POST /api/admin/upload/images` / `pdf` / `logo` / `promotion-image`
- CSV: `GET /admin/products/csv-template`, `POST /admin/products/csv-preview`, `POST /admin/products/csv-import-confirm`
- Promotions CRUD `/admin/promotions`
- Quick Links CRUD + reorder `/admin/quicklinks`
- Feature toggles `/admin/feature-toggles`
- Site settings `PUT /admin/settings`
- Pro registrations `/admin/pro-registrations`
- `/admin/audit-log`
- `/admin/analytics`

## DB Collections
- `users` (admins)
- `products` (with images[], pdf, featured, is_deleted)
- `quotes` (devis)
- `payment_transactions` (Stripe)
- `promotions`
- `quicklinks`
- `feature_toggles`
- `site_settings` (singleton)
- `pro_registrations`
- `audit_logs`
- `password_reset_tokens`

## Backlog / Pending

### P1
- **Logo officiel** : à fournir par utilisateur → upload via admin Paramètres
- **Stripe LIVE** : utilisateur fournira les clés quand prêt

### P2
- **Envoi email réel** des devis/pro registrations (actuellement seulement sauvegardés en BDD). Intégration Resend ou SMTP Gmail recommandée.
- **WhatsApp Business API** : actuellement seulement liens `wa.me` (gratuit). Pour notifications automatiques, intégration Twilio nécessaire.

### P3 / Future
- Système de panier complet (pas seulement paiement libre montant)
- Comptes clients particuliers (suivi commandes)
- Notifications push admin pour nouveaux devis/inscriptions
- Export comptable / facturation PDF

## Architecture Notes
- `server.py` dépasse 1300 lignes — à refactorer en `/app/backend/routes/*.py` (uploads, csv, promotions, quicklinks, settings, pro_registrations, audit, analytics)
- Frontend : composants admin dans `/app/frontend/src/components/admin/`, composants public dans `/app/frontend/src/components/public/`
- HTTPBearer renvoie 403 (et non 401) pour token manquant — comportement FastAPI par défaut, fonctionnellement OK
