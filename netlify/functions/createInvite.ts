import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 20; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { inviterAttemptId } = JSON.parse(event.body || "{}");

    if (!inviterAttemptId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "inviterAttemptId is required" }),
      };
    }

    // Validate attempt exists and quiz_slug is 'rumination'
    const { data: attempt, error: attemptError } = await supabase
      .from("attempts")
      .select("id, quiz_slug")
      .eq("id", inviterAttemptId)
      .single();

    if (attemptError || !attempt) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Attempt not found" }),
      };
    }

    if (attempt.quiz_slug !== "rumination") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid quiz slug" }),
      };
    }

    // Generate unique token
    let token: string;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      token = generateToken();
      const { data: existing } = await supabase
        .from("invites")
        .select("id")
        .eq("token", token)
        .single();
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to generate unique token" }),
      };
    }

    // Create invite
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .insert({
        token: token!,
        quiz_slug: "rumination",
        inviter_attempt_id: inviterAttemptId,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: inviteError.message }),
      };
    }

    const siteUrl = process.env.URL || "https://afran.academy";
    const inviteUrl = `${siteUrl}/invite/${token}`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        inviteUrl,
        token: token!,
        expiresAt: expiresAt.toISOString(),
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
