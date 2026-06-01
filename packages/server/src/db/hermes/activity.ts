/**
 * Activity log schema for the live feed.
 */

export const ACTIVITY_LOG_TABLE = 'activity_log'

export const ACTIVITY_LOG_SCHEMA: Record<string, string> = {
  id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
  type: "TEXT NOT NULL",         // goal | workflow | run | step
  entity_id: 'TEXT NOT NULL',    // id of the related entity
  action: "TEXT NOT NULL",       // created | updated | started | completed | failed
  message: "TEXT NOT NULL DEFAULT ''",
  created_at: 'INTEGER NOT NULL',
}

export const ACTIVITY_LOG_INDEX = 'CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC)'
export const ACTIVITY_LOG_TYPE_INDEX = 'CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(type, entity_id)'
