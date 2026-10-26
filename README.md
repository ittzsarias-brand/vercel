# Vercel Business Dashboard

A Next.js and TypeScript business dashboard preview using Geist Sans/Geist Mono and an Obsidian Emerald visual theme.

## Current status

- Responsive dashboard interface for a single owner account.
- Firebase email/password sign-in screen and password-reset flow.
- Firebase app/Auth/Firestore initialization through environment variables.
- Simplified single-owner workflow; no employee or admin management screen.
- Accounting, business activity, deliveries, inventory, notes, and the vault use live Firestore records with real-time updates.
- Overview metrics and charts remain demo/sample figures; they are not calculated from saved records yet.

## Configure Firebase

1. In Firebase Console, open project `vercel-b8f3c` and register a Web App if you have not already.
2. Go to **Authentication → Sign-in method** and enable **Email/Password**.
3. Under **Authentication → Users**, create your owner account with an email and password. Do not create employee accounts if you want this workspace to remain single-owner.
4. Create a **Cloud Firestore** database.
5. Publish the included `firestore.rules` in Firestore → Rules. The current rules allow any signed-in Firebase account to access workspace collections, so keep only your own account in Firebase Authentication for a single-owner setup.
6. Copy `.env.example` to `.env.local` and add the Firebase web app config values. Never commit `.env.local`, service-account keys, or passwords.
7. In Vercel project settings, add the same `NEXT_PUBLIC_FIREBASE_*` environment variables for Preview and Production, then redeploy.

## Run locally

Requires Node.js 20 or later:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Important security notes

Firebase web configuration is designed to be used by client applications; it is not a substitute for security rules. Access must be enforced by Firebase Authentication and Firestore Security Rules, never only by hiding buttons in the UI. The current rules allow any authenticated Firebase user to access the operational collections and vault. Keep only your own account in Firebase Authentication to maintain the intended single-owner setup. Do not store real business data until you have tested the rules and account roles.
