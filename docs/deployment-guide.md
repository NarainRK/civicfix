# Cloud Deployment Guide — CivicFix

This guide deploys CivicFix entirely on free-tier cloud services:

| Layer     | Service                | Purpose                              |
|-----------|-------------------------|---------------------------------------|
| Database  | **MongoDB Atlas**       | Managed, cloud-hosted NoSQL database  |
| Backend   | **Render.com** (Web Service) | Hosts the Node.js/Express REST API |
| Frontend  | **Netlify** (or Render Static Site) | Hosts the static SPA          |
| Source control / CI-CD | **GitHub**  | Triggers auto-deploys on push        |

## 1. Push the code to GitHub
```bash
git init
git add .
git commit -m "Initial commit: CivicFix full-stack app"
git branch -M main
git remote add origin https://github.com/<your-username>/civicfix.git
git push -u origin main
```

## 2. Provision the cloud database (MongoDB Atlas)
1. Create a free account at https://www.mongodb.com/cloud/atlas.
2. Create a new **free (M0) cluster**.
3. Under **Database Access**, create a database user with a password.
4. Under **Network Access**, add `0.0.0.0/0` (allow access from anywhere)
   so Render can reach it — for production, restrict this to Render's
   outbound IPs.
5. Click **Connect → Drivers**, copy the connection string, e.g.:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/civicfix?retryWrites=true&w=majority
   ```

## 3. Deploy the backend (Render.com)
1. Go to https://render.com → **New → Web Service**.
2. Connect your GitHub repo, select the `backend/` folder as the root directory.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables:
   - `MONGODB_URI` = the Atlas connection string from step 2.
   - `JWT_SECRET` = a long random string (e.g. run
     `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` locally and paste the output).
   - `JWT_EXPIRES_IN` = `7d` (or your preferred token lifetime).
6. Deploy. Render will give you a public URL, e.g.
   `https://civicfix-api.onrender.com`.
7. Verify it's live: visit `https://civicfix-api.onrender.com/api/health`.

## 3b. Provision the demo admin account (security-critical step)

Public registration (`POST /api/auth/register`) always creates a
`citizen` — there is no API request that produces an admin account.
Create your one demo admin directly, using the script that ships with
the backend:

```bash
cd backend
npm install
node scripts/createAdmin.js "Admin Name" admin@civicfix.com "StrongPassword123"
```

This connects straight to your `MONGODB_URI` and either creates a new
admin user or promotes an existing account to `admin`. Run it from your
own machine (with the same `.env` values as production), or open a
one-off **Shell** session on your Render service and run it there —
either way, it never goes through a public-facing route.

## 4. Deploy the frontend (Netlify)
1. In `frontend/script.js`, update:
   ```js
   const API_BASE = "https://civicfix-api.onrender.com/api";
   ```
2. Go to https://app.netlify.com → **Add new site → Import from Git**.
3. Point it at the `frontend/` folder (no build command needed — it's static).
4. Deploy. Netlify gives you a public URL, e.g. `https://civicfix.netlify.app`.

## 5. Enable CORS (already configured)
`server.js` uses the `cors` middleware so the Netlify-hosted frontend can
call the Render-hosted API across origins. For production hardening,
restrict it to your Netlify domain:
```js
app.use(cors({ origin: "https://civicfix.netlify.app" }));
```

## 6. Continuous deployment
Both Render and Netlify auto-redeploy whenever you `git push` to `main`,
giving you a simple CI/CD pipeline without extra tooling.

## 7. Post-deployment checklist
- [ ] `GET /api/health` returns `200` on the Render URL
- [ ] Registering via `POST /api/auth/register` with `"role": "admin"` in the body still creates a **citizen** account (confirms the privilege-escalation fix)
- [ ] Running `node scripts/createAdmin.js` successfully creates/promotes an admin account, and that account can log in
- [ ] Creating an issue as a citizen appears in MongoDB Atlas's `issues`
      collection with the correct `createdBy` reference
- [ ] Citizen can edit/delete only their own issues (`403` on others' issues)
- [ ] Admin can see all issues and change status/priority via the triage
      controls (`PATCH /api/issues/:id/status`)
- [ ] `GET /api/issues/my` returns only the logged-in citizen's reports
- [ ] Filtering by `?status=` and `?category=` returns the expected subset
- [ ] Record the final live URLs in `README.md`
