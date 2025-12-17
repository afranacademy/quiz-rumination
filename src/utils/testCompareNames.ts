/**
 * DEV-only utility for testing compare name display
 * Tests that names are correctly fetched from backend payload
 * 
 * Usage: Call this function in browser console or add to a DEV page
 */

import { supabase } from "@/lib/supabaseClient";

export async function testCompareNames(inviteToken: string) {
  if (!import.meta.env.DEV) {
    console.warn("[testCompareNames] This function is DEV-only");
    return;
  }

  console.log("[testCompareNames] Testing with token:", inviteToken.substring(0, 12) + "...");

  const results: Record<string, any> = {
    invite_token: inviteToken,
    timestamp: new Date().toISOString(),
  };

  try {
    // Test 1: get_compare_inviter_display_name_by_token
    const { data: inviterName, error: nameError } = await supabase.rpc(
      "get_compare_inviter_display_name_by_token",
      { p_invite_token: inviteToken }
    );
    results.inviter_display_name = inviterName || null;
    results.inviter_name_error = nameError ? nameError.message : null;

    // Test 2: get_compare_token_by_token
    const { data: tokenData, error: tokenError } = await supabase.rpc(
      "get_compare_token_by_token",
      { p_invite_token: inviteToken }
    );
    const tokenRow = Array.isArray(tokenData) ? tokenData[0] : tokenData;
    results.token_status = tokenRow?.status || null;
    results.attempt_a_id = tokenRow?.attempt_a_id || null;
    results.attempt_b_id = tokenRow?.attempt_b_id || null;
    results.inviter_first_name = tokenRow?.inviter_first_name || null;
    results.inviter_last_name = tokenRow?.inviter_last_name || null;
    results.token_error = tokenError ? tokenError.message : null;

    // Test 3: get_compare_payload_by_token (if attempt_b exists)
    if (tokenRow?.attempt_b_id) {
      const { data: payloadData, error: payloadError } = await supabase.rpc(
        "get_compare_payload_by_token",
        { p_invite_token: inviteToken }
      );
      const payloadRow = Array.isArray(payloadData) ? payloadData[0] : payloadData;
      results.name_a = payloadRow?.name_a || null;
      results.name_b = payloadRow?.name_b || null;
      results.payload_error = payloadError ? payloadError.message : null;
    } else {
      results.name_a = null;
      results.name_b = null;
      results.payload_error = "attempt_b_id is null - payload test skipped";
    }

    // Display results
    console.table(results);

    // Validation
    const issues: string[] = [];
    if (!results.inviter_display_name && results.token_status === 'pending') {
      issues.push("⚠️ Inviter name is empty but session is valid");
    }
    if (results.token_status === 'completed' && !results.name_a) {
      issues.push("⚠️ name_a is missing in completed session");
    }
    if (results.token_status === 'completed' && results.attempt_b_id && !results.name_b) {
      issues.push("⚠️ name_b is missing but attempt_b_id exists");
    }

    if (issues.length > 0) {
      console.warn("[testCompareNames] Issues found:", issues);
    } else {
      console.log("[testCompareNames] ✅ All checks passed");
    }

    return results;
  } catch (err) {
    console.error("[testCompareNames] Error:", err);
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

