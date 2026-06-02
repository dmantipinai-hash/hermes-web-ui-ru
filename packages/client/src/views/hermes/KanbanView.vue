<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { NButton, NSelect, NSpin, NModal, NInput, useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { DnDProvider } from '@vue-dnd-kit/core'
import { UI_COLUMNS, mapToUIColumn, uiColumnToHermesStatus, type UIColumn } from '@/utils/hermes/kanban-ui-columns'
import KanbanTaskDrawer from '@/components/hermes/kanban/KanbanTaskDrawer.vue'
import KanbanCreateForm from '@/components/hermes/kanban/KanbanCreateForm.vue'
import KanbanGoalCard from '@/components/hermes/kanban/KanbanGoalCard.vue'
import KanbanStatsMini from '@/components/hermes/kanban/KanbanStatsMini.vue'
import KanbanColumnDropZone from '@/components/hermes/kanban/KanbanColumnDropZone.vue'
import { DEFAULT_KANBAN_BOARD, useKanbanStore } from '@/stores/hermes/kanban'
import { useProfilesStore } from '@/stores/hermes/profiles'
import { withDefaultAssignee } from '@/utils/hermes/kanban-assignees'
import type { KanbanTaskStatus } from '@/api/hermes/kanban'
import type { ProfileAvatar } from '@/api/hermes/profiles'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const message = useMessage()
const kanbanStore = useKanbanStore()
const profilesStore = useProfilesStore()

const showCreateForm = ref(false)
const showCreateBoardForm = ref(false)
const selectedTaskId = ref<string | null>(null)
const newBoardSlug = ref('')
const newBoardName = ref('')
const boardActionLoading = ref(false)
const refreshTimer = ref<ReturnType<typeof setInterval> | null>(null)
const routeReady = ref(false)
const milestoneFilter = ref<string | null>(null)
const turnFilter = ref<boolean>(false) // true = show only turn='user' tasks
const agentFilter = ref<boolean>(false) // true = show only turn='agent' tasks
const useUIColumns = ref(true) // toggle between UI columns and technical columns
const compactMode = ref(true) // compact card density

const boardStatuses: KanbanTaskStatus[] = ['triage', 'todo', 'ready', 'running', 'blocked', 'done', 'archived']

function firstQueryString(value: unknown): string | null {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : null
  return typeof value === 'string' ? value : null
}

function routeBoard(): string | null {
  return firstQueryString(route.query.board)
}

async function replaceRouteBoard(board: string) {
  if (routeBoard() === board) return
  await router.replace({ query: { ...route.query, board } })
}

async function applyBoardSelection(candidate: string | null, notify = true, forceRefresh = false) {
  const previousBoard = kanbanStore.selectedBoard
  const { board, recovered } = kanbanStore.recoverSelectedBoard(candidate || kanbanStore.selectedBoard || DEFAULT_KANBAN_BOARD)
  selectedTaskId.value = null
  showCreateForm.value = false
  showCreateBoardForm.value = false
  if (notify && recovered && kanbanStore.boardWarning) message.warning(kanbanStore.boardWarning)
  await replaceRouteBoard(board)
  if (forceRefresh || board !== previousBoard) {
    await kanbanStore.refreshAll()
  }
}

function taskCountLabel(count: number): string {
  return `${t('kanban.stats.tasks')}: ${count}`
}

const boardOptions = computed(() => kanbanStore.activeBoards.map(board => {
  const count = typeof board.total === 'number' ? board.total : 0
  return {
    label: `${t('kanban.title')}: ${board.icon ? `${board.icon} ` : ''}${board.name || board.slug} · ${taskCountLabel(count)}`,
    value: board.slug,
  }
}))

const selectedBoardValue = computed({
  get: () => kanbanStore.selectedBoard,
  set: (value: string) => {
    void applyBoardSelection(value || DEFAULT_KANBAN_BOARD)
  },
})

const tasksByStatus = computed(() => {
  const grouped: Record<string, typeof kanbanStore.tasks> = {}
  // Apply filters
  let filtered = kanbanStore.tasks
  if (milestoneFilter.value) {
    filtered = filtered.filter(t => kanbanStore.meta?.taskMeta?.[t.id]?.milestoneId === milestoneFilter.value)
  }
  if (turnFilter.value) {
    filtered = filtered.filter(t => kanbanStore.meta?.taskMeta?.[t.id]?.turn === 'user')
  }
  if (agentFilter.value) {
    filtered = filtered.filter(t => kanbanStore.meta?.taskMeta?.[t.id]?.turn === 'agent')
  }
  if (useUIColumns.value) {
    // UI columns mode
    for (const col of UI_COLUMNS) {
      grouped[col] = filtered
        .filter(t => mapToUIColumn(t.status, kanbanStore.meta?.taskMeta?.[t.id]?.turn) === col)
        .sort((a, b) => b.created_at - a.created_at)
    }
  } else {
    // Technical status mode
    for (const status of boardStatuses) {
      grouped[status] = filtered
        .filter(t => t.status === status)
        .sort((a, b) => b.created_at - a.created_at)
    }
  }
  return grouped
})

const activeColumns = computed(() => {
  return useUIColumns.value ? UI_COLUMNS : boardStatuses
})

const activeMilestones = computed(() =>
  (kanbanStore.meta?.milestones || []).filter(ms => !ms.archived)
)

const visibleBoardStatuses = computed(() => {
  const cols = activeColumns.value
  if (useUIColumns.value) return cols
  const status = kanbanStore.filterStatus as KanbanTaskStatus | null
  return status && boardStatuses.includes(status) ? [status] : cols
})

const visibleAssignees = computed(() => withDefaultAssignee(kanbanStore.assignees, kanbanStore.stats?.by_assignee || {}))

const profileAvatarByName = computed<Record<string, ProfileAvatar | null>>(() => {
  return Object.fromEntries(profilesStore.profiles.map(profile => [profile.name, profile.avatar || null]))
})

const statusFilterOptions = computed(() => [
  { label: t('kanban.allStatuses'), value: '' },
  ...boardStatuses.map(s => ({ label: t(`kanban.columns.${s}`, s), value: s })),
])

const assigneeFilterOptions = computed(() => [
  { label: t('kanban.allAssignees'), value: '' },
  ...visibleAssignees.value.map(a => ({ label: a.name, value: a.name })),
])

const filterStatusValue = computed({
  get: () => kanbanStore.filterStatus || '',
  set: (v: string) => kanbanStore.setFilter('status', v || null),
})

const filterAssigneeValue = computed({
  get: () => kanbanStore.filterAssignee || '',
  set: (v: string) => kanbanStore.setFilter('assignee', v || null),
})

const waitingForMeCount = computed(() => {
  return kanbanStore.tasks.filter(t => kanbanStore.meta?.taskMeta?.[t.id]?.turn === 'user').length
})

/** Height available for kanban columns below the header/stats area */
const columnMaxHeight = computed(() => 'calc(100vh - 240px)')

watch(() => route.query.board, async () => {
  if (!routeReady.value) return
  await applyBoardSelection(routeBoard(), false)
})

onMounted(async () => {
  await Promise.all([
    kanbanStore.fetchBoards(),
    kanbanStore.fetchCapabilities(),
    profilesStore.profiles.length === 0 ? profilesStore.fetchProfiles() : Promise.resolve(),
  ])
  await applyBoardSelection(routeBoard(), true, true)
  kanbanStore.startEventStream()
  routeReady.value = true
  refreshTimer.value = setInterval(() => {
    if (document.visibilityState === 'visible') {
      void Promise.all([kanbanStore.fetchBoards(), kanbanStore.fetchTasks(true), kanbanStore.fetchStats()])
    }
  }, 15000)
})

onUnmounted(() => {
  kanbanStore.stopEventStream()
  if (refreshTimer.value) clearInterval(refreshTimer.value)
})

function handleTaskClick(taskId: string) {
  selectedTaskId.value = taskId
}

function handleDrawerClose() {
  selectedTaskId.value = null
}

async function handleDrawerUpdated() {
  await Promise.all([kanbanStore.fetchTasks(), kanbanStore.fetchStats()])
}

async function handleApplyFilter() {
  await kanbanStore.fetchTasks()
}

async function handleStatusChipClick(status: KanbanTaskStatus | null) {
  kanbanStore.setFilter('status', status)
  await kanbanStore.fetchTasks()
}

async function handleTaskCreated() {
  await Promise.all([kanbanStore.fetchTasks(), kanbanStore.fetchStats(), kanbanStore.fetchBoards()])
}

async function handleCreateBoard() {
  const slug = newBoardSlug.value.trim()
  if (!slug) {
    message.warning(t('kanban.board.slugRequired'))
    return
  }
  boardActionLoading.value = true
  try {
    const board = await kanbanStore.createBoard({
      slug,
      name: newBoardName.value.trim() || undefined,
    })
    newBoardSlug.value = ''
    newBoardName.value = ''
    showCreateBoardForm.value = false
    await replaceRouteBoard(board.slug)
    message.success(t('kanban.board.created'))
  } catch (err: any) {
    message.error(err.message)
  } finally {
    boardActionLoading.value = false
  }
}

async function handleArchiveSelectedBoard() {
  if (kanbanStore.selectedBoard === DEFAULT_KANBAN_BOARD) return
  if (!window.confirm(t('kanban.board.archiveConfirm'))) return
  boardActionLoading.value = true
  try {
    await kanbanStore.archiveSelectedBoard()
    await replaceRouteBoard(DEFAULT_KANBAN_BOARD)
    message.success(t('kanban.board.archived'))
  } catch (err: any) {
    message.error(err.message)
  } finally {
    boardActionLoading.value = false
  }
}

async function handleColumnDrop(taskId: string, targetColumn: string) {
  try {
    if (useUIColumns.value) {
      const { status, turn } = uiColumnToHermesStatus(targetColumn as UIColumn)
      // Check if task is already in the target status
      const task = kanbanStore.tasks.find(t => t.id === taskId)
      if (task && task.status === status && !turn) return
      if (import.meta.env.DEV) console.log('[DnD] drop:', { taskId, targetColumn, status, turn })
      const result = await kanbanStore.bulkUpdateTasks({ ids: [taskId], status })
      // Check for per-task failures
      const failed = result.results?.filter((r: any) => !r.ok)
      if (failed && failed.length > 0) {
        const errors = failed.map((r: any) => r.error).join('; ')
        message.error(errors || t('kanban.message.moveFailed', 'Failed to move task'))
        return
      }
      if (turn) {
        await kanbanStore.setTaskTurn(taskId, turn)
      }
    } else {
      const task = kanbanStore.tasks.find(t => t.id === taskId)
      if (task && task.status === targetColumn) return
      if (import.meta.env.DEV) console.log('[DnD] drop:', { taskId, targetColumn })
      const result = await kanbanStore.bulkUpdateTasks({ ids: [taskId], status: targetColumn as KanbanTaskStatus })
      const failed = result.results?.filter((r: any) => !r.ok)
      if (failed && failed.length > 0) {
        const errors = failed.map((r: any) => r.error).join('; ')
        message.error(errors || t('kanban.message.moveFailed', 'Failed to move task'))
        return
      }
    }
    message.success(t('kanban.message.taskMoved', 'Task moved'))
    await kanbanStore.refreshAll()
  } catch (err: any) {
    if (import.meta.env.DEV) console.error('[DnD] error:', err)
    message.error(err.message || t('kanban.message.moveFailed', 'Failed to move task'))
  }
}

function getColumnLabel(col: string): string {
  if (useUIColumns.value) return t(`kanban.uiColumns.${col}`, col)
  return t(`kanban.columns.${col}`, col)
}

function getColumnCount(col: string): number {
  return tasksByStatus.value[col]?.length ?? 0
}
</script>

<template>
  <div class="kanban-view">
    <header class="page-header">
      <h2 class="header-title">{{ t('kanban.title') }}</h2>
      <div class="header-actions">
        <NSelect
          v-model:value="selectedBoardValue"
          :options="boardOptions"
          :loading="kanbanStore.boardsLoading"
          size="small"
        />
        <NButton size="small" :loading="boardActionLoading" @click="showCreateBoardForm = true">
          {{ t('common.add') }}
        </NButton>
        <NButton
          size="small"
          secondary
          :disabled="kanbanStore.selectedBoard === DEFAULT_KANBAN_BOARD"
          :loading="boardActionLoading"
          @click="handleArchiveSelectedBoard"
        >
          {{ t('kanban.board.archive') }}
        </NButton>
        <NSelect
          v-model:value="filterStatusValue"
          :options="statusFilterOptions"
          size="small"
          @update:value="handleApplyFilter"
        />
        <NSelect
          v-model:value="filterAssigneeValue"
          :options="assigneeFilterOptions"
          size="small"
          @update:value="handleApplyFilter"
        />
        <NButton
          size="small"
          :type="turnFilter ? 'primary' : 'default'"
          :secondary="!turnFilter"
          @click="turnFilter = !turnFilter"
        >
          🫵 {{ t('kanban.uiColumns.waiting_me') }} ({{ waitingForMeCount }})
        </NButton>
        <NButton
          size="small"
          :type="agentFilter ? 'primary' : 'default'"
          :secondary="!agentFilter"
          @click="agentFilter = !agentFilter"
        >
          🤖 {{ t('kanban.uiColumns.agent_working') }}
        </NButton>
        <NButton
          size="small"
          :type="useUIColumns ? 'primary' : 'default'"
          :secondary="!useUIColumns"
          @click="useUIColumns = !useUIColumns"
        >
          {{ useUIColumns ? t('kanban.uiColumnsMode') : t('kanban.technicalMode') }}
        </NButton>
        <NButton
          size="small"
          :secondary="!compactMode"
          @click="compactMode = !compactMode"
        >
          {{ compactMode ? t('kanban.compactMode') : t('kanban.fullMode') }}
        </NButton>
        <NButton type="primary" size="small" @click="showCreateForm = true">
          <template #icon>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </template>
          {{ t('kanban.createTask') }}
        </NButton>
      </div>
    </header>

    <!-- Goal Card -->
    <KanbanGoalCard />

    <!-- Mini Stats -->
    <KanbanStatsMini />

    <!-- Stats bar -->
    <div v-if="kanbanStore.stats" class="stats-bar">
      <button
        v-for="status in boardStatuses"
        :key="status"
        type="button"
        class="stat-chip"
        :class="[status, { active: kanbanStore.filterStatus === status }]"
        :aria-pressed="kanbanStore.filterStatus === status"
        @click="handleStatusChipClick(status)"
      >
        <span class="stat-count">{{ kanbanStore.stats.by_status[status] || 0 }}</span>
        <span class="stat-label">{{ t(`kanban.columns.${status}`, status) }}</span>
      </button>
      <button
        type="button"
        class="stat-chip total"
        :class="{ active: !kanbanStore.filterStatus }"
        :aria-pressed="!kanbanStore.filterStatus"
        @click="handleStatusChipClick(null)"
      >
        <span class="stat-count">{{ kanbanStore.stats.total }}</span>
        <span class="stat-label">{{ t('kanban.stats.total') }}</span>
      </button>
    </div>

    <!-- Milestone filter chips -->
    <div v-if="activeMilestones.length > 0" class="milestone-chips">
      <button
        type="button"
        class="stat-chip"
        :class="{ active: !milestoneFilter }"
        @click="milestoneFilter = null"
      >
        <span class="stat-label">{{ t('kanban.filterAll') }}</span>
      </button>
      <button
        v-for="ms in activeMilestones"
        :key="ms.id"
        type="button"
        class="stat-chip"
        :class="{ active: milestoneFilter === ms.id }"
        @click="milestoneFilter = ms.id"
      >
        <span class="stat-label">🏁 {{ ms.name }}</span>
      </button>
    </div>

    <!-- Kanban Board — Horizontal Columns -->
    <DnDProvider>
      <NSpin :show="kanbanStore.loading && kanbanStore.tasks.length === 0">
        <div class="kanban-board">
          <div class="kanban-columns">
            <div
              v-for="col in visibleBoardStatuses"
              :key="col"
              class="kanban-column"
              :class="`column-${col}`"
            >
              <div class="column-header" :class="`status-${col}`">
                <span class="status-dot" aria-hidden="true" />
                <span class="column-title">{{ getColumnLabel(col) }}</span>
                <span class="column-count">{{ getColumnCount(col) }}</span>
              </div>
              <KanbanColumnDropZone
                :column-key="col"
                :tasks="tasksByStatus[col]"
                :compact-mode="compactMode"
                :profile-avatar-by-name="profileAvatarByName"
                :max-height="columnMaxHeight"
                @task-click="handleTaskClick"
                @task-dropped="handleColumnDrop"
              />
            </div>
          </div>
        </div>
      </NSpin>
    </DnDProvider>

    <!-- Task detail drawer -->
    <KanbanTaskDrawer
      :task-id="selectedTaskId"
      @close="handleDrawerClose"
      @updated="handleDrawerUpdated"
    />

    <!-- Board management -->
    <NModal v-model:show="showCreateBoardForm" preset="dialog" :title="t('kanban.board.create')" style="width: 420px;">
      <div class="board-form">
        <NInput v-model:value="newBoardSlug" :placeholder="t('kanban.board.slugPlaceholder')" />
        <NInput v-model:value="newBoardName" :placeholder="t('kanban.board.namePlaceholder')" />
      </div>
      <template #action>
        <NButton @click="showCreateBoardForm = false">{{ t('common.cancel') }}</NButton>
        <NButton type="primary" :loading="boardActionLoading" @click="handleCreateBoard">{{ t('common.create') }}</NButton>
      </template>
    </NModal>

    <!-- Create form -->
    <KanbanCreateForm
      v-if="showCreateForm"
      @close="showCreateForm = false"
      @created="handleTaskCreated"
    />
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.kanban-view {
  height: calc(100 * var(--vh));
  display: flex;
  flex-direction: column;
}

.page-header {
  padding: 16px 20px;
  border-bottom: 1px solid $border-color;
}

.header-title {
  font-size: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  :deep(.n-select) {
    min-width: 120px;
    max-width: 260px;
    flex: 0 1 auto;
  }
}

.stats-bar {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.stat-chip,
.column-header {
  --kanban-status-color: #64748b;

  &.triage,
  &.status-triage { --kanban-status-color: #94a3b8; }
  &.todo,
  &.status-todo { --kanban-status-color: #38bdf8; }
  &.ready,
  &.status-ready { --kanban-status-color: #f59e0b; }
  &.running,
  &.status-running { --kanban-status-color: #8b5cf6; }
  &.blocked,
  &.status-blocked { --kanban-status-color: #ef4444; }
  &.done,
  &.status-done { --kanban-status-color: #22c55e; }
  &.archived,
  &.status-archived { --kanban-status-color: #64748b; }
  &.total { --kanban-status-color: #e2e8f0; }

  // UI columns color mapping
  &.inbox,
  &.column-inbox { --kanban-status-color: #94a3b8; }
  &.agent_working,
  &.column-agent_working { --kanban-status-color: #8b5cf6; }
  &.waiting_me,
  &.column-waiting_me { --kanban-status-color: #f59e0b; }
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  border: 1px solid $border-light;
  border-left: 3px solid var(--kanban-status-color);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  line-height: inherit;

  &:hover,
  &.active {
    border-color: var(--kanban-status-color);
    background-color: rgba(var(--accent-primary-rgb), 0.08);
  }

  &.active .stat-label,
  &.active .stat-count {
    color: var(--kanban-status-color);
  }

  &:focus-visible {
    outline: 2px solid var(--kanban-status-color);
    outline-offset: 2px;
  }
}

.stat-count {
  font-weight: 600;
  color: $text-primary;
}

.stat-label {
  color: $text-muted;
}

/* ─── Kanban Board — Horizontal Columns ─── */

.kanban-board {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 0;
}

.kanban-columns {
  display: flex;
  gap: 12px;
  padding: 14px 20px 20px;
  overflow-x: auto;
  overflow-y: hidden;
  min-height: 0;
  flex: 1;
  align-items: flex-start;

  /* Smooth scroll */
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;

  /* Hide scrollbar on non-hover for cleaner look */
  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: $border-color;
    border-radius: 3px;
  }
}

.kanban-column {
  min-width: 260px;
  max-width: 300px;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  background: rgba($bg-card, 0.5);
  border: 1px solid $border-light;
  border-radius: $radius-md;
  overflow: hidden;

  /* Column top border color */
  border-top: 3px solid var(--kanban-status-color, $border-color);

  &.column-triage { --kanban-status-color: #94a3b8; }
  &.column-todo { --kanban-status-color: #38bdf8; }
  &.column-ready { --kanban-status-color: #f59e0b; }
  &.column-running { --kanban-status-color: #8b5cf6; }
  &.column-blocked { --kanban-status-color: #ef4444; }
  &.column-done { --kanban-status-color: #22c55e; }
  &.column-archived { --kanban-status-color: #64748b; }
  &.column-inbox { --kanban-status-color: #94a3b8; }
  &.column-agent_working { --kanban-status-color: #8b5cf6; }
  &.column-waiting_me { --kanban-status-color: #f59e0b; }
}

.column-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  font-weight: 600;
  color: var(--kanban-status-color);
  border-bottom: 1px solid $border-light;
  background: rgba(var(--accent-primary-rgb), 0.02);
  flex-shrink: 0;
}

.column-title {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.column-count {
  font-size: 11px;
  font-weight: 700;
  color: $text-muted;
  background: rgba(var(--accent-primary-rgb), 0.08);
  padding: 1px 7px;
  border-radius: 10px;
  margin-left: auto;
  flex-shrink: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--kanban-status-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--kanban-status-color) 18%, transparent);
  flex-shrink: 0;
}

.column-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  font-size: 12px;
  color: $text-muted;
  padding: 12px;
}

.board-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.milestone-chips {
  display: flex;
  gap: 6px;
  padding: 4px 20px;
  flex-wrap: wrap;
}

/* ─── Responsive ─── */

@media (max-width: 1200px) {
  .kanban-column {
    min-width: 230px;
    max-width: 260px;
  }
}

@media (max-width: 900px) {
  .page-header {
    padding: 12px 14px;
  }

  .header-actions {
    gap: 6px;

    :deep(.n-select) {
      max-width: 180px;
    }
  }

  .kanban-columns {
    padding: 10px 12px 14px;
    gap: 10px;
  }

  .kanban-column {
    min-width: 220px;
    max-width: 240px;
  }

  .stats-bar {
    padding: 8px 14px;
  }
}

@media (max-width: $breakpoint-mobile) {
  .page-header {
    padding: 12px;
    position: sticky;
    top: 0;
    z-index: 20;
    flex-direction: column;
    align-items: flex-start;
    background: $bg-primary;
    gap: 8px;
  }

  .header-actions {
    flex-wrap: wrap;
    width: 100%;
    gap: 6px;

    :deep(.n-select) {
      max-width: 100%;
      flex: 1 1 140px;
    }
  }

  .kanban-columns {
    padding: 8px 10px 12px;
    gap: 8px;
  }

  .kanban-column {
    min-width: 200px;
    max-width: 220px;
  }

  .stats-bar {
    padding: 6px 10px;
    gap: 4px;
  }

  .milestone-chips {
    padding: 4px 10px;
    gap: 4px;
  }
}
</style>
