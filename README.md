# Habit Tracker — Firebase Setup Guide

## Files in this folder
```
auth.html                   ← Login / Signup page (Firebase Auth)
index.html                  ← Main tracker dashboard (Firestore real-time)
profile.html                ← User profile + settings
notifications.html          ← Reminders & notification settings
analytics.html              ← Habit analytics & insights
firestore.rules             ← Paste into Firebase Console → Rules
firebase-config.js          ← 🔒 YOUR real keys (git-ignored, never pushed)
firebase-config.example.js  ← ✅ Safe template (pushed to GitHub)
.gitignore                  ← Blocks secrets from being committed
theme.js                    ← Light/dark theme toggle
pwa.js                      ← PWA service worker registration
sw.js                       ← Service worker
manifest.json               ← PWA manifest
README.md                   ← This file
```

---

## Step 1 — Create a Firebase Project (5 minutes)

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"** → Name it `habit-tracker-2026`
3. Disable Google Analytics (not needed) → **Create project**

---

## Step 2 — Enable Authentication

1. In your project → **Build → Authentication → Get started**
2. Click **Sign-in method** tab
3. Enable **Email/Password** → Save
4. Enable **Google** → Add your support email → Save

---

## Step 3 — Create Firestore Database

1. **Build → Firestore Database → Create database**
2. Choose **"Start in test mode"** (we'll add rules in Step 5)
3. Pick a region close to India: `asia-south1 (Mumbai)` → Done

---

## Step 4 — Get Your Config Keys

1. Project Overview → click the **`</>`** (Web) icon
2. Register app name: `habit-tracker-web` → Register
3. Copy the `firebaseConfig` object — it looks like:

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "habit-tracker-2026.firebaseapp.com",
  projectId:         "habit-tracker-2026",
  storageBucket:     "habit-tracker-2026.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123...:web:abc..."
};
```

4. **Copy** `firebase-config.example.js` → `firebase-config.js`
5. Replace the placeholder values in `firebase-config.js` with your real values
6. **That's it!** All HTML pages load from this one file automatically.

> ⚠️ `firebase-config.js` is git-ignored — your keys stay local and are never pushed to GitHub.

---

## Step 5 — Add Security Rules

1. **Firestore → Rules** tab
2. Delete what's there
3. Paste the entire contents of `firestore.rules`
4. Click **Publish**

---

## Step 6 — Enable Firebase Storage (for profile photos)

1. **Build → Storage → Get started**
2. Start in test mode → Choose same region → Done
3. Go to **Rules** tab and paste:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}
```

---

## Step 7 — Deploy to GitHub Pages

```bash
# Create a new GitHub repo: habit-tracker-2026

git init
git add .
git commit -m "feat: habit tracker with Firebase auth + Firestore sync"
git remote add origin https://github.com/YOUR_USERNAME/habit-tracker-2026.git
git push -u origin main

# In GitHub → repo Settings → Pages → Source: main branch → Save
# Your live URL: https://YOUR_USERNAME.github.io/habit-tracker-2026/auth.html
```

---

## Firestore Data Structure

```
users/
  {uid}/                         ← User profile doc
    name: "Your Name"
    email: "you@gmail.com"
    college: "RTU Kota"
    branch: "B.Tech CSE"
    bio: "Targeting TCS placement Nov 2026"
    createdAt: Timestamp
    lastLogin: Timestamp

    habits/                      ← Sub-collection
      h1/  { name, emoji, goal, category, order }
      h2/  { name, emoji, goal, category, order }
      ...

    checks/                      ← Sub-collection (one doc per day)
      2026-05-10/  { h1: true, h2: false, h3: true, ... }
      2026-05-11/  { h1: true, h2: true,  h3: false, ... }
      ...
```

---

## Why this architecture is placement-worthy

| Feature | Tech Used | What it shows recruiters |
|---|---|---|
| Auth | Firebase Auth | Real authentication patterns |
| Real-time sync | Firestore onSnapshot | WebSocket / event-driven design |
| Offline mode | Firestore persistence | PWA awareness |
| Security | Firestore Rules | Understanding of auth + data security |
| Cloud storage | Firebase Storage | File upload handling |
| Multi-device | Cloud DB | Distributed systems thinking |

---

## Free Tier Limits (Spark Plan — Free forever)

- **Auth:** Unlimited users
- **Firestore:** 50,000 reads/day, 20,000 writes/day, 1 GB storage
- **Storage:** 5 GB (plenty for profile photos)
- **Hosting:** 10 GB/month bandwidth

This tracker will comfortably stay free unless you have 1000+ daily active users.
