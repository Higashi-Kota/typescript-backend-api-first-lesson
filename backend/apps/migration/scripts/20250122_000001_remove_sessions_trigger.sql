-- Remove the sessions trigger that references non-existent updated_at column
DROP TRIGGER IF EXISTS update_sessions_last_activity_at ON sessions;