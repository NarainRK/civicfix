# Database Design — CivicFix

**Database engine:** MongoDB (cloud-hosted on **MongoDB Atlas**)
**Database name:** `civicfix`
**Collections:** `users`, `issues`

MongoDB was chosen because issue reports are self-contained documents
with no complex joins, the schema may evolve, and Atlas offers a
free-tier cloud cluster reachable from a cloud-hosted Node.js backend.
The two-collection design (`users` + `issues`, linked by a reference)
lets the app demonstrate role-based access without needing a relational
database.

## Collection: `users`

| Field       | Type              | Required | Default   | Description                              |
|-------------|-------------------|----------|-----------|--------------------------------------------|
| `_id`       | ObjectId          | auto     | —         | Primary key                                |
| `name`      | String            | Yes      | —         | Full name (max 100 chars)                  |
| `email`     | String            | Yes      | —         | Unique, lowercased, used for login         |
| `password`  | String            | Yes      | —         | bcrypt hash (never returned by default — `select: false`) |
| `role`      | String (enum)     | No       | `citizen` | `citizen` or `admin`                       |
| `createdAt` | Date              | auto     | now       | Account creation timestamp                 |
| `updatedAt` | Date              | auto     | now       | Last modified timestamp                    |

### Sample document
```json
{
  "_id": "66f0a1b2c3d4e5f6a7b8c9d0",
  "name": "Priya R.",
  "email": "priya@example.com",
  "password": "$2a$10$hashedvalue...",
  "role": "citizen",
  "createdAt": "2026-09-01T09:00:00.000Z"
}
```

## Collection: `issues`

| Field                | Type              | Required | Default   | Description                                                        |
|----------------------|-------------------|----------|-----------|----------------------------------------------------------------------|
| `_id`                | ObjectId          | auto     | —         | Primary key                                                          |
| `title`              | String            | Yes      | —         | Short title (max 120 chars)                                          |
| `description`        | String            | Yes      | —         | Detailed description (max 1000 chars)                                |
| `category`           | String (enum)     | Yes      | `Other`   | Pothole, Garbage, Streetlight, Water Supply, Drainage, Illegal Construction, Other |
| `location`           | String            | Yes      | —         | Free-text location/address (max 200 chars)                          |
| `status`             | String (enum)     | No       | `Pending` | Pending, In Progress, Resolved, Rejected                             |
| `priority`           | String (enum)     | No       | `Medium`  | Low, Medium, High                                                    |
| `createdBy`          | ObjectId (ref `User`) | Yes  | —         | The citizen who filed the report                                     |
| `reportedByName`     | String            | Yes      | —         | Denormalized copy of the reporter's name (avoids a populate() on every list read) |
| `assignedPriorityBy` | ObjectId (ref `User`) | No   | —         | Which admin last changed status/priority (audit trail)               |
| `createdAt`          | Date              | auto     | now       | Report creation timestamp                                            |
| `updatedAt`          | Date              | auto     | now       | Last modified timestamp                                              |

### Sample document
```json
{
  "_id": "66f1a2b3c4d5e6f7a8b9c0d1",
  "title": "Large pothole on Main St",
  "description": "A deep pothole near the bus stop is causing traffic to swerve dangerously.",
  "category": "Pothole",
  "location": "4th Cross Street, T Nagar, Chennai",
  "status": "In Progress",
  "priority": "High",
  "createdBy": "66f0a1b2c3d4e5f6a7b8c9d0",
  "reportedByName": "Priya R.",
  "assignedPriorityBy": "66f0f1e2d3c4b5a6f7e8d9c0",
  "createdAt": "2026-09-01T10:15:00.000Z",
  "updatedAt": "2026-09-03T08:30:00.000Z"
}
```

### Relationship
`issues.createdBy` → `users._id` (one user creates many issues — a
"reference" relationship, MongoDB's equivalent of a foreign key, resolved
application-side rather than with a SQL join).

### Indexes
* `users.email` — unique index, enforces one account per email and speeds up login lookups.
* `issues`: compound index on `{ status: 1, category: 1 }` — speeds up the dashboard's common filter queries.
* `issues.createdBy` — implicitly benefits from being an ObjectId reference; add an explicit index (`issues.createdBy: 1`) if the `/my` endpoint needs to scale to large datasets.

### Design notes
* Passwords are hashed with bcrypt (`models/User.js`, `pre("save")` hook) — plaintext passwords are never stored or logged.
* `reportedByName` is intentionally denormalized: the issue list is read far more often than a user's name changes, so storing it directly avoids a `populate()` (join-like operation) on every `GET /api/issues` call.
* Role-based rules (who can edit/delete/triage) are enforced in the application layer (`middleware/auth.js`, `controllers/issueController.js`), not in the database schema — this is the standard pattern for NoSQL databases, which don't have row-level security like some relational engines.
