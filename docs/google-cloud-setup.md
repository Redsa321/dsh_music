# Google Cloud and YouTube setup

The app can demonstrate its complete interface without Google credentials. Complete these steps to sign in with Google, search YouTube, and save private playlists to a real account.

## 1. Create a project and enable the API

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project, for example `DSH-Music local`, or select an existing project dedicated to this app.
3. Open **APIs & Services → Library**.
4. Find and enable **YouTube Data API v3**.

## 2. Configure Google Auth Platform

1. Open **Google Auth Platform** for the project.
2. Configure the app name as `DSH-Music` and add your own support/contact email.
3. For local development, keep the app in testing mode.
4. Add every Google account that will test the app as a test user.
5. Configure the minimum scopes used by the app:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/youtube.force-ssl`

The YouTube scope lets DSH-Music create and edit private playlists on the user’s behalf. Google may require verification before a public production release. Local test users can work while the consent screen remains in testing.

## 3. Create the OAuth web client

1. Open **Google Auth Platform → Clients**.
2. Create an **OAuth client ID** with application type **Web application**.
3. Add the authorised JavaScript origin `http://localhost:3000`.
4. Add this authorised redirect URI exactly:

   ```text
   http://localhost:3000/api/auth/callback/google
   ```

5. Copy the values into `.env.local`:

   ```dotenv
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

Never commit the secret or a downloaded credentials JSON file.

## 4. Confirm the local account

Start PostgreSQL, apply migrations, and run `npm run dev`. Choose **Continue with Google** and use an account listed as a test user. The account must have a YouTube channel before the YouTube API can own a playlist.

The first grant may include a refresh token. If Google does not return one after an earlier test grant, disconnect DSH-Music, revoke the app in the Google account’s third-party access settings, and connect again.

## 5. Quotas and production

Review **APIs & Services → Quotas & System Limits** in the same project. Search and playlist-write operations have separate limits and costs. DSH-Music reports partial and quota-limited results instead of claiming success.

Before a public deployment:

- Replace localhost origins and callbacks with the HTTPS domain.
- Publish suitable privacy and terms pages.
- Complete any verification Google requests for the YouTube scope.
- Review current YouTube API policies and required player functionality.
- Restrict credentials to the intended application and APIs where Google supports it.

## Disconnecting and deletion

**Disconnect Google/YouTube access** revokes the project grant, deletes locally stored provider tokens and cached provider-authorised data, and signs the account out. Google revocation can invalidate all scopes previously granted to this project.

Deleting the DSH-Music account additionally removes its conversations, preferences, drafts, saved moods, feedback, themes, and history. Playlists already created in YouTube remain unless separately deleted while valid authorisation exists.
