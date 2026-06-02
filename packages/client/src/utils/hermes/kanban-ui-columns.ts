import type { KanbanTaskStatus, TaskTurn } from '@/api/hermes/kanban'

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
