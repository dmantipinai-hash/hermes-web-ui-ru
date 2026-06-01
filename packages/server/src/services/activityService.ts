/**
 * Activity service — log events and retrieve the feed.
 */

import { getDb } from '../db'
import { broadcastWorkflowEvent } from '../routes/hermes/workflow-events'

export interface ActivityEntry {
  id: number
  type: 'goal' | 'workflow' | 'run' | 'step'
  entity_id: string
  action: 'created' | 'updated' | 'started' | 'completed' | 'failed'
  message: string
  created_at: number
}

function now(): number { return Date.now() }

function requireDb() {
  const db = getDb()
  if (!db) throw new Error('SQLite database not available')
  return db
}

export function logActivity(
  type: ActivityEntry['type'],
  entityId: string,
  action: ActivityEntry['action'],
  message: string
): ActivityEntry {
  const db = requireDb()
  const createdAt = now()
  db.prepare(
    'INSERT INTO activity_log (type, entity_id, action, message, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(type, entityId, action, message, createdAt)

  const row = db.prepare('SELECT * FROM activity_log WHERE rowid = last_insert_rowid()').get() as unknown as ActivityEntry
  broadcastWorkflowEvent({ type: 'activity:new', payload: { id: row.id, type: row.type, entity_id: row.entity_id, action: row.action, message: row.message, created_at: row.created_at } })
  return row
}

export function getFeed(limit = 50, offset = 0): ActivityEntry[] {
  const db = requireDb()
  return db.prepare(
    'SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(limit, offset) as unknown as ActivityEntry[]
}

export function getActivityForEntity(type: ActivityEntry['type'], entityId: string, limit = 20): ActivityEntry[] {
  const db = requireDb()
  return db.prepare(
    'SELECT * FROM activity_log WHERE type = ? AND entity_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(type, entityId, limit) as unknown as ActivityEntry[]
}
