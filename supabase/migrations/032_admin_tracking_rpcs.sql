-- Migration: Admin RPC functions for tracking dashboard
-- Provides admin_completed_attempts_with_clicks and admin_compare_share_activity

-- ============================================
-- 1. Admin RPC: admin_completed_attempts_with_clicks
-- Returns completed attempts with CTA click flags
-- ============================================

CREATE OR REPLACE FUNCTION admin_completed_attempts_with_clicks(
  p_session_token text,
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
  v_offset int;
  v_total_count bigint;
  v_rows jsonb;
BEGIN
  -- Validate admin session
  SELECT id INTO v_admin_id FROM validate_admin_session(p_session_token);
  
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'data', null,
      'error', jsonb_build_object(
        'code', 'ADMIN_UNAUTHORIZED',
        'message', 'Invalid or expired admin session token'
      )
    );
  END IF;

  -- Calculate offset
  v_offset := (GREATEST(1, p_page) - 1) * GREATEST(1, LEAST(p_page_size, 100));

  -- Get total count
  SELECT COUNT(*) INTO v_total_count
  FROM attempts a
  WHERE a.status = 'completed'
    AND (p_filters->>'start_date' IS NULL OR a.completed_at >= (p_filters->>'start_date')::timestamptz)
    AND (p_filters->>'end_date' IS NULL OR a.completed_at <= (p_filters->>'end_date')::timestamptz);

  -- Get paginated rows with CTA flags
  SELECT jsonb_agg(
    jsonb_build_object(
      'attempt_id', a.id,
      'first_name', a.user_first_name,
      'last_name', a.user_last_name,
      'phone_masked', CASE 
        WHEN a.user_phone IS NOT NULL AND length(a.user_phone) >= 4 
        THEN '****' || right(a.user_phone, 4)
        ELSE NULL
      END,
      'completed_at', a.completed_at,
      'clicked_mind_varaj_course', EXISTS(
        SELECT 1 FROM card_events ce
        WHERE ce.attempt_id = a.id
          AND ce.card_type = 'cta_mind_varaj_course'
          AND ce.event_type = 'click'
      ),
      'clicked_personal_result_card', EXISTS(
        SELECT 1 FROM card_events ce
        WHERE ce.attempt_id = a.id
          AND ce.card_type = 'cta_personal_result_card'
          AND ce.event_type = 'click'
      ),
      'clicked_my_mind_pattern_card', EXISTS(
        SELECT 1 FROM card_events ce
        WHERE ce.attempt_id = a.id
          AND ce.card_type = 'cta_my_mind_pattern_card'
          AND ce.event_type = 'click'
      ),
      'clicked_compare_minds', EXISTS(
        SELECT 1 FROM card_events ce
        WHERE ce.attempt_id = a.id
          AND ce.card_type = 'cta_compare_minds'
          AND ce.event_type = 'click'
      )
    )
    ORDER BY a.completed_at DESC
  ) INTO v_rows
  FROM attempts a
  WHERE a.status = 'completed'
    AND (p_filters->>'start_date' IS NULL OR a.completed_at >= (p_filters->>'start_date')::timestamptz)
    AND (p_filters->>'end_date' IS NULL OR a.completed_at <= (p_filters->>'end_date')::timestamptz)
  ORDER BY a.completed_at DESC
  LIMIT GREATEST(1, LEAST(p_page_size, 100))
  OFFSET v_offset;

  RETURN jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'page', GREATEST(1, p_page),
      'page_size', GREATEST(1, LEAST(p_page_size, 100)),
      'total', v_total_count,
      'rows', COALESCE(v_rows, '[]'::jsonb)
    ),
    'error', null
  );
END;
$$;

-- ============================================
-- 2. Admin RPC: admin_compare_share_activity
-- Returns compare share activity with session and attempt data
-- ============================================

CREATE OR REPLACE FUNCTION admin_compare_share_activity(
  p_session_token text,
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
  v_offset int;
  v_total_count bigint;
  v_rows jsonb;
BEGIN
  -- Validate admin session
  SELECT id INTO v_admin_id FROM validate_admin_session(p_session_token);
  
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'data', null,
      'error', jsonb_build_object(
        'code', 'ADMIN_UNAUTHORIZED',
        'message', 'Invalid or expired admin session token'
      )
    );
  END IF;

  -- Calculate offset
  v_offset := (GREATEST(1, p_page) - 1) * GREATEST(1, LEAST(p_page_size, 100));

  -- Get total count
  SELECT COUNT(*) INTO v_total_count
  FROM card_share_events cse
  WHERE cse.card_type = 'compare_minds'
    AND (p_filters->>'start_date' IS NULL OR cse.created_at >= (p_filters->>'start_date')::timestamptz)
    AND (p_filters->>'end_date' IS NULL OR cse.created_at <= (p_filters->>'end_date')::timestamptz)
    AND (p_filters->>'invite_token' IS NULL OR cse.invite_token = p_filters->>'invite_token');

  -- Get paginated rows with joined data
  SELECT jsonb_agg(
    jsonb_build_object(
      'created_at', cse.created_at,
      'share_action', cse.share_action,
      'invite_token', cse.invite_token,
      'compare_session_id', cse.compare_session_id,
      'page_path', cse.page_path,
      'participant_id', cse.participant_id,
      'session_status', cs.status,
      'attempt_a_id', cs.attempt_a_id,
      'attempt_a_completed_at', a_a.completed_at,
      'attempt_b_id', cs.attempt_b_id,
      'attempt_b_completed_at', a_b.completed_at
    )
    ORDER BY cse.created_at DESC
  ) INTO v_rows
  FROM card_share_events cse
  LEFT JOIN compare_sessions cs ON cs.id = cse.compare_session_id
  LEFT JOIN attempts a_a ON a_a.id = cs.attempt_a_id
  LEFT JOIN attempts a_b ON a_b.id = cs.attempt_b_id
  WHERE cse.card_type = 'compare_minds'
    AND (p_filters->>'start_date' IS NULL OR cse.created_at >= (p_filters->>'start_date')::timestamptz)
    AND (p_filters->>'end_date' IS NULL OR cse.created_at <= (p_filters->>'end_date')::timestamptz)
    AND (p_filters->>'invite_token' IS NULL OR cse.invite_token = p_filters->>'invite_token')
  ORDER BY cse.created_at DESC
  LIMIT GREATEST(1, LEAST(p_page_size, 100))
  OFFSET v_offset;

  RETURN jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'page', GREATEST(1, p_page),
      'page_size', GREATEST(1, LEAST(p_page_size, 100)),
      'total', v_total_count,
      'rows', COALESCE(v_rows, '[]'::jsonb)
    ),
    'error', null
  );
END;
$$;

-- ============================================
-- 3. Grant execute permissions
-- ============================================

GRANT EXECUTE ON FUNCTION admin_completed_attempts_with_clicks(text, jsonb, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_compare_share_activity(text, jsonb, int, int) TO authenticated;

-- ============================================
-- 4. Reload PostgREST schema cache
-- ============================================

SELECT pg_notify('pgrst', 'reload schema');

