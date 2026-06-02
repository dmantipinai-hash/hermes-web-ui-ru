<script setup lang="ts">
import { computed } from 'vue'
import { NTooltip } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import ProfileAvatar from '@/components/hermes/profiles/ProfileAvatar.vue'
import { activeDuration, runningDuration, formatDuration } from '@/composables/useKanbanMetrics'
import { useKanbanStore } from '@/stores/hermes/kanban'
import type { KanbanTask } from '@/api/hermes/kanban'
import type { ProfileAvatar as ProfileAvatarData } from '@/api/hermes/profiles'

const props = defineProps<{
  task: KanbanTask
  assigneeAvatar?: ProfileAvatarData | null
  compact?: boolean
}>()

const emit = defineEmits<{
  click: [taskId: string]
}>()

const { t } = useI18n()

const timeAgo = computed(() => {
  const diff = Date.now() / 1000 - props.task.created_at
  if (diff < 60) return t('kanban.card.timeAgo.justNow')
  if (diff < 3600) return t('kanban.card.timeAgo.minutes', { count: Math.floor(diff / 60) })
  if (diff < 86400) return t('kanban.card.timeAgo.hours', { count: Math.floor(diff / 3600) })
  return t('kanban.card.timeAgo.days', { count: Math.floor(diff / 86400) })
})

const priorityLabel = computed(() => {
  if (props.task.priority >= 3) return 'high'
  if (props.task.priority === 2) return 'medium'
  return 'low'
})

const priorityText = computed(() => {
  return t(`kanban.card.priority.${priorityLabel.value}`)
})

const durationText = computed(() => {
  const running = runningDuration(props.task)
  if (running != null) return `⏱ ${t('kanban.inProgress')}: ${formatDuration(running)}`
  const active = activeDuration(props.task)
  if (active != null) return `⏱ ${t('kanban.activeTime')}: ${formatDuration(active)}`
  return null
})

const milestoneBadge = computed(() => {
  const milestoneId = kanbanStore.meta?.taskMeta?.[props.task.id]?.milestoneId
  if (!milestoneId) return null
  const ms = (kanbanStore.meta?.milestones || []).find(m => m.id === milestoneId && !m.archived)
  return ms ? ms.name : null
})

const taskTurn = computed(() => {
  return kanbanStore.meta?.taskMeta?.[props.task.id]?.turn
})

const turnLabel = computed(() => {
  if (!taskTurn.value) return null
  return t(`kanban.turn.${taskTurn.value}`)
})

const turnIcon = computed(() => {
  if (!taskTurn.value) return ''
  if (taskTurn.value === 'agent') return '🟢'
  if (taskTurn.value === 'user') return '🟡'
  return '✅'
})

const taskLabels = computed(() => {
  return kanbanStore.meta?.taskMeta?.[props.task.id]?.labels || []
})

const taskDueDate = computed(() => {
  return kanbanStore.meta?.taskMeta?.[props.task.id]?.due_date || null
})

const checklistProgress = computed(() => {
  const cl = kanbanStore.meta?.taskMeta?.[props.task.id]?.checklist || []
  if (cl.length === 0) return null
  return { done: cl.filter(i => i.done).length, total: cl.length }
})

const kanbanStore = useKanbanStore()
</script>

<template>
  <div class="kanban-task-card" :class="[`status-${task.status}`, { compact: props.compact }]" @click="emit('click', task.id)">
    <div class="card-title">{{ task.title }}</div>
    <div class="card-meta">
      <NTooltip v-if="task.assignee" trigger="hover">
        <template #trigger>
          <span class="meta-tag assignee-tag">
            <ProfileAvatar
              class="assignee-profile-avatar"
              :name="task.assignee"
              :avatar="assigneeAvatar"
              :size="18"
              aria-hidden="true"
            />
            <span>{{ task.assignee }}</span>
          </span>
        </template>
        {{ t('kanban.card.assigneeTooltip') }}
      </NTooltip>
      <span v-if="task.priority >= 2" class="meta-tag priority-tag" :class="priorityLabel">{{ priorityText }}</span>
      <span v-if="milestoneBadge" class="meta-tag milestone-tag">🏁 {{ milestoneBadge }}</span>
      <span v-if="turnLabel" class="meta-tag turn-tag" :class="`turn-${taskTurn}`">{{ turnIcon }} {{ turnLabel }}</span>
      <span class="meta-time">{{ timeAgo }}</span>
    </div>
    <div v-if="task.body" class="card-body-preview">{{ task.body.slice(0, 80) }}{{ task.body.length > 80 ? '...' : '' }}</div>
    <div v-if="taskLabels.length > 0" class="card-labels">
      <span v-for="label in taskLabels.slice(0, 3)" :key="label" class="card-label-tag">{{ label }}</span>
      <span v-if="taskLabels.length > 3" class="card-label-more">+{{ taskLabels.length - 3 }}</span>
    </div>
    <div class="card-extras">
      <span v-if="taskDueDate" class="card-due" :class="{ overdue: new Date(taskDueDate) < new Date() }">\uD83D\uDCC5 {{ taskDueDate }}</span>
      <span v-if="checklistProgress" class="card-checklist">\u2611 {{ checklistProgress.done }}/{{ checklistProgress.total }}</span>
      <span v-if="durationText" class="card-duration">{{ durationText }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.kanban-task-card {
  --kanban-card-status-color: #64748b;
  background-color: $bg-card;
  border: 1px solid $border-color;
  border-left: 3px solid var(--kanban-card-status-color);
  border-radius: $radius-md;
  padding: 12px;
  cursor: pointer;
  transition: border-color $transition-fast, box-shadow $transition-fast;

  &.status-triage { --kanban-card-status-color: #94a3b8; }
  &.status-todo { --kanban-card-status-color: #38bdf8; }
  &.status-ready { --kanban-card-status-color: #f59e0b; }
  &.status-running { --kanban-card-status-color: #8b5cf6; }
  &.status-blocked { --kanban-card-status-color: #ef4444; }
  &.status-done { --kanban-card-status-color: #22c55e; }
  &.status-archived { --kanban-card-status-color: #64748b; }

  &:hover {
    border-color: var(--kanban-card-status-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  &.compact {
    padding: 8px 10px;

    .card-title {
      font-size: 12px;
    }

    .card-body-preview {
      display: none;
    }

    .card-meta {
      margin-top: 4px;
      gap: 4px;
    }

    .card-extras {
      margin-top: 2px;
      gap: 6px;
    }

    .card-labels {
      margin-top: 4px;
    }
  }
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
  line-height: 1.4;
  word-break: break-word;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.meta-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.assignee-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(var(--accent-primary-rgb), 0.1);
  color: $accent-primary;
  padding-left: 2px;
}

.assignee-profile-avatar {
  box-shadow: 0 0 0 1px rgba(var(--accent-primary-rgb), 0.28);
}

.priority-tag {
  &.high {
    background: rgba(var(--error-rgb), 0.12);
    color: $error;
  }

  &.medium {
    background: rgba(var(--warning-rgb), 0.12);
    color: $warning;
  }

  &.low {
    background: rgba(var(--success-rgb), 0.12);
    color: $success;
  }
}

.milestone-tag {
  background: rgba(var(--accent-primary-rgb), 0.08);
  color: $accent-primary;
}

.turn-tag {
  &.turn-user {
    background: rgba(var(--warning-rgb), 0.12);
    color: $warning;
  }

  &.turn-agent {
    background: rgba(var(--info-rgb), 0.12);
    color: $info;
  }
}

.meta-time {
  font-size: 11px;
  color: $text-muted;
  margin-left: auto;
}

.card-body-preview {
  font-size: 12px;
  color: $text-muted;
  margin-top: 6px;
  line-height: 1.4;
}

.card-duration {
  font-size: 11px;
  color: $text-muted;
  font-variant-numeric: tabular-nums;
}

.card-labels {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.card-label-tag {
  font-size: 10px;
  padding: 0 5px;
  border-radius: 3px;
  background: rgba(var(--accent-primary-rgb), 0.08);
  color: $text-secondary;
}

.card-label-more {
  font-size: 10px;
  color: $text-muted;
}

.card-extras {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.card-due {
  font-size: 11px;
  color: $text-muted;

  &.overdue {
    color: $error;
    font-weight: 600;
  }
}

.card-checklist {
  font-size: 11px;
  color: $text-muted;
}
</style>
