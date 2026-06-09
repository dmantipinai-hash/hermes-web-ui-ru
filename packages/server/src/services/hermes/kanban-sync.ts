import * as kanbanCli from './hermes-kanban'
import * as kanbanMeta from './kanban-meta'
import { logger } from '../logger'

/**
 * One-way sync: Hermes status → UI meta.
 *
 * Hermes auto-promotes tasks (triage → todo → ready → running → done),
 * but the UI's `ui_status` stored in webui.meta.json can become stale.
 * This function brings meta back in line with the Hermes source-of-truth
 * for statuses the user does NOT manually control.
 *
 * Rules (Hermes → UI, one-directional):
 *   done      → ui_status='done', turn='done'
 *   running   + turn=agent → ui_status='active'
 *   blocked   + turn=agent → ui_status='waiting', turn='user'
 *   archived  → ui_status='archive'
 *
 * Deliberately untouched (user-managed): inbox, todo, waiting.
 *
 * @returns Number of tasks whose meta was updated.
 */
export async function syncHermesToMeta(board: string): Promise<number> {
  // Fetch Hermes tasks (include archived so we can sync archived status)
  const tasks = await kanbanCli.listTasks({ board, includeArchived: true })

  // Read current meta
  const meta = await kanbanMeta.readMeta(board)
  const taskMeta = meta.taskMeta || {}

  const updates: Record<string, Partial<kanbanMeta.KanbanTaskMeta>> = {}
  let syncCount = 0

  for (const task of tasks) {
    const tm = taskMeta[task.id] || {}
    const currentUiStatus = tm.ui_status
    const currentTurn = tm.turn

    // Skip user-managed statuses: only Hermes-driven transitions are synced
    if (
      currentUiStatus === 'inbox' ||
      currentUiStatus === 'todo' ||
      currentUiStatus === 'waiting'
    ) {
      continue
    }

    const patch: Partial<kanbanMeta.KanbanTaskMeta> = {}
    let needsUpdate = false

    switch (task.status) {
      case 'done': {
        // Task completed in Hermes → mark done in UI
        if (currentUiStatus !== 'done') {
          patch.ui_status = 'done'
          needsUpdate = true
        }
        if (currentTurn !== 'done') {
          patch.turn = 'done'
          needsUpdate = true
        }
        break
      }

      case 'archived': {
        // Task archived in Hermes → archive in UI
        if (currentUiStatus !== 'archive') {
          patch.ui_status = 'archive'
          needsUpdate = true
        }
        break
      }

      case 'running': {
        // Agent is actively working → show in active column
        if (currentTurn === 'agent' && currentUiStatus !== 'active') {
          patch.ui_status = 'active'
          needsUpdate = true
        }
        break
      }

      case 'blocked': {
        // Agent hit a blocker and needs user help
        if (currentTurn === 'agent') {
          patch.ui_status = 'waiting'
          patch.turn = 'user'
          needsUpdate = true
        }
        break
      }

      default:
        // triage/todo/ready — no automatic sync; user controls these
        break
    }

    if (needsUpdate) {
      updates[task.id] = patch
      syncCount++
    }
  }

  if (syncCount > 0) {
    await kanbanMeta.writeMeta(board, { taskMeta: updates })
    logger.info({ board, syncCount }, 'kanban-sync: synchronized Hermes statuses to UI meta')
  }

  return syncCount
}
