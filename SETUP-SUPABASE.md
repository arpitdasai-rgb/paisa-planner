# Add the Supabase database and Google (Gmail) sign-in

This takes about 20 minutes. When you're done, everyone in the family signs in with their Google account and sees the same budget, live.

You'll do four things:

1. Create a Supabase project and run the database script.
2. Create a Google sign-in client in Google Cloud.
3. Connect the two in Supabase.
4. Paste two values into `config.js` and deploy.

Dashboard menus get renamed now and then. If a label below doesn't match exactly, look for the closest one.

---

## 1. Create the Supabase project

1. Sign up at https://supabase.com and click **New project**.
2. Name it `paisa-planner` and save the database password somewhere safe.
3. Pick **Region: South Asia (Mumbai)**. The PRD asks for data stored in India.
4. When the project is ready, open **SQL Editor → New query**. Paste all of `supabase/schema.sql` and click **Run**. It should finish with "Success. No rows returned".

> Run the script only once. Running it again deletes all Paisa Planner data.

5. Then run these updates the same way, in this order. Each one is safe to run again and keeps your data:
   - `supabase/v2.sql`: bank accounts, repeats, net worth, delete my account
   - `supabase/v3.sql`: Recently deleted shared across the family
   - `supabase/v4.sql`: family edits merge field by field, so two people editing the same month both keep their changes
   - `supabase/push.sql`: phone push addresses for scheduled reminders

The script creates:

| Table | What it holds |
|---|---|
| `profiles` | Name, Gmail address and photo for each person who signs in |
| `families` | One row per family budget |
| `family_members` | Who is in which family, and their role. One Gmail can be in only one family. |
| `invites` | Gmail invites that expire after 7 days |
| `docs` | All budget data, one row per item: settings, categories, entries, months, bills, loans, cards, goals, accounts, repeats, investments, the activity log and Recently deleted |
| `push_subscriptions` | Each phone's push address and reminder times (from `push.sql`) |

Row-level security enforces the PRD's role table on the server:

- **Viewers** can't write anything.
- **Members** can add entries, mark bills paid, and edit or delete only their own entries.
- **Owners and Admins** can change everything else.
- **Inviting, accepting, changing roles, removing people, leaving, handing over ownership and deleting the family** all run as database functions that check the rules first.

## 2. Create the Google sign-in client

1. Go to https://console.cloud.google.com and create a project, for example "Paisa Planner".
2. Open **APIs & Services → OAuth consent screen** (also called **Google Auth Platform**):
   - User type: **External**
   - App name: Paisa Planner. Add your support email.
   - Scopes: only `openid`, `.../auth/userinfo.email` and `.../auth/userinfo.profile`. No Gmail inbox access is needed or requested.
   - While the app is in **Testing** mode, add each family member's Gmail under **Test users**. Click **Publish app** when you want anyone with a Google account to sign in. These scopes don't need Google's verification.
3. Open **Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins:** your app's address, for example `https://paisa-planner.netlify.app`, plus `http://localhost:8080` for testing.
   - **Authorized redirect URIs:** `https://<your-project-ref>.supabase.co/auth/v1/callback`. Copy the exact address from the Google provider page in Supabase (step 3 below).
4. Copy the **Client ID** and **Client secret**.

## 3. Connect Google to Supabase

1. In Supabase, open **Authentication → Sign In / Providers → Google**.
2. Turn it on and paste the Client ID and Client secret. Save.
3. Open **Authentication → URL Configuration**:
   - **Site URL:** your app's address, for example `https://paisa-planner.netlify.app/`
   - **Redirect URLs:** add the same address, plus `http://localhost:8080/` for testing.
4. Optional: turn off the Email provider so Google is the only way to sign in (PRD ON-1).

## 4. Point the app at your project

1. In Supabase, open **Project Settings → API** (or **API Keys**). Copy the **Project URL** and the **anon / public** key.
2. Paste them into `config.js`:

   ```js
   window.PAISA_CONFIG = {
     supabaseUrl: "https://abcdefghijklmnop.supabase.co",
     supabaseAnonKey: "eyJhbGciOi..."
   };
   ```

   The anon key is safe to ship in the app because row-level security protects the data. **Never** put the `service_role` key in the app.
3. In `sw.js`, bump `VERSION` (for example `paisa-v3`) so installed apps pick up the change.
4. Deploy the folder to Netlify, GitHub Pages or any HTTPS host.

## 5. Try it

1. Open the app and tap **Continue with Google**. You should come back signed in.
2. Choose **Create family budget**. If this phone already has a budget from the device-only version, tick "Copy the budget already on this device".
3. Finish setup, then go to **Family → Invite by Gmail**, enter a family member's Gmail and pick a role.
4. The app gives you a message to send them by WhatsApp or email. When they sign in with that Gmail, they'll see **Join family**.
5. Add an expense on one phone and watch it appear on the other within a few seconds.

## Troubleshooting

| What you see | What to fix |
|---|---|
| Google shows `redirect_uri_mismatch` | The redirect URI in Google Cloud must be exactly the Supabase callback address from step 2.3. |
| You come back to the sign-in screen | Add the app's exact address (with the trailing `/`) to Supabase **Redirect URLs**. |
| "Access blocked: app has not completed verification" | The person isn't a test user yet. Add them, or publish the app (step 2.2). |
| Changes don't appear live on other phones | In **Database → Publications → supabase_realtime**, make sure `docs` and `family_members` are on. The script tries to switch them on for you. |
| "new row violates row-level security" | That role isn't allowed to make the change. This is working as intended. |

## Scheduled reminders

Reminders while the app is closed come from the `send-reminders` Edge Function, run every hour by a `pg_cron` job. The Owner sets it up once from the app: **Settings → Reminders → Reminder setup**. That page creates the keys on the phone and lists each step (secrets, deploying the function, the schedule). After any change to `supabase/functions/send-reminders/index.ts` or `supabase/functions/_shared/money-core.js`, deploy the function again. The function imports the shared money rules: `supabase functions deploy send-reminders` (CLI) bundles `../_shared/money-core.js` automatically; in the dashboard editor, add `money-core.js` as a second file and change the import to `./money-core.js`.

## Not included yet

- **Invite emails:** the app creates the invite and gives you a message to send yourself. Sending email automatically needs an email service such as Resend.
