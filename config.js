/* Talencia concept: runtime configuration.
   mode 'demo' : no sign-in required, dashboards read mock JSON from data/demo/. Nothing leaves the browser.
   mode 'live' : Supabase sign-in (email/password, magic link, Apple, Google, LinkedIn) and real queries under Row Level Security.
   The anon key is designed to be public; RLS policies in supabase/schema.sql protect the data. Never put the service-role key here.
   For testing, ?env=live or ?env=demo on any portal URL overrides this for the browser session. */
window.TALENCIA_CONFIG = {
  mode: 'demo',
  supabase: {
    url: '',       /* e.g. https://abcdefghijklm.supabase.co */
    anonKey: ''    /* Project settings → API → anon public key */
  },
  supabaseJs: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'
};
