CityWatch (Toronto) - Full-Stack App (React, Supabase, AWS Lambda)
This repository contains a full-stack JavaScript application with a React frontend and a minimal serverless Node.js backend on AWS Lambda. Supabase is used for Auth, Database, and Storage. The app centers on a map-first experience for reporting and viewing local issues in Toronto, with city-level web push alerts for new reports.

Table of Contents
Project Structure

Prerequisites

Setup Instructions
A. Clone and Install
B. Supabase Setup
C. AWS Backend (Lambda)
D. Frontend Setup

Running the Application (Dev)

Production Build & Deploy

Dependencies

Additional Notes (Environment, Service Worker, Troubleshooting)


1. Project Structure
your-project/
ÃÄÄ backend-lambda/
³   ÃÄÄ package.json            # Lambda deps (web-push, supabase-js)
³   ÀÄÄ src/
³       ÀÄÄ handler.js          # Lambda Function URL handler (Web Push)
ÃÄÄ frontend/
³   ÃÄÄ package.json            # React app (Vite or CRA); Vite assumed here
³   ÃÄÄ public/
³   ³   ÀÄÄ service-worker.js   # Web Push SW (receives notifications)
³   ÀÄÄ src/
³       ÃÄÄ api/
³       ³   ÃÄÄ supabase.js     # Supabase client
³       ³   ÃÄÄ push.js         # Subscribe + save push subscription
³       ³   ÀÄÄ issues.js       # Create/Resolve issue utilities
³       ÃÄÄ components/         # UI components
³       ÃÄÄ pages/
³       ³   ÃÄÄ MapPage.jsx     # Map + markers + details drawer
³       ³   ÃÄÄ NewIssuePage.jsx# Create issue form
³       ³   ÀÄÄ IssueDetail.jsx # Details/resolve (creator only)
³       ÃÄÄ App.jsx
³       ÀÄÄ main.jsx
ÃÄÄ supabase/
³   ÃÄÄ schema.sql              # Tables: issues, city_subscriptions, push_subscriptions
³   ÀÄÄ rls.sql                 # Minimal RLS policies
ÃÄÄ README.md                   # This file
ÀÄÄ (optional root) package.json


2. Prerequisites
Node.js (v18+ recommended)

npm (bundled with Node)

Supabase account & project (URL + Anon & Service Role keys)

AWS account (Lambda access)

(Frontend deploy) Vercel account


3. Setup Instructions
A. Clone and Install
git clone <repo-url>
cd your-project

Install frontend & backend dependencies:
cd frontend && npm install
cd ../backend-lambda && npm install

B. Supabase Setup
Create tables & RLS
 Open the Supabase SQL editor and run supabase/schema.sql then supabase/rls.sql.
 This creates:

issues: reports with coordinates, city, status, single photo URL
city_subscriptions: which users want city alerts (e.g., "Toronto")
push_subscriptions: browser push endpoints per user/device

Enable Storage
 Create a public bucket named issue-photos. The app uploads one image per issue and stores the public URL in issues.photo_url.

Auth
 Email/password is enabled by default. You'll use the anon key on the client and the service role key only in Lambda.

C. AWS Backend (Lambda)
The backend is a single AWS Lambda (Node 18) exposed via Function URL. It handles:
- Saving a browser's push subscription
- Sending city-level web push when a new issue is created

Generate VAPID keys (locally):
npx web-push generate-vapid-keys
# Save PUBLIC and PRIVATE keys

Create a Lambda function
Runtime: Node.js 18
Enable Function URL (Auth: NONE)

Add environment variables:
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=... (server-only key)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
SIGNING_SECRET=... (random string; also used by frontend to sign requests)

Deploy code
From backend-lambda/, zip your code (including node_modules) and upload.

Verify CORS works: the handler returns Access-Control-Allow-Origin: *.

Lambda Endpoints (Function URL + query):
POST ?action=save-subscription
 Body: { "userId": "<uuid>", "subscription": <PushSubscriptionJSON> }

POST ?action=notify-new
 Body: { "city":"Toronto", "issueId":"<uuid>", "title":"...", "type":"..." }

Include header: x-signing-secret: <SIGNING_SECRET> on all requests.

D. Frontend Setup
Environment variables (Vite format shown)
 Create frontend/.env.local:

VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_VAPID_PUBLIC_KEY=...     # from npx web-push
VITE_LAMBDA_URL=...           # your Lambda Function URL
VITE_LAMBDA_SIGNING_SECRET=...# same as Lambda SIGNING_SECRET

If using CRA instead of Vite, prefix with REACT_APP_ and reference via process.env.REACT_APP_*.

Service Worker
 Ensure public/service-worker.js exists and is registered in src/main.jsx:

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js");
  });
}

Map provider
 The app uses Leaflet with OpenStreetMap tiles (no API keys required). Toronto default center:
lat: 43.65107, lng: -79.347015


4. Running the Application (Dev)
Frontend (dev server):
cd frontend
npm run dev

App runs on http://localhost:5173 (Vite default)

localhost is considered a secure origin for service workers and push

Backend (Lambda):
No local server required. The frontend calls the deployed Function URL directly.

You can test Lambda quickly with cURL/HTTPie by sending the proper header and body.


5. Production Build & Deploy
A. Frontend  Vercel
Create a new Vercel project from frontend/
Add the same VITE_* env vars in Project Settings  Environment Variables
Deploy; your production URL will serve HTTPS (required for Web Push)

B. Backend  Lambda (already live)
Ensure env vars are set
Redeploy the zip when you update code
Keep the Service Role key only in Lambda (never in the client)

C. Supabase
No extra steps beyond schema and bucket
Monitor table rows and storage uploads in the dashboard


6. Dependencies
Frontend
React (Vite or CRA)
@supabase/supabase-js (Auth/DB/Storage)
leaflet / react-leaflet (map + markers)

Backend (Lambda)
web-push (VAPID-signed Web Push)
@supabase/supabase-js (server-side queries to subscription tables)


7. Additional Notes
Core Features (MVP)
- Map-first UI: View reported issues as markers (red = open, green = resolved)
- Create issue: Title, type, description, single photo, GPS  city (manual fallback)
- Resolve issue: Creator can mark their own issue as resolved
- City push alerts (Toronto): Users can opt in to receive new issue notifications for a city (e.g., Toronto).
  Note: MVP sends alerts for new issues only (no per-issue follow/resolved alerts in MVP).

Environment Summary
Frontend (Vite)
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_VAPID_PUBLIC_KEY
VITE_LAMBDA_URL
VITE_LAMBDA_SIGNING_SECRET

Lambda
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
SIGNING_SECRET

Service Worker & Push
Web Push requires a service worker and user permission
iOS push requires installable PWA (out of scope for MVP), but desktop + Android work great
Lambda prunes dead subscriptions on 404/410 responses

Free Tier Guardrails
AWS Lambda free tier: ample for demos (Function URL avoids API Gateway costs)
OpenStreetMap tiles are free within reasonable usage (cache-friendly)
Supabase free tier: suitable for development

Troubleshooting
CORS issues: Confirm Lambda returns Access-Control-Allow-* headers (already set in handler).
401 from Lambda: Missing/incorrect x-signing-secret.
Push not arriving: Check Notification permission; re-subscribe; confirm VAPID keys; verify subscription row in push_subscriptions; look for 404/410 prune logs.
RLS update blocked: Only the creator_id can update their issue; verify you're logged in as that user.

