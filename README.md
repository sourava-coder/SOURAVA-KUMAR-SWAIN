# Portfolio website and content dashboard

The public portfolio remains plain HTML, CSS and vanilla JavaScript. Its content is served by a FastAPI API backed by Supabase PostgreSQL and Supabase Storage. The separate responsive admin dashboard lives at `/admin/`; saved changes become available to the public site immediately, and open pages poll the API every 15 seconds.

## Folder map
```
index.html              the page skeleton (sections and their ids)
css/
  tokens.css            colours, fonts, dark theme   <- change the look here
  base.css              reset, page background, typography
  layout.css            loader, navigation, buttons, section layout
  hero.css              hero: name, typing line, photo frame, chips
  sections.css          About, Skills, Projects, Journey, Education, Resume, Contact, footer
  animations.css        entrance, tech strip, scroll reveals, hover effects, reduced motion
  print.css             prints only the resume
js/
  data.js               bundled preview and initial content to import
  config.js             API origin for a separate frontend/backend deployment
  main.js               loads API content and refreshes it in the background
  utils.js              small helpers
  content.js            renders live portfolio content, filters, resume and contact form
  ui.js                 typing line, loader, clock, menu, theme, scroll progress
  hero.js               photo, chips, tech strip, pointer tilt and glow
  reveal.js             scroll-in animations
  boot.js               runs first so animated parts start hidden
assets/
  hero.png               bundled profile image
  logo.png               site logo
admin/
  index.html            dashboard sign-in and editor
  admin.css             responsive dark glass dashboard styling
  admin.js              authenticated dashboard and content editor
backend/
  app/                  FastAPI, PostgreSQL access, auth and upload handling
  schema.sql            database schema
  requirements.txt      backend dependencies
  .env.example          local environment variable template
tools/
  build-single-file.py  legacy static single-file export
  export-content.js     exports the current js/data.js as first-run seed data
```

The backend stores profile, skills, projects, social links, experience, education, certifications and website settings in separate PostgreSQL tables. `js/data.js` is only the bundled/offline preview and initial import source; after the API is configured, the database is the live source of truth. Do not rebuild `dist/portfolio.html` to publish dashboard edits.

## Local development

1. Create a Supabase project. In **Project Settings → Database**, copy the connection string (use the direct connection string or the session pooler if your host requires IPv4). In **Project Settings → API**, copy the project URL and the `service_role` key. Keep the service-role key private.
2. Create a **public** Supabase Storage bucket named `portfolio`. Public reads are required for portfolio images and the downloadable CV; uploads are performed only by the authenticated backend using the service-role key.
3. Copy `backend/.env.example` to `backend/.env`, then set `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `FRONTEND_ORIGINS`. Keep `.env` out of version control. Set `COOKIE_SECURE=false` only for local HTTP development.
4. From the repository root, create the Python environment and install dependencies:

   ```powershell
   py -3 -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
   ```

5. Make a local copy of `backend\app\local_auth.py.example` named `backend\app\local_auth.py`, then replace the placeholder with your own four-digit value, for example `ADMIN_PIN = "4827"`. This local-only file is gitignored. Do not commit or share it. The PIN is verified by the FastAPI process in constant time; the API does not write it, a password hash, admin account or login record to Supabase.
6. In one PowerShell terminal, initialize and seed the portfolio database, then start the API:

   ```powershell
   Set-Location backend
   ..\.venv\Scripts\python.exe -m app.cli migrate
   Set-Location ..
   node tools\export-content.js
   Set-Location backend
   ..\.venv\Scripts\python.exe -m app.cli seed
   ..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
   ```

   Seed only runs when no profile exists, so it will not overwrite live edits. The PIN file must be present before starting the API.
7. Set `window.PORTFOLIO_API_BASE` in `js/config.js` to `http://localhost:8000`, and include the exact frontend origin `http://localhost:5500` in `FRONTEND_ORIGINS`.
8. In a second terminal at the repository root, serve the static frontend with `.\.venv\Scripts\python.exe -m http.server 5500`. Open `http://localhost:5500/` and `http://localhost:5500/admin/`. Sign in using the four-digit PIN, edit a section, and save. An open public page reflects changes within 15 seconds. API health is at `http://localhost:8000/api/health`, with interactive docs at `http://localhost:8000/docs`.

Run the automated backend tests from the `backend/` folder:

```powershell
..\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

## API overview

- `GET /api/health` — database readiness.
- `GET /api/portfolio` — public profile and published content only.
- `GET /api/admin/setup-status` — reports whether a four-digit PIN is configured in the backend code.
- `GET /api/admin/csrf` — renews the CSRF token for an authenticated session.
- `POST /api/admin/login`, `GET /api/admin/me`, `POST /api/admin/logout` — session authentication.
- `GET /api/admin/portfolio`, `PUT /api/admin/portfolio` — authenticated content read and atomic full-content save.
- `GET /api/admin/stats` — authenticated dashboard counts and update time.
- `POST /api/admin/upload` — authenticated image/PDF upload to Supabase Storage (5 MB maximum).

Writes require a signed, HttpOnly session cookie and a matching CSRF header/cookie. Session signing keys are created in process memory; restart the API to invalidate sessions. The PIN and login attempt limiter are both backend-local and are never stored in Supabase. Set `ADMIN_PIN` as a private environment variable on serverless hosts; local development can continue to use the ignored `backend/app/local_auth.py`. Set a stable random `SESSION_SIGNING_KEY` of at least 32 characters on serverless hosts so sessions remain valid across function instances and restarts. Login allows five attempts per client IP in 15 minutes; this in-memory limiter is per process and does not coordinate across serverless instances. All content is validated server-side; project/social URLs are restricted to HTTP(S), photo positions are constrained, and uploaded file signatures are checked. Use HTTPS in production.

**Security note:** a four-digit PIN has only 10,000 possible values and is weaker than a strong password. Do not expose `/admin/` on an unrestricted public endpoint if you can avoid it; use a private/VPN-protected admin route and HTTPS. The local PIN module is excluded from Git, but you must keep it private in your deployment setup.

## Deployment

1. Apply `backend/schema.sql` to Supabase (or use the `migrate` CLI command with the database connection string). Run the seed command once from a trusted machine. This schema contains portfolio content tables only—no admin accounts, PINs, sessions, or authentication records.
2. Deploy `backend/` to a Python ASGI host that supports FastAPI. For Vercel, import the repository as a separate project and set its Root Directory to `backend`; Vercel detects `app/main.py` and reads `requirements.txt`. Configure the variables listed in `backend/.env.example` in the host's private environment settings. Set `ADMIN_PIN` to your four digits, `SESSION_SIGNING_KEY` to a stable random value of at least 32 characters, `COOKIE_SECURE=true`, and `FRONTEND_ORIGINS` to the exact HTTPS frontend origin. The included `backend/vercel.json` allows up to 60 seconds for a serverless request. Do not commit secrets or the local PIN module.
3. Deploy the repository root as a static site (for example, Vercel). Set `window.PORTFOLIO_API_BASE` in `js/config.js` to the HTTPS API origin. No content rebuild or redeployment is needed after dashboard edits.
4. For cookie-based admin auth, use a custom frontend and API domain under the same registrable domain (for example, `portfolio.example.com` and `api.example.com`). Browsers may block cookies between unrelated frontend and API domains as third-party cookies even when CORS is enabled. Keep the API origin in `FRONTEND_ORIGINS`; never put the Supabase service-role key in frontend settings.
5. In Supabase Storage, keep the `portfolio` bucket public for public file reads. Do not expose the service-role key or grant browser clients database write access.

The repository prepares the application but does not create or deploy third-party resources. Supabase project credentials, bucket creation, private PIN configuration on the backend host, DNS, and deployment must be completed by you.

## Make it yours
For first-time setup, the data in `js/data.js` is exported and imported once as the database seed. After that, use the admin dashboard for live content changes. To add a bundled local photo before first import, save it under `assets/` and set its path in `js/data.js`; use `photoPos` to move the crop. The admin dashboard also supports persistent remote photo and CV uploads.

## Legacy single-file export

`python tools/build-single-file.py` still produces `dist/portfolio.html` for a static preview. That snapshot is not the live database-backed portfolio or admin deployment target; host the repository root and the API separately as described above.

## Notes
- The contact form still opens the visitor's email app with the message filled in; it does not send or store submissions.
- "Print or save as PDF" prints only the resume page.
- The bundled preview is used if the API is offline; an on-page status message reports the connection issue. Dashboard saves are the live source after initialization.
- `dist/portfolio.html` is a legacy snapshot, not the live content store. Use the repository-root site and API for changes managed through the dashboard.
