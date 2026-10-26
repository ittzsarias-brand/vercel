# Vercel Business Dashboard

A Next.js and TypeScript dashboard preview using Geist Sans/Geist Mono and an Obsidian Emerald visual theme.

## Current status

The repository contains a responsive UI preview for a business owner and two employees. Dashboard figures are sample data. Entries added in the preview are temporary browser state only. Authentication, Firestore persistence, role-based access control, and private-vault rules still need to be configured before real business data is used.

## Run locally

Requires Node.js 20 or later. Run `npm install`, then `npm run dev`, and open http://localhost:3000.

## Next setup steps

1. Enable Email/Password in Firebase Authentication.
2. Register a Firebase Web App and add its web configuration as Vercel environment variables: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID`.
3. Implement Firebase Authentication, Firestore data access, and restrictive Firestore Security Rules before storing real data.
4. Import this private GitHub repository into Vercel and deploy.

Never commit service-account private keys, passwords, or local `.env` files. Do not use public Firestore rules for production.
