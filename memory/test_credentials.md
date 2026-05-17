# Test Credentials — ALLO PIECES 76

## Admin Dashboard (`/admin`)
- **Email:** `admin@allopieces76.fr`
- **Password:** `admin123`

## Pro Page (`/pro`)
- **Access code:** `jossanpb09`

## Forgot Password (admin)
- En mode dev, l'endpoint `POST /api/auth/forgot-password` retourne directement le `reset_token` dans la réponse (pas d'email réel envoyé pour l'instant). Utiliser ce token dans `POST /api/auth/reset-password` pour réinitialiser.

## Stripe
- Mode TEST (clé dans variable d'environnement `STRIPE_API_KEY`).
- Cartes test Stripe : `4242 4242 4242 4242` (succès) — N'importe quelle date future + CVC.

## URL preview
- Front: `https://allo-pieces.preview.emergentagent.com`
- API: `https://allo-pieces.preview.emergentagent.com/api`
- Uploads (fichiers statiques): `https://allo-pieces.preview.emergentagent.com/uploads/...`
