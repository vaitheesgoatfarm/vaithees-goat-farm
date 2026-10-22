# Goat Farm Manager — Online Starter

This package is a starting point for a bilingual (English/Tamil) responsive web app backed by Supabase PostgreSQL. It is **not yet deployed**; you must create the hosted project and configure the credentials.

## Files
- `index.html` — default entry point for the Supabase-backed app; add `?local=1` to open the browser-only prototype
- `cloud.html` — responsive sign-in and cloud records interface
- `app.js` — Supabase client and CRUD screens
- `schema.sql` — database tables, constraints, and Row Level Security (RLS)
- `manifest.json` — installable web app metadata

## Part A — Create Supabase database
1. Open https://supabase.com/ and create an account/project.
2. In Project Settings > API, copy the Project URL and the publishable key (or anon key).
3. Open SQL Editor > New query. Paste all of `schema.sql`, then Run.
4. Open another SQL Editor query, paste `migrations/20261020_vaccination_module.sql`, and Run it after `schema.sql`.
5. In Authentication > Providers, ensure Email is enabled.
6. In Authentication settings, set the Site URL to the website URL after deploying. During testing, use the Supabase preview/deployment URL as appropriate.

## Part B — Create the first farm
1. Sign up using the app once after configuring the Supabase keys in `app.js`.
2. In Supabase Dashboard > Authentication > Users, copy your user UUID.
3. In Table Editor, open `farms` and insert a row with `name` = your farm name and `created_by` = your user UUID. Save and copy the new farm `id`.
4. In Table Editor, open `farm_members` and insert `farm_id` = the new farm UUID, `user_id` = your user UUID, `role` = `owner`.
5. Sign out and sign in again in the app, then refresh.

## Part C — Configure the app
Edit `app.js` and replace:
- `PASTE_YOUR_SUPABASE_PROJECT_URL_HERE`
- `PASTE_YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY_HERE`

Use only the project URL and publishable/anon key in the browser. **Never use the service_role key in frontend code.**

## Part D — Deploy the website
Simple option: Vercel static deployment.
1. Create a Vercel account at https://vercel.com/.
2. Create a GitHub repository and upload the contents of this folder, or import the repository into Vercel.
3. Deploy as a static site (no build command; output/root directory is the project folder).
4. In Supabase Authentication URL configuration, set Site URL to the Vercel deployment URL.
5. Open the Vercel URL on your computer and phone, sign in using the same account, and test creating a goat record from each device.

You can also use another static host that serves HTML/JS files over HTTPS.

## Included in this starter
- Email/password sign-in and sign-up via Supabase Auth
- Shared online records for goat registration, health/vaccination, breeding, birth events, mortality, transactions, inventory and finance entries
- English/Tamil interface labels and responsive phone/desktop layout
- PostgreSQL constraints and RLS policies based on farm membership
- Basic dashboard counts
- Vaccination schedules, individual dose history, upcoming/overdue views, batch inventory, audit overrides, and CSV/print reports

## Vaccination setup and clinical safety
- The migration adds inactive, blank templates for PPR, FMD, ET, HS, Goat Pox, Anthrax, and ORF. It intentionally does not set ages, dose amounts, routes, intervals, or campaign months.
- A farm owner or manager must enter a product-specific protocol, cite its source, record its review date, and mark veterinarian confirmation before activating a schedule. Anthrax and ORF should only be activated when the local veterinarian indicates them.
- The database rejects incomplete active schedules and records doses only through an atomic RPC that checks farm membership, schedule, goat age, dose sequence, and selected stock batch. Interrupted primary courses require veterinarian review.
- Application reminders are visible on the vaccination dashboard only. No email, SMS, or push-notification provider is configured.
- Use current written guidance from your veterinarian, TANUVAS/IVRI/ICAR, the local veterinary department, and the exact product label. The official portals are [TANUVAS](https://www.tanuvas.ac.in/) and [DAHD India](https://dahd.gov.in/); verify the applicable protocol with your local veterinary department before entering or activating values.
- After the migration is applied, reload the app and open Vaccination > Schedule settings. Create or edit a template, complete the reviewed product/protocol fields, and activate it only after veterinary confirmation.

## Important limitations before production use
- This is an initial starter, not a fully audited production application.
- It does not yet include automated database backup configuration, general audit-log UI, file/photo uploads, push notifications, offline queue, or complete goat-to-goat foreign-key linking. Vaccination has its own due-date override audit and atomic stock usage, but those do not replace a full farm audit system.
- Birth events do not automatically create individual kid records; register each kid in the goat register.
- Purchase/sale entries do not yet update individual goat status automatically.
- Use a veterinarian-approved vaccination, deworming and treatment plan.
- For a commercial herd of 200+ goats, test security, restore from backups, and validate all workflows before relying on this system for business-critical records.

## Deploy the vaccination update
1. Apply `migrations/20261020_vaccination_module.sql` in the Supabase SQL Editor after the existing `schema.sql` has been installed.
2. In Supabase Table Editor or the app, have an owner/manager verify and activate each vaccine schedule; all templates begin inactive and contain no clinical defaults.
3. Deploy the updated project root to Vercel as a static site. No build command is required.
4. In the deployed app, verify sign-in, the Vaccination dashboard, a schedule approval, one test dose using a test batch, exports, and access with owner/manager/staff/viewer roles before using real records.


