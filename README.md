# Portfolio Website

A clean, responsive static portfolio website scaffold built with HTML, CSS, and JavaScript.

## Files

- `index.html` — main landing page.
- `styles.css` — visual styling and responsive layout.
- `script.js` — mobile nav toggle, contact form handling, and current year insert.
- `project-detail.html` — sample project detail page.

## Usage

Open `index.html` in your browser to view the site.

To customize:
- replace `Your Name` with your own name.
- update the `About`, `Skills`, `Projects`, and `Contact` content.
- update the social links in `index.html` to your GitHub, LinkedIn, and Twitter profiles.
- change `mailto:hello@example.com` in `index.html` to your email.
- replace the placeholder Formspree endpoint in the contact form `action` attribute with your own Formspree URL to send messages automatically.
- preview `project-detail.html` for a sample project detail page.

## Local CMS

- Install dependencies:

```powershell
npm install
```

- Start the lightweight CMS server (serves the site and provides a simple API):

```powershell
npm run cms
```

- Open `http://localhost:8080/admin.html` to edit content (saved to `data.json`).
- Default admin password: `admin123`.
- After logging in, you can change the admin password from the admin panel.
- While the CMS server is running, the site uses dynamic content from the API.

## Deploying to Vercel (Auto Deploy on Git Push)

This repository is now Vercel-ready:

- Static pages are served normally.
- API routes are handled by `api/index.js` (serverless function).
- Frontend calls `/api/*` endpoints (same paths used in local CMS mode).

### One-time setup

1. Push this repo to GitHub.
2. In Vercel, create a new project and import this repository.
3. Add environment variables in Vercel Project Settings:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (recommended) or `SUPABASE_KEY`
   - `SUPABASE_BUCKET` (optional, for uploads)
4. In Supabase SQL Editor, run:
   - `sql/create_tables.sql`
   - `sql/enable_site_data_access.sql` (needed if using publishable/anon key)

### Auto deploy behavior

- After the Vercel project is connected, every push to your production branch (usually `main`) triggers an automatic deploy.

### Local development

- `npm run cms` or `npm start` runs local Express server (`server.js`) for development/testing.

### Static-only deployment

If you do not need the CMS, host only the static files (`index.html`, `styles.css`, `script.js`) on GitHub Pages, Netlify, or Vercel. For the full admin/editor experience, keep `/api/*` endpoints deployed and Supabase configured.

## PWA / APK packaging

1. Build the production site:

```powershell
npm run build
```

2. Ensure the generated `dist/` folder contains:
   - `index.html`
   - `login.html`
   - `admin.html`
   - `project-detail.html`
   - `manifest.json`
   - `sw.js`
   - `icons/`

3. Use a valid PWA-to-APK tool instead of renaming a ZIP file to `.apk`.
   Recommended options:
   - `bubblewrap` for Trusted Web Activity
   - `capacitor` or `cordova` for a native wrapper

4. Example Bubblewrap flow:
   - Install Bubblewrap: `npm install -g @bubblewrap/cli`
   - Run: `bubblewrap init --manifest=https://your-site-url/manifest.json`
   - Build: `bubblewrap build`

5. The APK parse error means the generated package is not a valid Android package, not that the web app code is broken.

6. If you need a local test APK, host the built `dist/` site over HTTPS or deploy it first, then point Bubblewrap at that HTTPS URL.
