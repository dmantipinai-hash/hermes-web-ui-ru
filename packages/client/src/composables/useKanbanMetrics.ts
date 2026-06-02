import { computed } from 'vue'
import type { KanbanTask } from '@/api/hermes/kanban'

/**
 * Format a duration in milliseconds to a human-readable string.
 * < 60min → "Xm"
 * < 24h   → "Xч Ym" (Xh Ym in English)
 * >= 24h  → "Xd Xч" (Xd Xh in English)
 */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const days = Math.floor(hours / 24)
  const remainHours = hours % 24

  if (days > 0) return `${days}d ${remainHours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/**
 * Calculate active duration for a completed task.
 * Returns ms, or null if not applicable.
 */
export function activeDuration(task: KanbanTask): number | null {
  if (task.status !== 'done') return null
  if (task.started_at == null || task.completed_at == null) return null
  const ms = (task.completed_at - task.started_at) * 1000
  return ms >= 0 ? ms : null
}

/**
 * Calculate running duration for a running task.
 * Returns ms, or null if not applicable.
 */
export function runningDuration(task: KanbanTask): number | null {
  if (task.status !== 'running') return null
  if (task.started_at == null) return null
  const ms = Date.now() - task.started_at * 1000
  return ms >= 0 ? ms : null
}

/**
 * Get total active time for all done tasks.
 */
export function totalActiveTime(tasks: KanbanTask[]): number {
  let total = 0
  for (const task of tasks) {
    const dur = activeDuration(task)
    if (dur != null) total += dur
  }
  return total
}

/**
 * Get average active time for done tasks.
 */
export function avgActiveTime(tasks: KanbanTask[]): number {
  const doneTasks = tasks.filter(t => t.status === 'done' && t.started_at != null && t.completed_at != null)
  if (doneTasks.length === 0) return 0
  return totalActiveTime(tasks) / doneTasks.length
}

/**
 * Composable that provides metrics computed from a task list.
 */
export function useKanbanMetrics(tasks: () => KanbanTask[]) {
  const totalActive = computed(() => totalActiveTime(tasks()))
  const avgActive = computed(() => avgActiveTime(tasks()))
  const totalTasks = computed(() => tasks().length)
  const doneTasks = computed(() => tasks().filter(t => t.status === 'done').length)
  const runningTasks = computed(() => tasks().filter(t => t.status === 'running').length)
  const blockedTasks = computed(() => tasks().filter(t => t.status === 'blocked').length)

  return {
    totalActive,
    avgActive,
    totalTasks,
    doneTasks,
    runningTasks,
    blockedTasks,
  }
}
