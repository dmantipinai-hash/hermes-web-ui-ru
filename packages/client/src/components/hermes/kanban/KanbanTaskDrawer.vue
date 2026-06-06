<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NDrawer, NDrawerContent, NButton, NButtonGroup, NSelect, NInput, NSpin, NModal, NTabs, NTabPane, NEmpty, NCheckbox, NDatePicker, NTag, NProgress, useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { request } from '@/api/client'
import { getTask, type ChecklistItem } from '@/api/hermes/kanban'
import { useKanbanStore } from '@/stores/hermes/kanban'
import { withDefaultAssignee } from '@/utils/hermes/kanban-assignees'
import KanbanMilestoneSelect from '@/components/hermes/kanban/KanbanMilestoneSelect.vue'
import HistoryMessageList from '@/components/hermes/chat/HistoryMessageList.vue'
import type { Session, Message } from '@/stores/hermes/chat'
import type { KanbanTaskDetail } from '@/api/hermes/kanban'

const props = defineProps<{
  taskId: string | null
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const { t } = useI18n()
const router = useRouter()
const message = useMessage()
const kanbanStore = useKanbanStore()

const detail = ref<KanbanTaskDetail | null>(null)
const loading = ref(false)
const activeTab = ref('discussion')
const assignProfile = ref<string | null>(null)
const blockReason = ref('')
const showBlockInput = ref(false)
const completeSummary = ref('')
const showMessagesModal = ref(false)
const newComment = ref('')
const commentSending = ref(false)

// ─── Labels, Due Date, Checklist ───────────────────────────
const newLabel = ref('')
const newChecklistItem = ref('')

const taskMeta = computed(() => {
  if (!props.taskId || !kanbanStore.meta) return null
  return kanbanStore.meta.taskMeta?.[props.taskId] ?? null
})

const taskLabels = computed(() => taskMeta.value?.labels || [])
const taskChecklist = computed(() => taskMeta.value?.checklist || [])
const taskDueDate = computed(() => taskMeta.value?.due_date || null)
const checklistProgress = computed(() => {
  const cl = taskChecklist.value
  if (cl.length === 0) return null
  return { done: cl.filter(i => i.done).length, total: cl.length }
})

async function addLabel() {
  if (!props.taskId || !newLabel.value.trim()) return
  const labels = [...taskLabels.value, newLabel.value.trim()]
  newLabel.value = ''
  try {
    await kanbanStore.updateTaskMeta(props.taskId, { labels })
  } catch (err: any) {
    message.error(err.message)
  }
}

async function removeLabel(label: string) {
  if (!props.taskId) return
  const labels = taskLabels.value.filter(l => l !== label)
  try {
    await kanbanStore.updateTaskMeta(props.taskId, { labels })
  } catch (err: any) {
    message.error(err.message)
  }
}

async function updateDueDate(ts: number | null) {
  if (!props.taskId) return
  const due_date = ts ? new Date(ts).toISOString().split('T')[0] : undefined
  try {
    await kanbanStore.updateTaskMeta(props.taskId, { due_date })
  } catch (err: any) {
    message.error(err.message)
  }
}

async function addChecklistItem() {
  if (!props.taskId || !newChecklistItem.value.trim()) return
  const checklist: ChecklistItem[] = [
    ...taskChecklist.value,
    { id: `cl_${Date.now().toString(36)}`, text: newChecklistItem.value.trim(), done: false },
  ]
  newChecklistItem.value = ''
  try {
    await kanbanStore.updateTaskMeta(props.taskId, { checklist })
  } catch (err: any) {
    message.error(err.message)
  }
}

async function toggleChecklistItem(itemId: string) {
  if (!props.taskId) return
  const checklist = taskChecklist.value.map(item =>
    item.id === itemId ? { ...item, done: !item.done } : item
  )
  try {
    await kanbanStore.updateTaskMeta(props.taskId, { checklist })
  } catch (err: any) {
    message.error(err.message)
  }
}

async function removeChecklistItem(itemId: string) {
  if (!props.taskId) return
  const checklist = taskChecklist.value.filter(item => item.id !== itemId)
  try {
    await kanbanStore.updateTaskMeta(props.taskId, { checklist })
  } catch (err: any) {
    message.error(err.message)
  }
}

// Session search
const sessionResults = ref<any[]>([])
const sessionLoading = ref(false)
const showSessions = ref(false)

const completionSummary = computed(() => {
  if (!detail.value) return ''
  return detail.value.task.result || detail.value.latest_summary || ''
})

const localizedTaskStatus = computed(() => {
  if (!detail.value) return ''
  return t(`kanban.columns.${detail.value.task.status}`, detail.value.task.status)
})

const canMutateTask = computed(() => {
  const status = detail.value?.task.status
  return status !== 'done' && status !== 'archived'
})

const latestRunProfile = computed(() => {
  if (!detail.value) return null
  return [...detail.value.runs].reverse().find(run => run.profile)?.profile || null
})

const currentTurn = computed(() => {
  if (!props.taskId || !kanbanStore.meta) return null
  return kanbanStore.meta.taskMeta?.[props.taskId]?.turn ?? null
})

const turnIcon = computed(() => {
  if (!currentTurn.value) return '—'
  if (currentTurn.value === 'agent') return '🟢'
  if (currentTurn.value === 'user') return '🟡'
  return '✅'
})

const taskStatus = computed(() => detail.value?.task.status)

const assigneeOptions = computed(() => {
  const base = withDefaultAssignee(kanbanStore.assignees, kanbanStore.stats?.by_assignee || {})
    .map(a => ({ label: a.name, value: a.name }))
  return [
    { label: 'Я / пользователь', value: 'user' },
    ...base,
  ]
})

async function searchTaskSessions() {
  if (!detail.value) return
  const profile = latestRunProfile.value
  if (!profile) return
  showSessions.value = !showSessions.value
  if (!showSessions.value) return
  sessionLoading.value = true
  try {
    const res = await request<{ results: any[] }>(
      `/api/hermes/kanban/search-sessions?task_id=${encodeURIComponent(detail.value.task.id)}&profile=${encodeURIComponent(profile)}&board=${encodeURIComponent(kanbanStore.selectedBoard)}`
    )
    sessionResults.value = res.results
  } catch {
    sessionResults.value = []
  } finally {
    sessionLoading.value = false
  }
}

function openResultDetail() {
  if (detail.value?.session) {
    showMessagesModal.value = true
  }
}

const historySession = computed<Session | null>(() => {
  const s = detail.value?.session
  if (!s) return null
  return {
    id: s.id,
    title: s.title || '',
    source: s.source,
    messages: s.messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        id: String(m.id),
        role: m.role as Message['role'],
        content: m.content,
        timestamp: m.timestamp,
      })),
    createdAt: s.started_at,
    updatedAt: s.ended_at || s.started_at,
    model: s.model,
    messageCount: s.messages.length,
    endedAt: s.ended_at,
  }
})

watch(() => [props.taskId, kanbanStore.selectedBoard] as const, async ([id, board]) => {
  if (!id) {
    detail.value = null
    return
  }
  loading.value = true
  activeTab.value = 'discussion'
  try {
    const nextDetail = await getTask(id, { board })
    if (props.taskId === id && kanbanStore.selectedBoard === board) {
      detail.value = nextDetail
    }
  } catch (err: any) {
    if (props.taskId === id && kanbanStore.selectedBoard === board) {
      message.error(t('kanban.message.loadFailed'))
    }
  } finally {
    if (props.taskId === id && kanbanStore.selectedBoard === board) {
      loading.value = false
    }
  }
}, { immediate: true })

function formatTime(ts: number | null) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString()
}

function formatTimeShort(ts: number | null) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ─── Actions ────────────────────────────────────────────────

async function handleSendToAgent() {
  if (!props.taskId) return
  try {
    await kanbanStore.bulkUpdateTasks({ ids: [props.taskId], status: 'ready' })
    await kanbanStore.updateTaskMeta(props.taskId, { turn: 'agent', ui_status: 'ready' })
    await kanbanStore.addComment(props.taskId, t('kanban.drawer.sentToAgent'))
    message.success(t('kanban.turn.agent'))
    if (detail.value) {
      detail.value = await getTask(props.taskId, { board: kanbanStore.selectedBoard })
    }
    emit('updated')
  } catch (err: any) {
    message.error(err.message)
  }
}

async function handleReturnToWork() {
  if (!props.taskId) return
  try {
    await kanbanStore.unblockTasks([props.taskId])
    await kanbanStore.handoffTask(props.taskId, 'agent')
    message.success(t('kanban.drawer.returnedToWork'))
    if (detail.value) {
      detail.value = await getTask(props.taskId, { board: kanbanStore.selectedBoard })
    }
    emit('updated')
  } catch (err: any) {
    message.error(err.message)
  }
}

async function handleAccept() {
  if (!props.taskId) return
  try {
    await kanbanStore.completeTasks([props.taskId], completeSummary.value.trim() || undefined)
    await kanbanStore.setTaskTurn(props.taskId, 'done')
    message.success(t('kanban.drawer.accepted'))
    emit('updated')
    emit('close')
  } catch (err: any) {
    message.error(err.message)
  }
}

async function handleNeedsRevision() {
  if (!props.taskId) return
  try {
    await kanbanStore.handoffTask(props.taskId, 'agent', t('kanban.drawer.needsRevisionComment'))
    message.success(t('kanban.drawer.sentForRevision'))
    if (detail.value) {
      detail.value = await getTask(props.taskId, { board: kanbanStore.selectedBoard })
    }
    emit('updated')
  } catch (err: any) {
    message.error(err.message)
  }
}

async function handleBlock() {
  if (!props.taskId) return
  if (!showBlockInput.value) {
    showBlockInput.value = true
    return
  }
  if (!blockReason.value.trim()) return
  try {
    await kanbanStore.blockTask(props.taskId, blockReason.value.trim())
    message.success(t('kanban.message.taskBlocked'))
    showBlockInput.value = false
    blockReason.value = ''
    if (detail.value) {
      detail.value = await getTask(props.taskId, { board: kanbanStore.selectedBoard })
    }
    emit('updated')
  } catch (err: any) {
    message.error(err.message)
  }
}

async function handleUnblock() {
  if (!props.taskId) return
  try {
    await kanbanStore.unblockTasks([props.taskId])
    message.success(t('kanban.message.taskUnblocked'))
    if (detail.value) {
      detail.value = await getTask(props.taskId, { board: kanbanStore.selectedBoard })
    }
    emit('updated')
  } catch (err: any) {
    message.error(err.message)
  }
}

async function handleAssign() {
  if (!props.taskId || !assignProfile.value) return
  try {
    await kanbanStore.assignTask(props.taskId, assignProfile.value)
    message.success(t('kanban.message.taskAssigned'))
    assignProfile.value = null
    if (detail.value) {
      detail.value = await getTask(props.taskId, { board: kanbanStore.selectedBoard })
    }
    emit('updated')
  } catch (err: any) {
    message.error(err.message)
  }
}

// ─── Comments ───────────────────────────────────────────────

async function handleSendComment() {
  if (!props.taskId || !newComment.value.trim() || commentSending.value) return
  commentSending.value = true
  try {
    await kanbanStore.addComment(props.taskId, newComment.value.trim())
    newComment.value = ''
    if (detail.value) {
      detail.value = await getTask(props.taskId, { board: kanbanStore.selectedBoard })
    }
    emit('updated')
  } catch (err: any) {
    message.error(err.message)
  } finally {
    commentSending.value = false
  }
}

// ─── Handoff (legacy, still used by turn buttons) ──────────

const handoffComment = ref('')
const showHandoffInput = ref(false)
const handoffTarget = ref<'user' | 'agent'>('agent')

async function handleHandoff(turn: 'user' | 'agent') {
  if (!props.taskId) return
  try {
    await kanbanStore.handoffTask(props.taskId, turn, handoffComment.value.trim() || undefined)
    message.success(turn === 'agent' ? t('kanban.turn.agent') : t('kanban.turn.user'))
    handoffComment.value = ''
    showHandoffInput.value = false
    if (detail.value) {
      detail.value = await getTask(props.taskId, { board: kanbanStore.selectedBoard })
    }
    emit('updated')
  } catch (err: any) {
    message.error(err.message)
  }
}
</script>

<template>
  <NDrawer :show="!!taskId" :width="480" placement="right" @update:show="(v: boolean) => { if (!v) emit('close') }">
    <NDrawerContent :title="detail?.task.title || ''" closable>
      <NSpin :show="loading">
        <template v-if="detail">
          <!-- Turn indicator bar -->
          <div class="turn-bar" :class="`turn-${currentTurn || 'none'}`">
            <span class="turn-icon">{{ turnIcon }}</span>
            <span class="turn-text">
              <template v-if="currentTurn === 'agent'">{{ t('kanban.drawer.agentWorking') }}</template>
              <template v-else-if="currentTurn === 'user'">{{ t('kanban.drawer.waitingForYou') }}</template>
              <template v-else-if="currentTurn === 'done'">{{ t('kanban.turn.done') }}</template>
              <template v-else>{{ t('kanban.drawer.noTurn') }}</template>
            </span>
            <span class="turn-status-badge">{{ localizedTaskStatus }}</span>
          </div>

          <!-- Tabs -->
          <NTabs v-model:value="activeTab" type="line" animated>
            <!-- Tab 1: Discussion -->
            <NTabPane name="discussion" :tab="t('kanban.drawer.discussion')">
              <div class="discussion-container">
                <!-- Quick actions -->
                <div v-if="canMutateTask" class="quick-actions">
                  <NButtonGroup size="small">
                    <NButton v-if="taskStatus !== 'running' && taskStatus !== 'done'" secondary @click="handleSendToAgent">
                      🤖 {{ t('kanban.drawer.sendToAgent') }}
                    </NButton>
                    <NButton v-if="taskStatus === 'blocked'" secondary @click="handleReturnToWork">
                      🔄 {{ t('kanban.drawer.returnToWork') }}
                    </NButton>
                    <NButton v-if="taskStatus === 'done'" type="success" secondary @click="handleAccept">
                      ✅ {{ t('kanban.drawer.accept') }}
                    </NButton>
                    <NButton v-if="taskStatus === 'done'" secondary @click="handleNeedsRevision">
                      ✏️ {{ t('kanban.drawer.needsRevision') }}
                    </NButton>
                  </NButtonGroup>
                  <NButtonGroup size="small">
                    <NButton v-if="taskStatus !== 'blocked' && taskStatus !== 'done'" secondary @click="handleBlock">
                      🔒 {{ t('kanban.drawer.block') }}
                    </NButton>
                    <NButton v-if="taskStatus === 'blocked'" secondary @click="handleUnblock">
                      🔓 {{ t('kanban.drawer.unblock') }}
                    </NButton>
                  </NButtonGroup>
                </div>

                <!-- Block reason input -->
                <div v-if="showBlockInput" class="inline-input">
                  <NInput v-model:value="blockReason" size="small" :placeholder="t('kanban.action.blockReason')" />
                  <NButton size="small" type="primary" @click="handleBlock">{{ t('common.ok') }}</NButton>
                  <NButton size="small" @click="showBlockInput = false; blockReason = ''">{{ t('common.cancel') }}</NButton>
                </div>

                <!-- Comments list -->
                <div class="comments-list">
                  <div v-if="detail.comments.length === 0" class="comments-empty">
                    <NEmpty :description="t('kanban.drawer.noComments')" size="small" />
                  </div>
                  <div v-for="comment in detail.comments" :key="comment.id" class="comment-bubble" :class="comment.author === 'Дима' || comment.author === 'User' ? 'is-user' : 'is-agent'">
                    <div class="comment-meta">
                      <span class="comment-author">{{ comment.author }}</span>
                      <span class="comment-time">{{ formatTimeShort(comment.created_at) }}</span>
                    </div>
                    <div class="comment-text">{{ comment.body }}</div>
                  </div>
                </div>

                <!-- Comment input -->
                <div v-if="canMutateTask" class="comment-input-bar">
                  <NInput
                    v-model:value="newComment"
                    size="small"
                    :placeholder="t('kanban.drawer.placeholder')"
                    :disabled="commentSending"
                    @keyup.enter="handleSendComment"
                  />
                  <NButton size="small" type="primary" :disabled="!newComment.trim() || commentSending" :loading="commentSending" @click="handleSendComment">
                    {{ t('kanban.drawer.send') }}
                  </NButton>
                </div>
              </div>
            </NTabPane>

            <!-- Tab 2: Context -->
            <NTabPane name="context" :tab="t('kanban.drawer.context')">
              <div class="context-container">
                <!-- Metadata -->
                <div class="detail-section">
                  <div class="section-title">{{ t('kanban.detail.status') }}</div>
                  <div class="detail-row">
                    <span class="detail-label">{{ t('kanban.detail.status') }}</span>
                    <span class="detail-value status-badge" :class="detail.task.status">{{ localizedTaskStatus }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">{{ t('kanban.detail.assignee') }}</span>
                    <span class="detail-value">{{ detail.task.assignee || '—' }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">{{ t('kanban.detail.priority') }}</span>
                    <span class="detail-value">{{ detail.task.priority }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">{{ t('kanban.detail.tenant') }}</span>
                    <span class="detail-value">{{ detail.task.tenant || '—' }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">{{ t('kanban.milestones') }}</span>
                    <span class="detail-value">
                      <KanbanMilestoneSelect
                        :task-id="detail.task.id"
                        :current-milestone-id="kanbanStore.meta?.taskMeta?.[detail.task.id]?.milestoneId"
                      />
                    </span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">{{ t('kanban.detail.turn') }}</span>
                    <span v-if="currentTurn" class="detail-value turn-badge" :class="`turn-${currentTurn}`">{{ t(`kanban.turn.${currentTurn}`) }}</span>
                    <span v-else class="detail-value">—</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">{{ t('kanban.detail.createdAt') }}</span>
                    <span class="detail-value">{{ formatTime(detail.task.created_at) }}</span>
                  </div>
                  <div v-if="detail.task.started_at" class="detail-row">
                    <span class="detail-label">{{ t('kanban.detail.startedAt') }}</span>
                    <span class="detail-value">{{ formatTime(detail.task.started_at) }}</span>
                  </div>
                  <div v-if="detail.task.completed_at" class="detail-row">
                    <span class="detail-label">{{ t('kanban.detail.completedAt') }}</span>
                    <span class="detail-value">{{ formatTime(detail.task.completed_at) }}</span>
                  </div>
                </div>

                <!-- Body / Description -->
                <div v-if="detail.task.body" class="detail-section">
                  <div class="section-title">{{ t('kanban.form.body') }}</div>
                  <div class="detail-body">{{ detail.task.body }}</div>
                </div>

                <!-- Result / Summary -->
                <div v-if="completionSummary" class="detail-section">
                  <div class="section-title">{{ t('kanban.detail.result') }}</div>
                  <div class="result-summary" @click="openResultDetail">{{ completionSummary }}</div>
                </div>

                <!-- Labels -->
                <div class="detail-section">
                  <div class="section-title">{{ t('kanban.drawer.labels') }}</div>
                  <div class="labels-container">
                    <NTag
                      v-for="label in taskLabels"
                      :key="label"
                      size="small"
                      closable
                      @close="removeLabel(label)"
                    >
                      {{ label }}
                    </NTag>
                    <div class="label-input">
                      <NInput
                        v-model:value="newLabel"
                        size="small"
                        :placeholder="t('kanban.drawer.addLabel')"
                        @keyup.enter="addLabel"
                      />
                      <NButton size="small" :disabled="!newLabel.trim()" @click="addLabel">+</NButton>
                    </div>
                  </div>
                </div>

                <!-- Due date -->
                <div class="detail-section">
                  <div class="section-title">{{ t('kanban.drawer.dueDate') }}</div>
                  <div class="due-date-row">
                    <NDatePicker
                      :value="taskDueDate ? new Date(taskDueDate).getTime() : null"
                      type="date"
                      size="small"
                      clearable
                      :placeholder="t('kanban.drawer.setDueDate')"
                      @update:value="updateDueDate"
                    />
                    <span v-if="taskDueDate" class="due-date-text">{{ taskDueDate }}</span>
                  </div>
                </div>

                <!-- Checklist -->
                <div class="detail-section">
                  <div class="section-title">
                    {{ t('kanban.drawer.checklist') }}
                    <span v-if="checklistProgress" class="checklist-progress">({{ checklistProgress.done }}/{{ checklistProgress.total }})</span>
                  </div>
                  <div v-if="checklistProgress" class="checklist-bar">
                    <NProgress
                      type="line"
                      :percentage="Math.round(checklistProgress.done / checklistProgress.total * 100)"
                      :show-indicator="false"
                      :height="4"
                      rail-color="rgba(var(--text-muted-rgb), 0.1)"
                    />
                  </div>
                  <div v-for="item in taskChecklist" :key="item.id" class="checklist-item">
                    <NCheckbox :checked="item.done" @update:checked="toggleChecklistItem(item.id)">
                      <span :class="{ 'checklist-done': item.done }">{{ item.text }}</span>
                    </NCheckbox>
                    <NButton size="tiny" quaternary @click="removeChecklistItem(item.id)">\u2715</NButton>
                  </div>
                  <div class="checklist-input">
                    <NInput
                      v-model:value="newChecklistItem"
                      size="small"
                      :placeholder="t('kanban.drawer.addChecklist')"
                      @keyup.enter="addChecklistItem"
                    />
                    <NButton size="small" :disabled="!newChecklistItem.trim()" @click="addChecklistItem">+</NButton>
                  </div>
                </div>

                <!-- Assign section -->
                <div v-if="canMutateTask && detail.task.status !== 'running'" class="detail-section">
                  <div class="section-title">{{ t('kanban.action.assignTo') }}</div>
                  <div class="assign-group">
                    <NSelect v-model:value="assignProfile" :options="assigneeOptions" size="small" :placeholder="t('kanban.action.assignTo')" style="flex: 1;" />
                    <NButton size="small" :disabled="!assignProfile" @click="handleAssign">{{ t('kanban.action.assign') }}</NButton>
                  </div>
                </div>

                <!-- Turn / Handoff -->
                <div v-if="canMutateTask" class="detail-section">
                  <div class="section-title">{{ t('kanban.detail.turn') }}</div>
                  <div class="turn-group">
                    <div class="turn-actions">
                      <NButton v-if="currentTurn !== 'agent'" size="small" secondary @click="showHandoffInput = true; handoffTarget = 'agent'">
                        🤖 → {{ t('kanban.turn.agent') }}
                      </NButton>
                      <NButton v-if="currentTurn !== 'user'" size="small" secondary @click="showHandoffInput = true; handoffTarget = 'user'">
                        🫵 → {{ t('kanban.turn.user') }}
                      </NButton>
                    </div>
                    <div v-if="showHandoffInput" class="handoff-input">
                      <NInput v-model:value="handoffComment" size="small" :placeholder="t('kanban.action.handoffComment')" />
                      <NButton size="small" type="primary" @click="handleHandoff(handoffTarget)">{{ t('common.ok') }}</NButton>
                      <NButton size="small" @click="showHandoffInput = false; handoffComment = ''">{{ t('common.cancel') }}</NButton>
                    </div>
                  </div>
                </div>
              </div>
            </NTabPane>

            <!-- Tab 3: History -->
            <NTabPane name="history" :tab="t('kanban.drawer.history')">
              <div class="history-container">
                <!-- Related Sessions -->
                <div v-if="detail.runs.length > 0" class="detail-section">
                  <div class="section-title clickable" @click="searchTaskSessions">
                    {{ t('kanban.detail.sessions') }}
                    <NSpin v-if="sessionLoading" :size="12" style="margin-left: 6px;" />
                  </div>
                  <div v-if="showSessions && sessionResults.length > 0" class="session-list">
                    <div v-for="session in sessionResults" :key="session.id" class="session-item" @click="router.push({ name: 'hermes.chat', query: { session: session.id } })">
                      <div class="session-title">{{ session.title || session.id }}</div>
                      <div class="session-meta">
                        <span>{{ session.source }}</span>
                        <span>{{ session.model }}</span>
                        <span>{{ formatTime(session.started_at) }}</span>
                      </div>
                    </div>
                  </div>
                  <div v-if="showSessions && !sessionLoading && sessionResults.length === 0" class="column-empty">{{ t('kanban.detail.noSessions') }}</div>
                </div>

                <!-- Runs -->
                <div v-if="detail.runs.length > 0" class="detail-section">
                  <div class="section-title">{{ t('kanban.detail.runs') }}</div>
                  <div v-for="run in detail.runs" :key="run.id" class="run-item">
                    <div class="run-header">
                      <span class="run-status" :class="run.status">{{ run.status }}</span>
                      <span class="run-profile">{{ run.profile || '—' }}</span>
                      <span class="run-time">{{ formatTime(run.started_at) }}</span>
                    </div>
                    <div v-if="run.summary" class="run-summary">{{ run.summary }}</div>
                    <div v-if="run.error" class="run-error">{{ run.error }}</div>
                  </div>
                </div>

                <!-- Events -->
                <div v-if="detail.events.length > 0" class="detail-section">
                  <div class="section-title">{{ t('kanban.detail.events') }}</div>
                  <div v-for="event in detail.events.slice(-20)" :key="event.id" class="event-item">
                    <span class="event-kind">{{ event.kind }}</span>
                    <span class="event-time">{{ formatTime(event.created_at) }}</span>
                  </div>
                </div>
              </div>
            </NTabPane>
          </NTabs>
        </template>
      </NSpin>
    </NDrawerContent>
  </NDrawer>

  <!-- Session messages modal (click result summary) -->
  <NModal v-if="historySession" :show="showMessagesModal" preset="card" :title="detail?.task.title || ''" :style="{ width: '900px', maxWidth: 'calc(100vw - 48px)' }" @close="showMessagesModal = false">
    <div class="messages-modal-body">
      <HistoryMessageList :session="historySession" />
    </div>
  </NModal>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

// ─── Turn bar ────────────────────────────────────────────

.turn-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: $radius-sm;
  margin-bottom: 16px;
  font-size: 13px;
  font-weight: 500;

  &.turn-agent {
    background: rgba(var(--accent-info-rgb), 0.1);
    color: var(--accent-info);
  }

  &.turn-user {
    background: rgba(var(--warning-rgb), 0.1);
    color: $warning;
  }

  &.turn-done {
    background: rgba(var(--success-rgb), 0.1);
    color: $success;
  }

  &.turn-none {
    background: rgba(var(--text-muted-rgb), 0.06);
    color: $text-muted;
  }
}

.turn-icon {
  font-size: 14px;
}

.turn-text {
  flex: 1;
}

.turn-status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(var(--text-muted-rgb), 0.08);
  color: $text-secondary;
}

// ─── Discussion tab ──────────────────────────────────────

.discussion-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
}

.quick-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.inline-input {
  display: flex;
  gap: 6px;
  align-items: center;
}

.comments-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: calc(100vh - 360px);
  overflow-y: auto;
  padding-right: 4px;
}

.comments-empty {
  padding: 24px 0;
}

.comment-bubble {
  max-width: 85%;
  padding: 8px 12px;
  border-radius: $radius-md;
  font-size: 13px;
  line-height: 1.5;

  &.is-user {
    align-self: flex-end;
    background: rgba(var(--accent-primary-rgb), 0.08);
    border: 1px solid $border-light;
    border-bottom-right-radius: 2px;
  }

  &.is-agent {
    align-self: flex-start;
    background: $bg-card;
    border: 1px solid $border-light;
    border-bottom-left-radius: 2px;
  }
}

.comment-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.comment-author {
  font-size: 12px;
  font-weight: 600;
  color: $text-primary;
}

.comment-time {
  font-size: 11px;
  color: $text-muted;
}

.comment-text {
  color: $text-secondary;
  word-break: break-word;
  white-space: pre-wrap;
}

.comment-input-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid $border-light;
}

// ─── Context tab ─────────────────────────────────────────

.context-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

// ─── Labels ──────────────────────────────────────────────

.labels-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.label-input {
  display: flex;
  gap: 4px;
  width: 180px;
}

// ─── Due date ────────────────────────────────────────────

.due-date-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.due-date-text {
  font-size: 12px;
  color: $text-muted;
}

// ─── Checklist ───────────────────────────────────────────

.checklist-progress {
  font-weight: 400;
  color: $text-muted;
  margin-left: 4px;
}

.checklist-bar {
  margin-bottom: 8px;
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
}

.checklist-done {
  text-decoration: line-through;
  color: $text-muted;
}

.checklist-input {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}

// ─── History tab ─────────────────────────────────────────

.history-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

// ─── Shared sections ─────────────────────────────────────

.detail-section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;

  &.clickable {
    cursor: pointer;
    &:hover { color: $text-secondary; }
  }
}

.result-summary {
  cursor: pointer;
  border-radius: $radius-sm;
  padding: 8px 10px;
  background: rgba(var(--accent-primary-rgb), 0.04);
  border: 1px solid $border-light;
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.5;
  transition: border-color $transition-fast;

  &:hover { border-color: rgba(var(--accent-primary-rgb), 0.3); }
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  border-bottom: 1px solid $border-light;
}

.detail-label {
  font-size: 12px;
  color: $text-muted;
}

.detail-value {
  font-size: 12px;
  color: $text-primary;
}

.detail-body {
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.status-badge {
  padding: 1px 8px;
  border-radius: 4px;
  font-weight: 500;

  &.triage { background: rgba(148, 163, 184, 0.14); color: #94a3b8; }
  &.todo { background: rgba(56, 189, 248, 0.14); color: #38bdf8; }
  &.ready { background: rgba(var(--warning-rgb), 0.12); color: $warning; }
  &.running { background: rgba(var(--accent-primary-rgb), 0.12); color: $accent-primary; }
  &.blocked { background: rgba(var(--error-rgb), 0.12); color: $error; }
  &.done { background: rgba(var(--success-rgb), 0.12); color: $success; }
  &.archived { background: rgba(100, 116, 139, 0.14); color: #94a3b8; }
}

.turn-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;

  &.turn-user { background: rgba(var(--warning-rgb), 0.12); color: $warning; }
  &.turn-agent { background: rgba(var(--accent-info-rgb), 0.12); color: var(--accent-info); }
  &.turn-done { background: rgba(var(--success-rgb), 0.12); color: $success; }
}

.assign-group {
  display: flex;
  gap: 8px;
}

.turn-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.turn-actions {
  display: flex;
  gap: 6px;
}

.handoff-input {
  display: flex;
  gap: 6px;
  align-items: center;
}

// ─── Runs ────────────────────────────────────────────────

.run-item {
  padding: 8px 0;
  border-bottom: 1px solid $border-light;

  &:last-child { border-bottom: none; }
}

.run-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.run-status {
  font-size: 11px;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: 4px;

  &.running { background: rgba(var(--accent-primary-rgb), 0.12); color: $accent-primary; }
  &.done, &.completed { background: rgba(var(--success-rgb), 0.12); color: $success; }
  &.crashed, &.failed { background: rgba(var(--error-rgb), 0.12); color: $error; }
}

.run-profile {
  font-size: 12px;
  font-weight: 500;
  color: $text-primary;
}

.run-time {
  font-size: 11px;
  color: $text-muted;
  margin-left: auto;
}

.run-summary, .run-error {
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.4;
}

.run-error { color: $error; }

// ─── Events ──────────────────────────────────────────────

.event-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.event-kind {
  font-size: 11px;
  font-family: $font-code;
  color: $accent-primary;
}

.event-time {
  font-size: 11px;
  color: $text-muted;
  margin-left: auto;
}

// ─── Sessions ────────────────────────────────────────────

.session-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.session-item {
  padding: 8px 10px;
  border-radius: $radius-sm;
  border: 1px solid $border-light;
  cursor: pointer;
  transition: border-color $transition-fast;

  &:hover { border-color: rgba(var(--accent-primary-rgb), 0.3); }
}

.session-title {
  font-size: 13px;
  font-weight: 500;
  color: $text-primary;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: $text-muted;
}

.column-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  font-size: 12px;
  color: $text-muted;
}

// ─── Modal ───────────────────────────────────────────────

.messages-modal-body {
  max-height: 65vh;
  overflow: hidden;
  padding: 4px 0;

  :deep(.message-list) {
    max-height: 65vh;
    background: transparent;
    padding: 0;
  }
}
</style>
