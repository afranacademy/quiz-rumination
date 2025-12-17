import { Handler } from "@netlify/functions";

/**
 * @deprecated This Netlify Function is deprecated.
 * All invite creation should use Supabase RPC: create_compare_invite
 * This function is kept for backward compatibility but returns an error.
 */
export const handler: Handler = async (event) => {
  return {
    statusCode: 410, // Gone - indicates the resource is no longer available
    body: JSON.stringify({ 
      error: "This endpoint is deprecated. Please use Supabase RPC create_compare_invite instead.",
      deprecated: true
    }),
  };
};

/* LEGACY CODE - DISABLED
The original implementation generated 20-character tokens and used the old invites table.
This has been replaced by Supabase RPC create_compare_invite which:
- Generates 64-character tokens using encode(gen_random_bytes(32), 'hex')
- Uses compare_sessions table as the single source of truth
- Returns (session_id, invite_token, expires_at)

To restore this function, uncomment the code below, but it should NOT be used in production.
*/
