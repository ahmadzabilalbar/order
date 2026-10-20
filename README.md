# Order

A simple ordering app. People pick their name and order from a menu. An admin manages items, prices and names. Data lives in a Google Sheet.

**Stack:** Next.js 16 (App Router, Server Actions, Cache Components), Tailwind CSS v4, Google Sheets API, deployed on Vercel.

## Features

- **Order page (`/`)**: pick a seller from the dropdown (active sellers only), pick your name (or type one), search and filter the menu, adjust quantities, add a note and place the order. Anyone can edit or cancel an order (after confirming the name it was placed under) while its seller is still taking orders. Works well on mobile, with a bottom-sheet cart. Your name is remembered on this device.
- **Admin (`/admin`)**: password login. Add sellers, switch them active or inactive, and set each one's order start/end dates and delivery date. Add, edit and delete items and prices, hide or show an item, manage the name list, and see recent orders and revenue.
- **Google Sheets storage**: the `Items`, `Names` and `Orders` tabs are created automatically. You can also edit the sheet directly; the menu picks up changes within about a minute.
- **Safe by default**: prices are recalculated on the server, all sheet writes use `RAW` input so typed text can't run as formulas, and the admin session is a signed HttpOnly cookie.
- **Demo mode**: without Google credentials the app runs on an in-memory store, so you can try it right away.

## Run locally

```bash
npm install
cp .env.example .env.local   # set ADMIN_PASSWORD at minimum
npm run dev
```

Open http://localhost:3000, and http://localhost:3000/admin for the admin page.

## Connect Google Sheets

1. Create a Google Sheet and copy its ID from the URL: `docs.google.com/spreadsheets/d/<THIS_PART>/edit`.
2. In [Google Cloud Console](https://console.cloud.google.com/):
   - Create (or pick) a project and **enable the Google Sheets API**.
   - Go to **IAM & Admin → Service Accounts → Create service account** (no roles needed).
   - Open it, then **Keys → Add key → JSON**, and download the file.
3. **Share the sheet** with the service account's email (`…@….iam.gserviceaccount.com`) as **Editor**.
4. Set the environment variables from the JSON file:

| Variable | Value |
| --- | --- |
| `GOOGLE_SHEET_ID` | Sheet ID from step 1 |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` from the JSON |
| `GOOGLE_PRIVATE_KEY` | `private_key` from the JSON (keep the `\n`s) |
| `ADMIN_PASSWORD` | Admin login password |
| `SESSION_SECRET` | Long random string (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_CURRENCY` / `NEXT_PUBLIC_LOCALE` / `NEXT_PUBLIC_TIMEZONE` | Optional, default `MYR` / `en-MY` / `Asia/Kuala_Lumpur` |
| `NEXT_PUBLIC_APP_NAME` | Optional, header title |

### Sheet layout (created automatically)

| Tab | Columns |
| --- | --- |
| `Items` | `id`, `name`, `price`, `category`, `available`, `seller` (seller id; blank = every seller), `unit` (e.g. `2 pcs/pack`) |
| `Sellers` | `id`, `name`, `active` (`TRUE`/`FALSE`), `start_date`, `end_date`, `delivery_date` (YYYY-MM-DD; blank = no limit) |
| `Names` | `name` |
| `Orders` | `id`, `created_at`, `name`, `items`, `total`, `note`, `lines_json`, `seller`, `delivery_date`, `seller_id`, `updated_at` |

## Deploy to Vercel

1. Push this repo to GitHub.
2. On [vercel.com/new](https://vercel.com/new), import the repo. The framework is detected automatically.
3. Under **Settings → Environment Variables**, add the variables above. Paste `GOOGLE_PRIVATE_KEY` exactly as it appears in the JSON.
4. Deploy. Every push to `main` redeploys automatically.

Or use the CLI: `vercel` (preview) or `vercel --prod`.

## Project structure

```
src/
  app/
    page.tsx            Order page (streams menu from the sheet)
    order-form.tsx      Client ordering UI
    actions.ts          placeOrder server action (re-prices on server)
    admin/
      page.tsx          Auth gate + dashboard
      actions.ts        Login/logout + item & name mutations
      item-manager.tsx  Menu CRUD
      name-manager.tsx  Names list
      login-form.tsx
  lib/
    sheets.ts           Google Sheets store (REST + service account)
    memory.ts           In-memory demo store
    store.ts            Store selection + cached reads
    auth.ts             Signed-cookie admin session
```
