-- =============================================================
-- ClipVault — Search Helper Functions
-- =============================================================

-- Full-text search across videos and folders for a user
CREATE OR REPLACE FUNCTION search_content(
  p_user_id TEXT,
  p_query   TEXT,
  p_limit   INTEGER DEFAULT 20
)
RETURNS TABLE(
  result_type TEXT,
  id          TEXT,
  title       TEXT,
  subtitle    TEXT,
  rank        REAL
) AS $$
DECLARE
  ts_query tsquery;
BEGIN
  -- Build a safe tsquery (prefix matching for partial words)
  ts_query := websearch_to_tsquery('english', p_query);

  RETURN QUERY

  -- Folders
  SELECT
    'folder'::TEXT AS result_type,
    f.id,
    f.name AS title,
    f.description AS subtitle,
    ts_rank(f.search_vector, ts_query) AS rank
  FROM "Folder" f
  WHERE
    f."userId" = p_user_id
    AND f.search_vector @@ ts_query

  UNION ALL

  -- Videos
  SELECT
    'video'::TEXT AS result_type,
    v.id,
    v.title,
    v."authorName" AS subtitle,
    ts_rank(v.search_vector, ts_query) AS rank
  FROM "Video" v
  WHERE
    v."userId" = p_user_id
    AND v.search_vector @@ ts_query

  ORDER BY rank DESC, result_type ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION search_content(TEXT, TEXT, INTEGER) TO authenticated;
