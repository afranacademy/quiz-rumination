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
    const { token, inviteeAttemptId } = JSON.parse(event.body || "{}");

    if (!token || !inviteeAttemptId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "token and inviteeAttemptId are required" }),
      };
    }

    // Update invite with invitee attempt
    const { data, error } = await supabase
      .from("invites")
      .update({
        invitee_attempt_id: inviteeAttemptId,
        status: "completed",
      })
      .eq("token", token)
      .select()
      .single();

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
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
