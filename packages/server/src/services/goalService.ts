/**
 * Goal service — CRUD for goals.
 */

import { getDb } from '../db'
import { randomUUID } from 'crypto'
import * as activity from './activityService'

export interface Goal {
  id: string
  title: string
  description: string
  status: 'active' | 'completed' | 'abandoned'
  created_at: number
  updated_at: number
}

function now(): number { return Date.now() }

function requireDb() {
  const db = getDb()
  if (!db) throw new Error('SQLite database not available')
  return db
}

export function listGoals(): Goal[] {
  const db = requireDb()
  return db.prepare('SELECT * FROM goals ORDER BY updated_at DESC').all() as unknown as Goal[]
}

export function getGoal(id: string): Goal | undefined {
  const db = requireDb()
  return db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as unknown as Goal | undefined
}

export function getActiveGoal(): Goal | undefined {
  const db = requireDb()
  return db.prepare("SELECT * FROM goals WHERE status = 'active' ORDER BY updated_at DESC LIMIT 1").get() as unknown as Goal | undefined
}

export function createGoal(data: { title: string; description?: string }): Goal {
  const db = requireDb()
  const goal: Goal = {
    id: randomUUID(),
    title: data.title,
    description: data.description ?? '',
    status: 'active',
    created_at: now(),
    updated_at: now(),
  }
  db.prepare(
    'INSERT INTO goals (id, title, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(goal.id, goal.title, goal.description, goal.status, goal.created_at, goal.updated_at)
  activity.logActivity('goal', goal.id, 'created', `Goal "${goal.title}" created`)
  return goal
}

export function updateGoal(id: string, data: Partial<Pick<Goal, 'title' | 'description' | 'status'>>): Goal | null {
  const db = requireDb()
  const existing = getGoal(id)
  if (!existing) return null

  const updated: Goal = {
    ...existing,
    ...Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined)),
    updated_at: now(),
  }
  db.prepare('UPDATE goals SET title=?, description=?, status=?, updated_at=? WHERE id=?')
    .run(updated.title, updated.description, updated.status, updated.updated_at, id)
  return updated
}

export function deleteGoal(id: string): boolean {
  const db = requireDb()
  return db.prepare('DELETE FROM goals WHERE id = ?').run(id).changes > 0
}
