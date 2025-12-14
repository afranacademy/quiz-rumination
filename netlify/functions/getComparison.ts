import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { computeComparisonServer } from "./computeComparisonServer";

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

    // Fetch invite
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .select("inviter_attempt_id, invitee_attempt_id, expires_at, status")
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Invite not found" }),
      };
    }

    // Check expiry
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    if (now > expiresAt) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: "expired",
        }),
      };
    }

    // If no invitee attempt yet, return pending
    if (!invite.invitee_attempt_id) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          status: "pending",
        }),
      };
    }

    // Fetch both attempts
    const { data: inviterAttempt, error: inviterError } = await supabase
      .from("attempts")
      .select("answers_raw, first_name")
      .eq("id", invite.inviter_attempt_id)
      .single();

    const { data: inviteeAttempt, error: inviteeError } = await supabase
      .from("attempts")
      .select("answers_raw, first_name")
      .eq("id", invite.invitee_attempt_id)
      .single();

    if (inviterError || !inviterAttempt || inviteeError || !inviteeAttempt) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to fetch attempts" }),
      };
    }

    // Compute comparison
    const comparison = computeComparisonServer(
      inviterAttempt.answers_raw as number[],
      inviteeAttempt.answers_raw as number[]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "completed",
        comparison,
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
