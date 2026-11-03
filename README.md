# DSH-Music

DSH-Music turns a short conversation about how you feel into an editable, playable music queue. The local guest demo works without service credentials. With Google and OpenAI configured, signed-in users can create private YouTube playlists, save moods, keep history, and personalise the glass interface.

## Requirements

- Node.js 22.22.2 or a newer supported LTS release (the app also builds on Node.js 20.20.2)
- Docker with Docker Compose
- npm
- Optional for live mode: an OpenAI API key and a Google Cloud OAuth client

## Quick start: guest demo

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and choose **Try the demo**. Demo chat, playlists, moods, feedback, themes, and history stay in this browser. Demo mode does not call paid APIs or create a YouTube playlist.

## Full local setup

1. Copy `.env.example` to `.env.local` and replace every placeholder secret.
2. Start PostgreSQL:

   ```bash
   docker compose up -d postgres
   ```

3. Generate the Prisma client and apply migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. Follow [Google Cloud and YouTube setup](docs/google-cloud-setup.md), then add the client ID and secret to `.env.local`.
5. Add `OPENAI_API_KEY` to `.env.local`. The key is used only by server routes.
6. Start the app with `npm run dev`.

Generate local secrets with `openssl rand -base64 32`. Use separate values for `NEXTAUTH_SECRET` and `TOKEN_ENCRYPTION_KEY`. Keep `.env.local` private.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local development |
| `npm run build` | Create a production build |
| `npm start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check TypeScript |
| `npm test` | Run unit/component tests |
| `npm run test:e2e` | Run desktop and mobile browser checks |
| `npm run db:migrate` | Create/apply a local Prisma migration |
| `npm run db:deploy` | Apply committed migrations |
| `npm run db:studio` | Inspect the local database |

`docker compose stop postgres` stops PostgreSQL while preserving data. `docker compose down` removes the container but retains the named database volume.

## Live-service behaviour

- DSH-Music uses Google OAuth for the app account and asks for YouTube access in context.
- AI chat uses the OpenAI Responses API with `store: false`; DSH-Music keeps the conversation required for the product in PostgreSQL.
- Generated tracks are resolved to real YouTube videos before playback or saving.
- The player is the official visible YouTube iframe. Browser autoplay, availability, adverts, and region restrictions still apply.
- **Save privately to YouTube** is a separate action from playlist generation.
- Deleting a DSH-Music account removes application data and provider credentials. Existing playlists in YouTube remain unless the user explicitly deletes them there or uses a supported remote-delete action while connected.

## Troubleshooting

**The demo does not need credentials.** If it fails, clear only the DSH-Music demo data from the in-app Settings screen and reload.

**`redirect_uri_mismatch`:** the URI in Google Cloud must exactly match the callback documented in [the Google setup guide](docs/google-cloud-setup.md), including scheme, host, port, and path.

**Database connection refused:** run `docker compose ps`, wait for the Postgres health check, and confirm `DATABASE_URL` matches the Compose credentials.

**Prisma client is missing:** run `npm run db:generate` after installing dependencies.

**YouTube quota error:** generation and search are quota-bound. Check the quota page for the same Google Cloud project as the OAuth client, then retry after quota is available.

**Playback is unavailable:** some videos cannot be embedded or are restricted by region. Replace the track or open it on YouTube.

## Architecture

The Next.js application contains the responsive UI and server route handlers. PostgreSQL stores private account data, conversations, drafts, saved moods, feedback, and themes. Provider clients stay behind server-only modules. Typed contracts separate the UI from OpenAI and YouTube details so a later mobile client can reuse the same backend concepts.
