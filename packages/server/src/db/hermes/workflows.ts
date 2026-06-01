/**
 * Workflow database schemas and initialization.
 * Tables: workflows, workflow_runs, workflow_steps_log
 */

// ============================================================================
// Workflows
// ============================================================================

export const WORKFLOWS_TABLE = 'workflows'

export const WORKFLOWS_SCHEMA: Record<string, string> = {
  id: 'TEXT PRIMARY KEY',
  name: 'TEXT NOT NULL',
  description: "TEXT NOT NULL DEFAULT ''",
  status: "TEXT NOT NULL DEFAULT 'active'", // active | paused | archived
  goal_id: 'TEXT',                           // nullable FK to goals table
  config: "TEXT NOT NULL DEFAULT '{}'",      // JSON config
  created_at: 'INTEGER NOT NULL',
  updated_at: 'INTEGER NOT NULL',
}

// ============================================================================
// Workflow Runs
// ============================================================================

export const WORKFLOW_RUNS_TABLE = 'workflow_runs'

export const WORKFLOW_RUNS_SCHEMA: Record<string, string> = {
  id: 'TEXT PRIMARY KEY',
  workflow_id: 'TEXT NOT NULL',
  status: "TEXT NOT NULL DEFAULT 'pending'",  // pending | running | completed | failed
  started_at: 'INTEGER NOT NULL',
  finished_at: 'INTEGER',
  time_spent_sec: 'INTEGER NOT NULL DEFAULT 0',  // computed elapsed seconds
  result: 'TEXT',                             // JSON result payload
}

// ============================================================================
// Workflow Steps Log
// ============================================================================

export const WORKFLOW_STEPS_LOG_TABLE = 'workflow_steps_log'

export const WORKFLOW_STEPS_LOG_SCHEMA: Record<string, string> = {
  id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
  run_id: 'TEXT NOT NULL',
  step_name: 'TEXT NOT NULL',
  status: "TEXT NOT NULL DEFAULT 'pending'",  // pending | running | completed | failed
  payload: "TEXT NOT NULL DEFAULT '{}'",      // JSON payload
  created_at: 'INTEGER NOT NULL',
}

export const WORKFLOW_STEPS_LOG_INDEX = 'CREATE INDEX IF NOT EXISTS idx_wfs_steps_run_id ON workflow_steps_log(run_id)'
export const WORKFLOW_RUNS_WORKFLOW_INDEX = 'CREATE INDEX IF NOT EXISTS idx_wf_runs_workflow_id ON workflow_runs(workflow_id)'
