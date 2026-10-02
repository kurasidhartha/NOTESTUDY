# EduNotes — Class Notes Management System

A static web app for teachers to upload notes and students to download them.
Runs on **GitHub Pages** (free). Uses **Firebase** as the backend (free tier).

---

## File Structure

```
EduNotes/
├── index.html          ← Landing page (choose Teacher / Student)
├── teacher.html        ← Teacher dashboard (login + upload)
├── student.html        ← Student notes library (no login needed)
├── style.css           ← All page styles
├── firebase-config.js  ← YOUR Firebase keys go here
├── teacher.js          ← Teacher-side logic
├── student.js          ← Student-side logic
└── README.md           ← This file
```

---

## Step-by-Step Setup

### STEP 1 — Create a Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"**
3. Give it a name (e.g., `edunotes-myschool`)
4. Disable Google Analytics (not needed) → **Create project**

---

### STEP 2 — Enable Email/Password Authentication

1. In Firebase Console → left sidebar → **Build → Authentication**
2. Click **"Get started"**
3. Click **"Email/Password"**
4. Toggle **Enable** → Save

---

### STEP 3 — Create a Firestore Database

1. Left sidebar → **Build → Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (you will secure it in Step 6)
4. Choose a region (pick the one nearest to your users) → Enable

---

### STEP 4 — Enable Firebase Storage

1. Left sidebar → **Build → Storage**
2. Click **"Get started"**
3. Choose **"Start in test mode"** → Next → Done

---

### STEP 5 — Get Your Config Keys

1. Go to **Project Settings** (gear icon, top-left)
2. Scroll down to **"Your apps"**
3. Click the **"</>"** (Web) icon to register a web app
4. Give it a nickname (e.g., `edunotes-web`) → Register app
5. Copy the `firebaseConfig` object that appears — it looks like this:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "my-project.firebaseapp.com",
  projectId: "my-project",
  storageBucket: "my-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

6. Open **`firebase-config.js`** in this folder
7. Replace the placeholder values with YOUR values from above → Save

---

### STEP 6 — Set Security Rules

#### Firestore Rules
1. Firebase Console → **Firestore Database → Rules**
2. Replace all existing text with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /notes/{noteId} {
      // Students: anyone can read notes
      allow read: if true;

      // Teachers: only signed-in users can create notes
      allow create: if request.auth != null;

      // Teachers: can only edit/delete their own notes
      allow update, delete: if request.auth != null
        && resource.data.uploadedBy == request.auth.token.email;
    }
  }
}
```

3. Click **Publish**

#### Storage Rules
1. Firebase Console → **Storage → Rules**
2. Replace with:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /notes/{fileName} {
      // Students: anyone can download
      allow read: if true;

      // Teachers: only signed-in users can upload
      allow write: if request.auth != null
        && request.resource.size < 50 * 1024 * 1024;
    }
  }
}
```

3. Click **Publish**

---

### STEP 7 — Upload to GitHub & Enable GitHub Pages

1. Create a **new repository** on https://github.com
   - Click **"New"** → name it (e.g., `edunotes`)
   - Set to **Public** (required for free GitHub Pages)
   - Click **"Create repository"**

2. **Upload your files**:
   - On the new repo page, click **"uploading an existing file"**
   - Drag ALL files from your EduNotes folder into the box
   - Make sure `firebase-config.js` has your real keys filled in first!
   - Scroll down → click **"Commit changes"**

3. **Enable GitHub Pages**:
   - Go to your repo → **Settings** tab
   - Left sidebar → **Pages**
   - Under "Source" → select **"Deploy from a branch"**
   - Branch: **main** · Folder: **/ (root)**
   - Click **Save**

4. **Wait ~2 minutes** → GitHub will show you a link like:
   ```
   https://YOUR-USERNAME.github.io/edunotes/
   ```
   That is your live website!

---

### STEP 8 — Add Firebase Authorized Domain

By default, Firebase only allows requests from localhost. Add your GitHub Pages URL:

1. Firebase Console → **Authentication → Settings**
2. Scroll to **"Authorized domains"**
3. Click **"Add domain"**
4. Paste your GitHub Pages URL (e.g., `your-username.github.io`)
5. Click **Add**

---

## How to Use

### As a Teacher
1. Go to `your-site.github.io/edunotes/teacher.html`
2. First time: click **"Create teacher account"** to register with your email
3. Log in → fill in the note title, subject, description, and upload a file
4. Your note appears in the list. You can preview or delete it.

### As a Student
1. Go to `your-site.github.io/edunotes/student.html` (or the home page → Student)
2. All notes appear immediately — no sign-in required
3. Filter by subject using the pills, or search by keyword
4. Click **View** to open in browser or **Download** to save

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Permission denied" error | Check your Firestore/Storage rules (Step 6) |
| Login fails with no error | Check your Firebase config keys in `firebase-config.js` |
| Notes don't load on live site | Add your GitHub Pages domain in Firebase Auth settings (Step 8) |
| Upload succeeds but no download link | Check Storage rules allow read |
| CORS error in console | Enable CORS on Firebase Storage via Firebase CLI (rare) |

---

## Tech Stack

- **Frontend**: Plain HTML + CSS + JavaScript (no framework)
- **Database**: Firebase Firestore (NoSQL)
- **File Storage**: Firebase Storage
- **Auth**: Firebase Authentication (email/password)
- **Hosting**: GitHub Pages (free, static)

---

## Free Tier Limits (Firebase Spark plan)

| Feature | Free limit |
|---------|-----------|
| Firestore reads | 50,000/day |
| Firestore writes | 20,000/day |
| Storage space | 5 GB |
| Storage downloads | 1 GB/day |

More than enough for a classroom of 100–500 students.
