# Outlook Email Extractor (Graph API, OAuth)

Same idea as an IMAP-based extractor, but built on Microsoft Graph with OAuth
instead of an app password. Microsoft has been phasing out Basic Auth /
app-password access to IMAP and SMTP (fully enforced for most accounts as of
2025–2026), so OAuth is now the only reliable way to do this.

What it does:
- You sign in with your Microsoft account (consent screen, no password ever
  touches this app).
- Lists your mail folders.
- Pulls messages from a chosen folder as **plain text** (Graph converts the
  body for you — no HTML stripping needed) starting at a given offset, up to
  a limit.
- Zips them into individual `.txt` files and downloads the zip.

## 1. Register an app in Azure (one-time, ~5 minutes)

1. Go to https://portal.azure.com → **Azure Active Directory** (a.k.a.
   **Microsoft Entra ID**) → **App registrations** → **New registration**.
2. Name it anything, e.g. "Email Extractor".
3. Under **Supported account types**, choose **"Accounts in any
   organizational directory and personal Microsoft accounts"** (this is what
   lets it work with both outlook.com and work/school accounts).
4. Under **Redirect URI**, choose platform **Web** and enter:
   - For local testing: `http://localhost:3000/api/auth/callback`
   - You'll add the Vercel URL here too once deployed (step 4 below).
5. Click **Register**.
6. On the app's **Overview** page, copy the **Application (client) ID** —
   this is `MS_CLIENT_ID`.
7. Go to **Certificates & secrets** → **New client secret**. Copy the
   secret's **Value** immediately (it's hidden after you leave the page) —
   this is `MS_CLIENT_SECRET`.
8. Go to **API permissions** → **Add a permission** → **Microsoft Graph** →
   **Delegated permissions** → add `Mail.Read` and `User.Read` (User.Read is
   usually there by default). Admin consent isn't required for these two on
   personal/consumer scopes; for a work/school tenant your admin may need to
   grant consent once.

## 2. Configure environment variables

Copy `.env.example` to `.env.local` for local dev and fill in:

```
MS_CLIENT_ID=<from step 1.6>
MS_CLIENT_SECRET=<from step 1.7>
MS_TENANT_ID=common
MS_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

## 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, click **Connect Outlook Account**, sign in, and
try an extraction.

## 4. Deploy to Vercel

```bash
npm install -g vercel   # if you don't have it
vercel
```

Then in the Vercel project dashboard → **Settings → Environment Variables**,
add the same four variables as above, but set:

```
MS_REDIRECT_URI=https://<your-project>.vercel.app/api/auth/callback
```

Go back to your Azure app registration → **Authentication** and add that
same URL to the list of **Redirect URIs** (you can have both the localhost
one and the Vercel one registered at the same time).

Redeploy (`vercel --prod`) after setting the env vars.

## Notes & limits

- **Token storage**: for simplicity this stores the Graph access/refresh
  token in an `httpOnly` cookie, scoped to your browser session. That's fine
  for a personal single-user tool, but don't put someone else's mailbox
  credentials through it — cookies aren't encrypted at rest, only
  transport-protected (`secure` flag + `httpOnly`).
- **Rate/size limits**: Vercel serverless functions have execution time
  limits (10s on the free Hobby plan, longer on Pro). Very large `limit`
  values (many hundreds of emails) may time out — if that happens, lower the
  limit or extract in batches using `Start From`.
- **Scopes**: only `Mail.Read` and `User.Read` are requested — this app
  can't send mail, delete anything, or touch other Microsoft 365 data.
- To extract from a **shared or specific label** rather than a top-level
  folder, note that Outlook "folders" here map 1:1 to Graph `mailFolders` —
  nested folders (e.g. a sub-label under Inbox) will show up by their own
  name in the dropdown.
