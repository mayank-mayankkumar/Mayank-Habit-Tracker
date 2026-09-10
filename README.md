# Habit Tracker — REST API

**Node.js · Express · MongoDB · JWT Auth**

---

## Project Structure

```
habit-tracker-backend/
├── src/
│   ├── app.js                  ← Express app + DB connection + server
│   ├── models/
│   │   ├── User.js             ← User schema (bcrypt, virtuals)
│   │   ├── Habit.js            ← Habit schema (compound index)
│   │   └── CheckIn.js          ← CheckIn + Note schemas (upsert pattern)
│   ├── routes/
│   │   ├── auth.js             ← Register, login, refresh, profile CRUD
│   │   ├── habits.js           ← Habits CRUD + reorder
│   │   ├── checkins.js         ← Toggle, bulk, analytics aggregation
│   │   └── notes.js            ← Notes upsert/CRUD
│   ├── middleware/
│   │   ├── auth.js             ← JWT protect + optionalAuth
│   │   └── errorHandler.js     ← asyncHandler, validate, 404, globalError
│   └── utils/
│       └── jwt.js              ← signToken, sendToken, response helpers
├── .env.example
├── package.json
└── README.md                   ← This file
```

---

## Quick Start

```bash
# 1. Copy env
cp .env.example .env
# Edit MONGO_URI and JWT_SECRET in .env

# 2. Install
npm install

# 3. Run (dev mode with auto-reload)
npm run dev

# 4. Production
npm start
```

---

## Environment Variables

| Variable              | Description                    | Default                          |
|-----------------------|--------------------------------|----------------------------------|
| `PORT`                | Server port                    | `5000`                           |
| `MONGO_URI`           | MongoDB connection string      | `mongodb://localhost:27017/habit_tracker` |
| `JWT_SECRET`          | JWT signing secret (change!)   | —                                |
| `JWT_EXPIRES_IN`      | Access token lifetime          | `7d`                             |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime      | `30d`                            |
| `ALLOWED_ORIGINS`     | CORS origins (comma-separated) | `http://localhost:3000`          |
| `RATE_LIMIT_MAX`      | Max requests per window        | `100`                            |

---

## Authentication

All private routes require: `Authorization: Bearer <accessToken>`

Access tokens expire in 7 days. Use the refresh endpoint to get a new one silently.

---

## API Reference

### Auth

#### `POST /api/auth/register`
Create account. Seeds 11 default habits automatically.

**Body:**
```json
{
  "name":     "Yash Sharma",
  "email":    "yash@example.com",
  "password": "SecurePass1"
}
```

**Response `201`:**
```json
{
  "success":      true,
  "accessToken":  "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn":    "7d",
  "user":         { "id": "...", "name": "Yash Sharma", "email": "..." }
}
```

---

#### `POST /api/auth/login`
**Body:** `{ "email", "password" }`
**Response `200`:** Same as register.

---

#### `POST /api/auth/refresh`
**Body:** `{ "refreshToken": "eyJ..." }`
**Response `200`:** New `accessToken` + `refreshToken`.

---

#### `GET /api/auth/me`  🔒
Returns full user profile.

---

#### `PATCH /api/auth/me`  🔒
Update profile fields. All optional.

**Body:** `{ "name", "college", "branch", "bio", "photoURL" }`

---

#### `POST /api/auth/change-password`  🔒
**Body:** `{ "currentPassword", "newPassword" }`

---

#### `DELETE /api/auth/me`  🔒
Permanently deletes account + all habits, check-ins, and notes.

---

### Habits

#### `GET /api/habits`  🔒
Get all habits. Query params: `?category=health|study|work|discipline`, `?search=text`, `?isActive=false`

**Response:**
```json
{
  "success": true,
  "count":   11,
  "habits":  [
    { "id": "...", "name": "Deep Work [2hr]", "emoji": "🧠",
      "category": "study", "goal": 2, "order": 4 }
  ]
}
```

---

#### `POST /api/habits`  🔒
**Body:**
```json
{
  "name":        "Morning Run",
  "emoji":       "🏃",
  "category":    "health",
  "goal":        1,
  "aiGenerated": false
}
```
**Response `201`:** `{ "success": true, "habit": {...} }`

---

#### `GET /api/habits/:id`  🔒
Get single habit.

---

#### `PATCH /api/habits/:id`  🔒
Partial update. Only provided fields change.
**Body:** Any subset of `{ name, emoji, category, goal, order, isActive }`

---

#### `DELETE /api/habits/:id`  🔒
Soft delete (sets `isActive: false`). Append `?hard=true` to permanently delete.

---

#### `POST /api/habits/reorder`  🔒
Batch order update. Uses MongoDB `bulkWrite` — O(1) per habit.

**Body:**
```json
{
  "orders": [
    { "id": "habit_id_1", "order": 0 },
    { "id": "habit_id_2", "order": 1 }
  ]
}
```

---

### Check-ins

#### `GET /api/checkins?year=2026&month=4`  🔒
Month is 0-indexed (4 = May). Returns one doc per day that has data.

**Response:**
```json
{
  "checkins": [
    { "date": "2026-05-06", "checks": { "habit_id_1": true, "habit_id_2": false } }
  ]
}
```

---

#### `POST /api/checkins/toggle`  🔒
Toggle one habit on one date. **Atomic upsert** — creates the day doc on first use.

**Body:**
```json
{ "habitId": "habit_id_1", "date": "2026-05-06" }
```

**Response:**
```json
{ "success": true, "checked": true, "date": "2026-05-06", "habitId": "..." }
```

---

#### `PUT /api/checkins/:date`  🔒
Replace full checks map for a date.
**Body:** `{ "checks": { "id1": true, "id2": false } }`

---

#### `DELETE /api/checkins/:date`  🔒
Clear all check-in data for a specific date.

---

#### `GET /api/checkins/analytics/summary?year=2026&month=4`  🔒
Full analytics without a frontend calculation.

**Response:**
```json
{
  "summary": {
    "globalPct":     72,
    "currentStreak": 5,
    "longestStreak": 12,
    "best":  { "name": "Deep Work", "pct": 94 },
    "worst": { "name": "No Doomscrolling", "pct": 41 },
    "habitStats":    [...],
    "categoryStats": [...],
    "dowAvg":        [62, 88, 85, 90, 82, 71, 55],
    "dayScores":     [{ "day": 1, "score": 80 }, ...]
  }
}
```

---

### Notes

#### `GET /api/notes?habitId=&year=2026&month=4`  🔒

#### `PUT /api/notes`  🔒
Upsert note (create or update).
**Body:** `{ "habitId", "date", "text", "mood", "tags": ["win","insight"] }`

#### `GET /api/notes/:habitId/:date`  🔒
#### `DELETE /api/notes/:habitId/:date`  🔒

---

## Data Design — Interview Talking Points

### Why MongoDB?
Habit check-ins are **write-heavy** (multiple toggles per day) and read as **monthly ranges**. MongoDB's flexible schema handles the `checks` Map (`habitId → boolean`) cleanly. The `CheckIn` document design (one doc per user per day) minimises write amplification vs. one doc per (user, habit, day).

### Index Strategy
| Collection | Index                        | Purpose                            |
|------------|------------------------------|------------------------------------|
| User       | `{ email: 1 }`               | O(1) login lookup                  |
| Habit      | `{ userId: 1, order: 1 }`    | Sorted habit list query            |
| CheckIn    | `{ userId: 1, date: 1 }` UNIQUE | Upsert & monthly range scan   |
| Note       | `{ userId, habitId, date }` UNIQUE | Upsert note for a day       |

### JWT Pattern
- **Access token**: 7-day, stateless, verified in middleware.
- **Refresh token**: 30-day, `type: 'refresh'` claim prevents misuse.
- Passwords use **bcrypt with cost factor 12** (≈250ms, brute-force resistant).
- `password` field has `select: false` — never sent in any response.

### asyncHandler pattern
```js
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```
Eliminates try/catch from every route — errors propagate to the global handler.

### SOLID error handling
All errors go through one place: `errorHandler`. It normalises Mongoose `CastError`, `ValidationError`, duplicate-key `11000`, and JWT errors into consistent `{ success, error }` responses.

---

## Deployment (Railway / Render / Fly.io)

```bash
# Railway
railway login
railway init
railway add --plugin mongodb
railway up

# Set env vars in Railway dashboard:
# MONGO_URI, JWT_SECRET, NODE_ENV=production, ALLOWED_ORIGINS
```

---

## Connect Frontend to This API

In your `index.html`, replace the Firebase calls with:

```javascript
const API = 'https://your-api.railway.app';

// Login
const { accessToken, user } = await fetch(`${API}/api/auth/login`, {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify({ email, password }),
}).then(r => r.json());

// Authenticated request
const { habits } = await fetch(`${API}/api/habits`, {
  headers: { Authorization: `Bearer ${accessToken}` },
}).then(r => r.json());

// Toggle habit
await fetch(`${API}/api/checkins/toggle`, {
  method:  'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
  body:    JSON.stringify({ habitId: 'h1', date: '2026-05-06' }),
});
```
