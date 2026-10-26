# Vercel Business Dashboard

A Next.js and TypeScript business dashboard preview using Geist Sans/Geist Mono and an Obsidian Emerald visual theme.

## Current status

- Responsive dashboard interface for an owner and two employees.
- Firebase email/password sign-in screen and password-reset flow.
- Firebase app/Auth/Firestore initialization through environment variables.
- Starter Firestore security rules; the vault collection is owner-only.
- Dashboard figures and records are still sample UI state. Business modules are not yet connected to Firestore.

## Configure Firebase

1. In Firebase Console, open project `vercel-b8f3c` and register a Web App if you have not already.
2. Go to **Authentication → Sign-in method** and enable **Email/Password**.
3. Under **Authentication → Users**, create the owner account with an email and password. Create employee accounts here too when ready.
4. Create a **Cloud Firestore** database.
5. Before publishing `firestore.rules`, create a document at `users/{OWNER_AUTH_UID}` in Firestore. Use the exact UID shown in Authentication for the owner account. Set fields: `role` (string) = `owner`, and `email` (string) = the owner's email.
6. Create a profile document for each employee at `users/{EMPLOYEE_AUTH_UID}` with `role` (string) = `employee` and their email. Only do this after the owner profile is set up, because the rules reserve profile management for the owner.
7. Publish the included `firestore.rules` in Firestore → Rules. Review and test them before using real business data.
8. Copy `.env.example` to `.env.local` and add the Firebase web app config values. Never commit `.env.local`, service-account keys, or passwords.
9. In Vercel project settings, add the same `NEXT_PUBLIC_FIREBASE_*` environment variables for Preview and Production, then redeploy.

## Run locally

Requires Node.js 20 or later:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Important security notes

Firebase web configuration is designed to be used by client applications; it is not a substitute for security rules. Access must be enforced by Firebase Authentication and Firestore Security Rules, never only by hiding buttons in the UI. The starter rules give owner and employee profiles access to the shared operational collections, while only the owner can access `vault`. Update the rules if employees need different module permissions. Do not store real business data until you have tested the rules and account roles.
