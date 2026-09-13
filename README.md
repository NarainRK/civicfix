# CivicFix — Community Civic Issue Reporting Platform

A cloud-deployed full-stack web application with **role-based access**
that lets citizens report local civic problems (potholes, garbage
dumps, broken streetlights, water/drainage issues) and lets municipal
admins triage and resolve them — built to demonstrate cloud computing
concepts: authenticated CRUD, REST APIs, role-based authorization, a
managed cloud database, and cloud deployment.

## 1. Problem Statement

Local civic issues are often reported informally with no central
record, so nothing gets tracked or prioritized. CivicFix gives citizens
a simple form to log an issue, and gives municipal admins a live queue
to assign priority and move issues through a status workflow — all
backed by a cloud database so the data is durable and accessible from
anywhere.

## 2. User Workflow

```
Citizen                              Admin
   │                                    │
   ├── Register/Login (JWT)             ├── Register/Login (JWT)
   │                                    │
   ├── Create issue                     ├── View all issues
   │     "Pothole on Main Road"         │
   ├── View own issues (/my)            ├── Assign priority
   ├── Edit own issue                   ├── Change status
   └── Delete own issue                 │        ↓
                                         │   In Progress
                                         │        ↓
                                         └──   Resolved
```

See `docs/workflow.mermaid` for the rendered diagram and
`docs/architecture.mermaid` for the full system architecture.

## 3. System Architecture

- **Client tier:** Vanilla HTML/CSS/JS single-page app — login/register
  screens, a citizen "report + my issues" view, and an admin triage view.
- **Application tier:** Node.js + Express REST API, structured as
  routes → middleware (JWT auth + role checks) → controllers → models.
- **Data tier:** MongoDB Atlas — `users` and `issues` collections,
  linked by a reference (`issues.createdBy → users._id`).
- **Hosting:** Render.com (backend web service), Netlify (frontend static site).

## 4. Tech Stack

| Layer     | Technology                                          |
|-----------|-------------------------------------------------------|
| Frontend  | HTML5, CSS3, vanilla JavaScript (fetch API, JWT in localStorage) |
| Backend   | Node.js, Express.js, JWT (jsonwebtoken), bcryptjs      |
| Database  | MongoDB (Atlas cloud), Mongoose ODM                    |
| Deployment| Render.com, Netlify, GitHub (CI/CD)                    |

## 5. Features

### Authentication & Roles
- `POST /api/auth/register`, `POST /api/auth/login` — JWT issued on success.
- Two roles: `citizen` and `admin`, enforced via `middleware/auth.js`.
- **Public registration always creates a `citizen`.** The `role` field is
  not accepted from the request body — there is no client-facing request
  that can create an admin account. The one admin account is provisioned
  with `backend/scripts/createAdmin.js`, run directly against the
  database by a trusted operator (see `docs/deployment-guide.md`).

### Admin Dashboard
- Stat tiles (Total / Pending / In Progress / Resolved) computed from
  `GET /api/issues/stats/summary`.
- A sortable table of every issue (title, category, location, reporter,
  priority, status) with inline priority/status dropdowns that call
  `PATCH /api/issues/:id/status` and a delete action per row.

### CRUD (Issues)
| Operation | Endpoint(s) | Access |
|-----------|-------------|--------|
| **Create** | `POST /api/issues` | citizen, admin |
| **Read**   | `GET /api/issues`, `GET /api/issues/:id`, `GET /api/issues/my` | citizen, admin |
| **Update** | `PUT /api/issues/:id` (content), `PATCH /api/issues/:id/status` (status/priority) | owner citizen / admin-only |
| **Delete** | `DELETE /api/issues/:id` | owner citizen, admin |

### Filtering & Aggregation
- `GET /api/issues?status=Resolved`
- `GET /api/issues?category=Pothole`
- `GET /api/issues/my` — the logged-in citizen's own reports
- `GET /api/issues/stats/summary` — counts grouped by status

Full request/response examples: `docs/api-documentation.md`.

## 6. Folder Structure

```
CivicFix/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   └── Issue.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── issueRoutes.js
│   ├── controllers/
│   │   ├── authController.js
│   │   └── issueController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── scripts/
│   │   └── createAdmin.js
│   ├── config/db.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── README.md
└── docs/
    ├── architecture.mermaid
    ├── workflow.mermaid
    ├── database-design.md
    ├── api-documentation.md
    └── deployment-guide.md
```

## 7. Running Locally

```bash
# 1. Backend
cd backend
cp .env.example .env     # paste your MongoDB Atlas URI + a JWT secret into .env
npm install
npm run dev               # runs on http://localhost:5000

# 2. Frontend
cd ../frontend
npx serve .                # or just open index.html in a browser
```
Set `API_BASE` in `frontend/script.js` to your backend URL.

**Try it end-to-end:**
1. Register a **citizen** account and create an issue.
2. Provision your one admin account:
   `cd backend && node scripts/createAdmin.js "Admin Name" admin@civicfix.com "StrongPassword123"`
3. Log in as that admin in another browser tab — you'll see the
   dashboard tiles and issue table instead of the citizen report form.
4. Use the table's status/priority dropdowns + "Apply" to move the
   issue Pending → In Progress → Resolved.

## 8. Cloud Deployment

Full step-by-step instructions: `docs/deployment-guide.md`. Record your
live URLs here once deployed:

- **Live app (frontend):** `https://profound-bonbon-571cad.netlify.app`
- **Live API (backend):** `https://civicfix-backend-8u4x.onrender.com/api`
- **Database:** MongoDB Atlas cluster `civicfix`

## 9. Documentation

- `docs/architecture.mermaid` — system architecture diagram (client → API → cloud DB, with auth flow).
- `docs/workflow.mermaid` — citizen/admin role workflow diagram.
- `docs/database-design.md` — `users` + `issues` schemas, relationships, indexes.
- `docs/api-documentation.md` — full REST endpoint reference with request/response examples and access rules.
- `docs/deployment-guide.md` — MongoDB Atlas + Render + Netlify setup.

## 10. Demonstration Video — Suggested Outline

Record a 6–9 minute screen capture on the **deployed** URL (not localhost):
1. **Problem & architecture** (30s) — show `docs/architecture.mermaid` and `docs/workflow.mermaid`.
2. **Citizen flow** (2 min) — register/login as a citizen, create an issue, view "My Issues", edit it, then delete a different one to show `403` protection on trying to edit someone else's issue.
3. **Security note** (30s) — try registering with `"role": "admin"` in the request body (e.g. via a browser dev-tools fetch or Postman) and show it still comes back as `citizen` — a nice, concrete privilege-escalation defense to narrate in the viva.
4. **Admin flow** (2 min) — log in with the account created via `scripts/createAdmin.js`, show the dashboard tiles and issue table, assign priority, change status Pending → In Progress → Resolved via `PATCH /:id/status`.
5. **MongoDB Atlas** (1 min) — show the `users` and `issues` collections updating live in Atlas.
6. **Render/Netlify dashboards** (1 min) — deployed services, environment variables (`MONGODB_URI`, `JWT_SECRET`), auto-deploy logs from a `git push`.
7. **Code walkthrough** (2 min) — `middleware/auth.js` (role checks), `controllers/authController.js` (forced `role: "citizen"`), `controllers/issueController.js` (ownership checks).
8. **Wrap-up** — cloud concepts demonstrated: DBaaS, PaaS, stateless JWT auth, CI/CD.

## 11. Cloud Concepts Demonstrated

- **Database-as-a-Service (DBaaS):** MongoDB Atlas — managed replication, backups, scaling.
- **Platform-as-a-Service (PaaS) deployment:** Render.com (API), Netlify (static hosting).
- **Stateless authentication:** JWT — no server-side session store, so the API stays horizontally scalable.
- **Environment-based configuration:** secrets (`MONGODB_URI`, `JWT_SECRET`) via `.env` / platform environment variables, never hardcoded.
- **Role-based access control (RBAC):** enforced in middleware, a common cloud-app security pattern.
- **CI/CD:** GitHub-triggered auto-deploys on both hosting platforms.
