/**
 * Goals database schema.
 */

export const GOALS_TABLE = 'goals'

export const GOALS_SCHEMA: Record<string, string> = {
  id: 'TEXT PRIMARY KEY',
  title: 'TEXT NOT NULL',
  description: "TEXT NOT NULL DEFAULT ''",
  status: "TEXT NOT NULL DEFAULT 'active'", // active | completed | abandoned
  created_at: 'INTEGER NOT NULL',
  updated_at: 'INTEGER NOT NULL',
}
