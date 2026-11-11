// Paisa Planner settings.
// To sync with your family, paste your Supabase project's URL and anon (public) key
// from Supabase → Project Settings → API. See SETUP-SUPABASE.md.
// Leave both empty to keep the budget on this device only (no sign-in).
// The anon key is meant to be public: row-level security in supabase/schema.sql protects the data.
// Never put the service_role key here.
window.PAISA_CONFIG = {
  supabaseUrl: "https://acymqvrelmxcgjxjfdni.supabase.co",
  // Public key for scheduled reminders, from the app's Reminder setup page (safe to share).
  vapidPublicKey: "BMiMieDa9UtmcZIfqxwTbwjFLbxEXDTtbk7d8gQuRzT_vAooQKgxgEGuZeJW-3eZFZhUnEt7dD2WT2AispZ3I_U",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjeW1xdnJlbG14Y2dqeGpmZG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyODgxNzEsImV4cCI6MjEwOTg2NDE3MX0.kaokb1W3eGVYnNss377yKTO2wv7gTKHQF9YmDHiNbz4"
};
