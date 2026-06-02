import type { KanbanTaskStatus, TaskTurn } from '@/api/hermes/kanban'

/**
 * Reverse mapping: UI column → Hermes status + optional turn.
 * Used when a task is dragged to a UI column to determine the backend status.
 */
export function uiColumnToHermesStatus(uiColumn: UIColumn): { status: KanbanTaskStatus; turn?: TaskTurn } {
  switch (uiColumn) {
    case 'inbox': return { status: 'triage' }
    case 'todo': return { status: 'todo' }
    case 'agent_working': return { status: 'running', turn: 'agent' }
    case 'waiting_me': return { status: 'blocked', turn: 'user' }
    case 'done': return { status: 'done' }
    case 'archive': return { status: 'archived' }
  }
}

export type UIColumn = 'inbox' | 'todo' | 'agent_working' | 'waiting_me' | 'done' | 'archive'

export const UI_COLUMNS: UIColumn[] = ['inbox', 'todo', 'agent_working', 'waiting_me', 'done', 'archive']

/**
 * Map Hermes task status + turn → UI column for the collaboration view.
 */
export function mapToUIColumn(status: KanbanTaskStatus, turn?: TaskTurn | null): UIColumn {
  switch (status) {
    case 'triage':
      return 'inbox'
    case 'todo':
    case 'ready':
      return 'todo'
    case 'running':
      return 'agent_working'
    case 'blocked':
      return turn === 'user' ? 'waiting_me' : 'agent_working'
    case 'done':
    case 'archived':
      return 'done'
    default:
      return 'inbox'
  }
}

/**
 * Check if a task with given status/turn matches a UI column filter.
 */
export function taskMatchesUIColumn(status: KanbanTaskStatus, turn: TaskTurn | null | undefined, column: UIColumn): boolean {
  return mapToUIColumn(status, turn) === column
}
