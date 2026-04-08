# HermesChat

Application de chat multi-plateforme (iOS, Android, Web) connectée à Hermes Agent. Architecture multi-tenant B2B avec proxy sécurisé, streaming temps réel, saisie vocale et notifications push.

## Stack

- **Frontend** : Expo (React Native) + React Native for Web
- **Backend** : Node.js / Express / TypeScript
- **Base de données** : SQLite (dev) / PostgreSQL (prod)
- **ORM** : Drizzle
- **State** : Zustand
- **Monorepo** : npm workspaces + Turborepo

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Configuration

```bash
cp .env.example packages/api-server/.env
```

Modifier les valeurs dans `.env` (les valeurs par défaut fonctionnent en mode mock).

### 3. Initialiser la base de données

```bash
cd packages/api-server
npx drizzle-kit push
npx tsx src/database/seed.ts
```

### 4. Lancer le backend

```bash
npm run dev:api
```

### 5. Lancer le frontend

```bash
npm run dev:mobile
```

Puis appuyer sur `w` pour ouvrir sur le web, `i` pour iOS, ou `a` pour Android.

### Identifiants de test

- **Tenant** : `demo`
- **Email** : `demo@example.com`
- **Mot de passe** : `demo1234`

## Docker

```bash
# Configurer les variables d'environnement
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
export ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Lancer
docker compose up -d
```

## Structure du projet

```
hermes-chat/
├── apps/mobile/          # App Expo (iOS + Android + Web)
│   ├── app/              # Expo Router (file-based routing)
│   ├── components/       # Composants UI et chat
│   ├── stores/           # Zustand stores
│   ├── services/         # API clients, storage, audio
│   └── constants/        # Theme, branding, config
├── packages/api-server/  # Backend proxy sécurisé
│   ├── src/routes/       # Auth, conversations, chat, transcription
│   ├── src/services/     # Auth, Hermes proxy, Whisper
│   ├── src/database/     # Schema Drizzle + migrations
│   └── src/middleware/    # Auth, rate limit, validation
└── docker-compose.yml
```

## API

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/v1/auth/login` | Connexion |
| POST | `/api/v1/auth/refresh` | Rafraîchir le token |
| POST | `/api/v1/auth/logout` | Déconnexion |
| GET | `/api/v1/auth/me` | Profil utilisateur |
| GET | `/api/v1/conversations` | Liste des conversations |
| POST | `/api/v1/conversations` | Nouvelle conversation |
| GET | `/api/v1/conversations/:id` | Détail + messages |
| PATCH | `/api/v1/conversations/:id` | Modifier |
| DELETE | `/api/v1/conversations/:id` | Supprimer |
| POST | `/api/v1/conversations/:id/messages` | Envoyer (SSE stream) |
| POST | `/api/v1/transcribe` | Transcription audio |
| GET | `/api/v1/tenant/branding?slug=xxx` | Branding public |
