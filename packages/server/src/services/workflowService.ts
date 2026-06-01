/**
 * Workflow service — CRUD + run/stop logic for workflows.
 * Uses the project's SQLite backend via getDb().
 */

import { getDb } from '../db'
import { randomUUID } from 'crypto'

// ─── Types ──────────────────────────────────────────────────

export interface Workflow {
  id: string
  name: string
  description: string
  status: 'active' | 'paused' | 'archived'
  goal_id: string | null
  config: string // JSON
  created_at: number
  updated_at: number
}

export interface WorkflowRun {
  id: string
  workflow_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  started_at: number
  finished_at: number | null
  time_spent_sec: number
  result: string | null // JSON
}

export interface WorkflowStepLog {
  id: number
  run_id: string
  step_name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  payload: string // JSON
  created_at: number
}

// ─── Helpers ────────────────────────────────────────────────

function now(): number {
  return Date.now()
}

function requireDb() {
  const db = getDb()
  if (!db) throw new Error('SQLite database not available')
  return db
}

// ─── Workflow CRUD ──────────────────────────────────────────

export function listWorkflows(): Workflow[] {
  const db = requireDb()
  return db.prepare('SELECT * FROM workflows ORDER BY updated_at DESC').all() as unknown as Workflow[]
}

export function getWorkflow(id: string): Workflow | undefined {
  const db = requireDb()
  return db.prepare('SELECT * FROM workflows WHERE id = ?').get(id) as unknown as Workflow | undefined
}

export function createWorkflow(data: {
  name: string
  description?: string
  goal_id?: string
  config?: Record<string, unknown>
}): Workflow {
  const db = requireDb()
  const workflow: Workflow = {
    id: randomUUID(),
    name: data.name,
    description: data.description ?? '',
    status: 'active',
    goal_id: data.goal_id ?? null,
    config: JSON.stringify(data.config ?? {}),
    created_at: now(),
    updated_at: now(),
  }
  db.prepare(
    'INSERT INTO workflows (id, name, description, status, goal_id, config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    workflow.id, workflow.name, workflow.description, workflow.status,
    workflow.goal_id, workflow.config, workflow.created_at, workflow.updated_at
  )
  return workflow
}

export function updateWorkflow(id: string, data: Partial<Pick<Workflow, 'name' | 'description' | 'status' | 'goal_id' | 'config'>>): Workflow | null {
  const db = requireDb()
  const existing = getWorkflow(id)
  if (!existing) return null

  const updated: Workflow = {
    ...existing,
    ...Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    ),
    updated_at: now(),
  }
  // Handle config object → JSON
  if (data.config && typeof data.config === 'object') {
    (updated as any).config = JSON.stringify(data.config)
  }

  db.prepare(
    'UPDATE workflows SET name=?, description=?, status=?, goal_id=?, config=?, updated_at=? WHERE id=?'
  ).run(updated.name, updated.description, updated.status, updated.goal_id, updated.config, updated.updated_at, id)
  return updated
}

export function deleteWorkflow(id: string): boolean {
  const db = requireDb()
  const result = db.prepare('DELETE FROM workflows WHERE id = ?').run(id)
  return result.changes > 0
}

// ─── Workflow Runs ──────────────────────────────────────────

export function listRuns(workflowId: string): WorkflowRun[] {
  const db = requireDb()
  return db.prepare('SELECT * FROM workflow_runs WHERE workflow_id = ? ORDER BY started_at DESC').all(workflowId) as unknown as WorkflowRun[]
}

export function getWorkflowTime(workflowId: string): { total_seconds: number; runs_count: number; runs: Array<{ id: string; status: string; time_spent_sec: number; started_at: number; finished_at: number | null }> } {
  const db = requireDb()
  const runs = db.prepare('SELECT id, status, time_spent_sec, started_at, finished_at FROM workflow_runs WHERE workflow_id = ?').all(workflowId) as Array<{ id: string; status: string; time_spent_sec: number; started_at: number; finished_at: number | null }>
  const totalSeconds = runs.reduce((sum, r) => {
    if (r.time_spent_sec > 0) return sum + r.time_spent_sec
    // Running run: compute live elapsed time
    if (r.status === 'running') return sum + Math.round((Date.now() - r.started_at) / 1000)
    return sum
  }, 0)
  return { total_seconds: totalSeconds, runs_count: runs.length, runs }
}

export function getRun(workflowId: string, runId: string): WorkflowRun | undefined {
  const db = requireDb()
  return db.prepare('SELECT * FROM workflow_runs WHERE id = ? AND workflow_id = ?').get(runId, workflowId) as unknown as WorkflowRun | undefined
}

export function startRun(workflowId: string): WorkflowRun {
  const db = requireDb()
  const workflow = getWorkflow(workflowId)
  if (!workflow) throw new Error('Workflow not found')
  if (workflow.status !== 'active') throw new Error(`Cannot start workflow in '${workflow.status}' status`)

  const run: WorkflowRun = {
    id: randomUUID(),
    workflow_id: workflowId,
    status: 'running',
    started_at: now(),
    finished_at: null,
    time_spent_sec: 0,
    result: null,
  }
  db.prepare(
    'INSERT INTO workflow_runs (id, workflow_id, status, started_at, finished_at, time_spent_sec, result) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(run.id, run.workflow_id, run.status, run.started_at, run.finished_at, run.time_spent_sec, run.result)
  return run
}

export function stopRun(workflowId: string, runId: string, result?: Record<string, unknown>): WorkflowRun | null {
  const db = requireDb()
  const run = getRun(workflowId, runId)
  if (!run) return null
  if (run.status !== 'running') throw new Error(`Cannot stop run in '${run.status}' status`)

  const finishedAt = now()
  const timeSpentSec = Math.round((finishedAt - run.started_at) / 1000)

  db.prepare(
    'UPDATE workflow_runs SET status=?, finished_at=?, time_spent_sec=?, result=? WHERE id=?'
  ).run('completed', finishedAt, timeSpentSec, result ? JSON.stringify(result) : null, runId)

  return getRun(workflowId, runId)!
}

// ─── Step Logging ───────────────────────────────────────────

export function logStep(runId: string, stepName: string, status: WorkflowStepLog['status'], payload?: Record<string, unknown>): void {
  const db = requireDb()
  db.prepare(
    'INSERT INTO workflow_steps_log (run_id, step_name, status, payload, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(runId, stepName, status, JSON.stringify(payload ?? {}), now())
}

export function getStepLogs(runId: string): WorkflowStepLog[] {
  const db = requireDb()
  return db.prepare('SELECT * FROM workflow_steps_log WHERE run_id = ? ORDER BY created_at ASC').all(runId) as unknown as WorkflowStepLog[]
}
