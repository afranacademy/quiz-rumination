import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { token } = JSON.parse(event.body || "{}");

    if (!token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "token is required" }),
      };
    }

    const { data: invite, error } = await supabase
      .from("invites")
      .select("status, expires_at, created_at")
      .eq("token", token)
      .single();

    if (error || !invite) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Invite not found" }),
      };
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    const isExpired = now > expiresAt;

    const status = isExpired ? "expired" : invite.status;

    return {
      statusCode: 200,
      body: JSON.stringify({
        status,
        expiresAt: invite.expires_at,
        createdAt: invite.created_at,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
    };
  }
};
