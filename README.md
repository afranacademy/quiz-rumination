# Psychology Quiz Web App UI

This is a code bundle for Psychology Quiz Web App UI. The original project is available at https://www.figma.com/design/EABYVF150iPYeE2OGuDfag/Psychology-Quiz-Web-App-UI.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

## Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to Project Settings > API
3. Copy your Project URL and anon/public key
4. Add these to your environment variables:

For local development, create a `.env` file:
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For Netlify deployment, add these in Netlify Dashboard > Site Settings > Environment Variables.

**Important:** Never expose the service-role key in client-side code. It should only be used in Netlify Functions (server-side).

5. Run the migrations in `supabase/migrations/` in order:
   - `000_create_attempts_table.sql`
   - `001_create_invites_table.sql`
   - `002_compare_flow.sql`
  