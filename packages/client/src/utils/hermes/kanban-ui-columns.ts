import type { KanbanTaskStatus, TaskTurn, KanbanTaskMeta } from '@/api/hermes/kanban'

/**
 * Reverse mapping: UI column → Hermes status + optional turn + ui_status override.
 * The Web UI owns the collaboration workflow; Hermes status is used as the
 * execution backend, while ui_status keeps the manual board semantics stable.
 */
export function uiColumnToTaskState(uiColumn: UIColumn, assignee?: string | null): { status: KanbanTaskStatus; turn?: TaskTurn; ui_status?: KanbanTaskMeta['ui_status'] } {
  const normalizedAssignee = assignee?.trim() || null
  const isUserOwned = normalizedAssignee === 'user'
  const isUnassigned = normalizedAssignee == null
  switch (uiColumn) {
    case 'inbox': return { status: 'blocked', turn: 'user', ui_status: 'inbox' }
    case 'todo': return { status: 'blocked', turn: 'user', ui_status: 'todo' }
    case 'ready':
      if (isUnassigned || isUserOwned) return { status: 'blocked', turn: 'user', ui_status: 'todo' }
      return { status: 'ready', turn: 'agent', ui_status: 'ready' }
    case 'agent_working': return { status: 'running', turn: 'agent', ui_status: 'active' }
    case 'waiting_me': return { status: 'blocked', turn: 'user', ui_status: 'waiting' }
    case 'done': return { status: 'done', turn: 'done', ui_status: 'done' }
    case 'archive': return { status: 'archived', ui_status: 'archive' }
  }
}

export type UIColumn = 'inbox' | 'todo' | 'ready' | 'agent_working' | 'waiting_me' | 'done' | 'archive'

export const UI_COLUMNS: UIColumn[] = ['inbox', 'todo', 'ready', 'agent_working', 'waiting_me', 'done', 'archive']

/**
 * Map Hermes task status + turn + optional UI override → collaboration column.
 */
export function mapToUIColumn(
  status: KanbanTaskStatus,
  turn?: TaskTurn | null,
  uiStatus?: KanbanTaskMeta['ui_status'] | null,
  assignee?: string | null,
): UIColumn {
  if (uiStatus === 'inbox') return 'inbox'
  if (uiStatus === 'todo') return 'todo'
  if (uiStatus === 'ready') return 'ready'
  if (uiStatus === 'waiting') return 'waiting_me'
  if (uiStatus === 'done') return 'done'
  if (uiStatus === 'archive') return 'archive'

  switch (status) {
    case 'triage':
      return 'inbox'
    case 'todo':
      return 'todo'
    case 'ready':
      return assignee === 'user' ? 'todo' : 'ready'
    case 'running':
      return 'agent_working'
    case 'blocked':
      return turn === 'user' ? 'waiting_me' : 'inbox'
    case 'done':
      return 'done'
    case 'archived':
      return 'archive'
    default:
      return 'inbox'
  }
}

/**
 * Check if a task matches a UI column filter.
 */
export function taskMatchesUIColumn(
  status: KanbanTaskStatus,
  turn: TaskTurn | null | undefined,
  column: UIColumn,
  uiStatus?: KanbanTaskMeta['ui_status'] | null,
  assignee?: string | null,
): boolean {
  return mapToUIColumn(status, turn, uiStatus, assignee) === column
}
