/**
 * Turn indicates whose move it is in a task.
 */
export type TaskTurn = 'user' | 'agent' | 'done'

/**
 * UI column identifiers for the kanban board.
 * These map to user-facing Russian column names via i18n.
 */
export type UiColumn = 'inbox' | 'todo' | 'agent_working' | 'waiting_me' | 'done' | 'archive'

export type HermesStatus = 'triage' | 'todo' | 'ready' | 'running' | 'blocked' | 'done' | 'archived'

/**
 * Map a Hermes task status + turn to a UI column.
 *
 * Mapping rules (from Архитектура.md):
 *   triage           → inbox       (Входящие)
 *   todo/ready       → todo        (Нужно сделать)
 *   running + agent  → agent_working (Агент работает)
 *   running + user   → waiting_me  (Ждёт меня)
 *   blocked + user   → waiting_me  (Ждёт меня)
 *   blocked + agent  → agent_working (Агент работает)
 *   done             → done        (Готово)
 *   archived         → archive     (Архив)
 */
export function mapToUiColumn(status: HermesStatus, turn?: TaskTurn): UiColumn {
  if (status === 'archived') return 'archive'
  if (status === 'done') return 'done'
  if (status === 'triage') return 'inbox'
  if (status === 'todo' || status === 'ready') return 'todo'
  if (status === 'running') {
    return turn === 'user' ? 'waiting_me' : 'agent_working'
  }
  if (status === 'blocked') {
    return turn === 'user' ? 'waiting_me' : 'agent_working'
  }
  // Fallback
  return 'inbox'
}

/** Ordered UI columns for rendering */
export const UI_COLUMNS: UiColumn[] = [
  'inbox',
  'todo',
  'agent_working',
  'waiting_me',
  'done',
]
