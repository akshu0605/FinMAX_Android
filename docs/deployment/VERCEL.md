# Vercel deployment

The Vercel project uses the repository root (`.`) and the existing `vercel.json` configuration:

- Framework: Vite
- Install command: `npm install` (or `npm ci`)
- Build command: `npm run build`
- Output directory: `dist`
- SPA routes: rewritten to `/index.html`

## Connect GitHub

1. Push the repository to GitHub.
2. In Vercel, choose **Add New → Project**, import the GitHub repository, and keep the Root Directory at `.`.
3. Confirm the Vite preset, build command, and output directory above, then deploy.
4. For later deployments, pushes to the configured production branch trigger production builds; other branches can create preview builds.

## Environment variables

Add these variables in **Project Settings → Environment Variables** for the environments you use:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (or the Supabase publishable key accepted by this project)

These are public browser configuration values and are included in the client bundle. Never use a Supabase service-role key here. The current source has public defaults in `src/app/utils/supabase.ts`; setting Vercel variables makes the deployment configuration explicit. Redeploy after changing variables.

## Google sign-in redirects

After the production Vercel URL exists, update Supabase Authentication URL Configuration:

- Set **Site URL** to the production origin, such as `https://your-project.vercel.app`.
- Add the exact production origin to allowed redirect URLs. Add only the preview URL patterns you actually use.
- Keep the native Android callback `com.finmax.mobile://auth/callback` in the allowed redirect URLs.
- In Google Cloud OAuth settings, keep Supabase's callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) as the authorized redirect URI. The Vercel URL is the app's post-login redirect, not Google's Supabase callback.

Test web sign-in and Android sign-in separately after changing redirect settings.
