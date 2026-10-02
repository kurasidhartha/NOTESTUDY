// ══════════════════════════════════════════════════
//  STEP: Paste YOUR Firebase project config here.
//
//  How to get it:
//  1. Go to https://console.firebase.google.com
//  2. Open your project → Project Settings (gear icon)
//  3. Scroll to "Your apps" → Web app → Config
//  4. Copy the firebaseConfig object and paste below.
// ══════════════════════════════════════════════════

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// Initialize Firebase (do NOT edit below this line)
firebase.initializeApp(firebaseConfig);

const auth    = firebase.auth();
const db      = firebase.firestore();
const storage = firebase.storage();
