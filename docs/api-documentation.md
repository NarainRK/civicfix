# API Documentation — CivicFix REST API

**Base URL (local):** `http://localhost:5000/api`
**Base URL (production):** `https://<your-render-service>.onrender.com/api`

All request/response bodies are JSON. Every `/api/issues*` route (except
none — all of them) requires a valid JWT in the `Authorization` header:
```
Authorization: Bearer <token>
```
Tokens are issued by `/api/auth/login` or `/api/auth/register`.

---

## Health Check

### `GET /api/health`
```json
{ "status": "ok", "service": "civicfix-backend", "time": "2026-09-12T10:00:00.000Z" }
```

---

## Auth Endpoints

### 1. Register
**`POST /api/auth/register`**

**Request body**
```json
{ "name": "Priya R.", "email": "priya@example.com", "password": "secret123" }
```
**Security note:** this endpoint always creates the account with
`role: "citizen"`. It ignores any `role` field sent in the body — there
is no request a client can send through the public API that results in
an admin account. Admin accounts are provisioned separately with
`backend/scripts/createAdmin.js` (see `docs/deployment-guide.md`), run
directly against the database with trusted credentials.

**Response `201 Created`**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "66f...", "name": "Priya R.", "email": "priya@example.com", "role": "citizen" }
}
```

### 2. Login
**`POST /api/auth/login`**
```json
{ "email": "priya@example.com", "password": "secret123" }
```
**Response `200 OK`** — same shape as register (`token` + `user`).
**Response `401 Unauthorized`** on wrong credentials.

---

## Issues Resource

| Method | Endpoint                     | Access                          | Purpose                                   |
|--------|-------------------------------|----------------------------------|--------------------------------------------|
| POST   | `/api/issues`                 | citizen, admin                   | Create a new issue report                  |
| GET    | `/api/issues`                 | citizen, admin                   | List all issues (filters: `status`, `category`, `page`, `limit`) |
| GET    | `/api/issues/my`               | citizen, admin                   | List only the logged-in user's own reports |
| GET    | `/api/issues/stats/summary`    | citizen, admin                   | Count of issues grouped by status          |
| GET    | `/api/issues/:id`              | citizen, admin                   | Get a single issue                         |
| PUT    | `/api/issues/:id`              | **owner** citizen, or admin      | Edit an issue's title/description/category/location |
| PATCH  | `/api/issues/:id/status`       | **admin only**                   | Triage: change `status` and/or `priority`  |
| DELETE | `/api/issues/:id`              | **owner** citizen, or admin      | Delete an issue                            |

Role enforcement happens in `middleware/auth.js` (`protect` verifies the
JWT; `authorize("admin")` restricts the triage endpoint) and in
`controllers/issueController.js` (ownership checks on update/delete).

### 1. Create an issue
**`POST /api/issues`**
```json
{
  "title": "Large pothole on Main St",
  "description": "Deep pothole causing traffic to swerve.",
  "category": "Pothole",
  "location": "4th Cross Street, T Nagar"
}
```
`createdBy` and `reportedByName` are set automatically from the JWT — they
are not accepted from the request body.

**Response `201 Created`**
```json
{
  "success": true,
  "data": {
    "_id": "66f1a2b3c4d5e6f7a8b9c0d1",
    "title": "Large pothole on Main St",
    "status": "Pending",
    "priority": "Medium",
    "createdBy": "66f0...",
    "reportedByName": "Priya R.",
    "createdAt": "2026-09-12T10:05:00.000Z"
  }
}
```

### 2. Get all issues (with filters)
**`GET /api/issues?status=Pending&category=Pothole&page=1&limit=10`**
```json
{
  "success": true,
  "count": 10,
  "total": 34,
  "page": 1,
  "totalPages": 4,
  "data": [ { "_id": "...", "title": "...", "status": "Pending" } ]
}
```

### 3. Get my issues
**`GET /api/issues/my`** — no query params needed; scoped to `req.user._id` server-side.
```json
{ "success": true, "count": 3, "data": [ { "_id": "...", "title": "..." } ] }
```

### 4. Get a single issue
**`GET /api/issues/:id`** → `200 OK` with the issue, or `404 Not Found`.

### 5. Update an issue (owner or admin)
**`PUT /api/issues/:id`**
```json
{ "title": "Updated title", "description": "Updated description" }
```
**Response `403 Forbidden`** if the caller is neither the owner nor an admin:
```json
{ "success": false, "message": "You can only edit your own issue reports" }
```

### 6. Admin triage — change status/priority
**`PATCH /api/issues/:id/status`**
```json
{ "status": "In Progress", "priority": "High" }
```
**Response `200 OK`** with the updated issue. **Response `403 Forbidden`**
if the caller's role is not `admin`:
```json
{ "success": false, "message": "Role 'citizen' is not permitted to perform this action" }
```

### 7. Delete an issue (owner or admin)
**`DELETE /api/issues/:id`** → `200 OK`, `403 Forbidden`, or `404 Not Found`.

### 8. Status summary (aggregation)
**`GET /api/issues/stats/summary`**
```json
{
  "success": true,
  "data": [
    { "_id": "Pending", "count": 12 },
    { "_id": "In Progress", "count": 5 },
    { "_id": "Resolved", "count": 17 }
  ]
}
```

---

## Error format
```json
{ "success": false, "message": "Human-readable message", "error": "Optional technical detail" }
```

## HTTP status codes used
| Code | Meaning                                     |
|------|-----------------------------------------------|
| 200  | Success                                        |
| 201  | Resource created                               |
| 400  | Bad request / validation failure               |
| 401  | Missing/invalid JWT, or bad login credentials  |
| 403  | Authenticated, but not permitted (role/ownership) |
| 404  | Resource not found                             |
| 500  | Server / database error                        |
