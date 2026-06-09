import { resolve, dirname } from 'path'
import { homedir } from 'os'
import { readFile, writeFile, rename, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { normalizeBoardSlug } from './hermes-kanban'
import { logger } from '../logger'

// ─── Types ──────────────────────────────────────────────────────

export interface KanbanMilestone {
  id: string
  name: string
  description: string
  sort_order: number
  archived: boolean
  created_at: number
  updated_at: number
}

export type TaskTurn = 'user' | 'agent' | 'done'

export interface KanbanTaskMeta {
  milestoneId?: string
  turn?: TaskTurn
  requester?: string
  due_date?: string
  labels?: string[]
  checklist?: ChecklistItem[]
  ui_status?: 'inbox' | 'todo' | 'ready' | 'active' | 'waiting' | 'done' | 'archive'
  pinned?: boolean
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface KanbanBoardMeta {
  version: number
  updated_at: number
  goal: string
  milestones: KanbanMilestone[]
  taskMeta: Record<string, KanbanTaskMeta>
}

const VALID_TURNS: TaskTurn[] = ['user', 'agent', 'done']

// ─── Constants ──────────────────────────────────────────────────

const MAX_GOAL_LENGTH = 4000
const MAX_MILESTONE_NAME_LENGTH = 120
const MAX_MILESTONE_DESC_LENGTH = 1000
const MAX_MILESTONES = 50

function defaultMeta(): KanbanBoardMeta {
  return {
    version: 1,
    updated_at: Date.now(),
    goal: '',
    milestones: [],
    taskMeta: {},
  }
}

// ─── Path helpers ───────────────────────────────────────────────

function metaFilePath(board: string): string {
  const slug = normalizeBoardSlug(board)
  return resolve(homedir(), '.hermes', 'kanban', 'workspaces', slug, 'webui.meta.json')
}

// ─── Read ───────────────────────────────────────────────────────

export async function readMeta(board: string): Promise<KanbanBoardMeta> {
  const filePath = metaFilePath(board)
  try {
    const raw = await readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return defaultMeta()
    return {
      version: typeof parsed.version === 'number' ? parsed.version : 1,
      updated_at: typeof parsed.updated_at === 'number' ? parsed.updated_at : Date.now(),
      goal: typeof parsed.goal === 'string' ? parsed.goal : '',
      milestones: Array.isArray(parsed.milestones) ? parsed.milestones : [],
      taskMeta: parsed.taskMeta && typeof parsed.taskMeta === 'object' && !Array.isArray(parsed.taskMeta) ? parsed.taskMeta : {},
    }
  } catch {
    return defaultMeta()
  }
}

// ─── Validation ─────────────────────────────────────────────────

function validatePartial(partial: Record<string, unknown>): string | null {
  if ('goal' in partial && typeof partial.goal === 'string' && partial.goal.length > MAX_GOAL_LENGTH) {
    return `goal must be <= ${MAX_GOAL_LENGTH} characters`
  }
  if ('milestones' in partial && Array.isArray(partial.milestones)) {
    if (partial.milestones.length > MAX_MILESTONES) {
      return `milestones must be <= ${MAX_MILESTONES}`
    }
    for (const ms of partial.milestones) {
      if (typeof ms.name === 'string' && ms.name.length > MAX_MILESTONE_NAME_LENGTH) {
        return `milestone.name must be <= ${MAX_MILESTONE_NAME_LENGTH} characters`
      }
      if (typeof ms.description === 'string' && ms.description.length > MAX_MILESTONE_DESC_LENGTH) {
        return `milestone.description must be <= ${MAX_MILESTONE_DESC_LENGTH} characters`
      }
    }
  }
  if ('taskMeta' in partial && typeof partial.taskMeta === 'object' && partial.taskMeta !== null && !Array.isArray(partial.taskMeta)) {
    for (const [taskId, meta] of Object.entries(partial.taskMeta as Record<string, unknown>)) {
      if (typeof meta === 'object' && meta !== null) {
        const m = meta as Record<string, unknown>
        if ('turn' in m) {
          const turn = m.turn
          if (!VALID_TURNS.includes(turn as TaskTurn)) {
            return `taskMeta[${taskId}].turn must be one of: ${VALID_TURNS.join(', ')}`
          }
        }
        if ('labels' in m && !Array.isArray(m.labels)) {
          return `taskMeta[${taskId}].labels must be an array`
        }
        if ('checklist' in m && !Array.isArray(m.checklist)) {
          return `taskMeta[${taskId}].checklist must be an array`
        }
        if ('ui_status' in m) {
          const validStatuses = ['inbox', 'todo', 'ready', 'active', 'waiting', 'done', 'archive']
          if (!validStatuses.includes(m.ui_status as string)) {
            return `taskMeta[${taskId}].ui_status must be one of: ${validStatuses.join(', ')}`
          }
        }
      }
    }
  }
  return null
}

// ─── Write ──────────────────────────────────────────────────────

export async function writeMeta(board: string, partial: Record<string, unknown>): Promise<KanbanBoardMeta> {
  const validationError = validatePartial(partial)
  if (validationError) throw new Error(validationError)

  const current = await readMeta(board)

  // Partial merge
  if ('goal' in partial && typeof partial.goal === 'string') {
    current.goal = partial.goal
  }
  if ('milestones' in partial && Array.isArray(partial.milestones)) {
    current.milestones = partial.milestones
  }
  if ('taskMeta' in partial && typeof partial.taskMeta === 'object' && !Array.isArray(partial.taskMeta)) {
    // Merge taskMeta: deep merge at task level, preserving existing fields
    const incomingTaskMeta = partial.taskMeta as Record<string, KanbanTaskMeta>
    const mergedTaskMeta = { ...current.taskMeta }
    for (const [taskId, incoming] of Object.entries(incomingTaskMeta)) {
      mergedTaskMeta[taskId] = { ...(mergedTaskMeta[taskId] || {}), ...incoming }
    }
    current.taskMeta = mergedTaskMeta
  }

  current.updated_at = Date.now()

  // Atomic write: tmp → rename
  const filePath = metaFilePath(board)
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  const tmpPath = filePath + '.tmp'
  await writeFile(tmpPath, JSON.stringify(current, null, 2), 'utf-8')
  await rename(tmpPath, filePath)

  return current
}

// ─── Task turn helpers ────────────────────────────────────────

export async function getTaskTurn(board: string, taskId: string): Promise<TaskTurn | undefined> {
  const meta = await readMeta(board)
  return meta.taskMeta[taskId]?.turn
}

export async function setTaskTurn(board: string, taskId: string, turn: TaskTurn): Promise<KanbanBoardMeta> {
  return writeMeta(board, {
    taskMeta: { [taskId]: { turn } },
  })
}
