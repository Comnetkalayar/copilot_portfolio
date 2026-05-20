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

## Deploying the site publicly

This project includes a Node.js CMS backend, so deploy it to a host that supports Node apps.

### Recommended: Render

1. Push the project to GitHub.
2. Create a new Web Service on Render.
3. Connect your GitHub repository.
4. Set the build command to:

```bash
npm install
```

5. Set the start command to:

```bash
npm run cms
```

6. Deploy and open the public URL Render provides.

### Alternative hosts

- Railway
- Fly.io
- Vercel (Node support)
- DigitalOcean App Platform

### What the host needs

The deployment should start `server.js`, which uses the environment port automatically:

```js
const PORT = process.env.PORT || 8080;
```

### Static-only deployment

If you do not need the CMS, host only the static files (`index.html`, `styles.css`, `script.js`) on GitHub Pages, Netlify, or Vercel. For the full admin/editor experience, use a Node host and `npm run cms`.
