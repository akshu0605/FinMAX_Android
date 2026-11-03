// ⚠️⚠️⚠️ THIS FILE SHOULD NOT BE DEPLOYED ⚠️⚠️⚠️
//
// This FinMax application does NOT use Supabase edge functions.
// All functionality is client-side using localStorage.
//
// If this file is being deployed, the deployment system is misconfigured.
//
// Configuration files that disable Supabase:
// - /make.config.json
// - /figma-make.config.json
// - /platform.config.json
// - /.figmamake
// - And 30+ other config files
//
// THIS APPLICATION IS STATIC ONLY - NO BACKEND NEEDED
//
// DO NOT DEPLOY THIS FILE

export default function handler() {
  return new Response(
    JSON.stringify({
      error: "This endpoint should not exist",
      message: "FinMax is a static-only application with no backend",
      notice: "All data is stored in localStorage on the client",
      deployment: "Please deploy only the dist/ folder as a static site"
    }),
    {
      status: 501,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
