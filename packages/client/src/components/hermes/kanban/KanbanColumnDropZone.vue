<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { makeDroppable } from '@vue-dnd-kit/core'
import KanbanTaskCard from './KanbanTaskCard.vue'
import type { KanbanTask } from '@/api/hermes/kanban'
import type { ProfileAvatar } from '@/api/hermes/profiles'

const props = defineProps<{
  columnKey: string
  tasks: KanbanTask[]
  compactMode: boolean
  profileAvatarByName: Record<string, ProfileAvatar | null>
  maxHeight?: string
}>()

const emit = defineEmits<{
  'task-click': [taskId: string]
  'task-dropped': [taskId: string, targetColumn: string]
}>()

const { t } = useI18n()

const dropZoneRef = ref<HTMLElement | null>(null)
const { isDragOver, isAllowed } = makeDroppable(dropZoneRef, {
  events: {
    onDrop(event) {
      const draggedItem = event.draggedItems[0]
      // Extract taskId from data (set by makeDraggable in KanbanTaskCard)
      const taskId = (draggedItem?.data as { taskId?: string } | undefined)?.taskId
      if (import.meta.env.DEV) console.log('[DnD] onDrop:', { taskId, columnKey: props.columnKey, draggedItems: event.draggedItems })
      if (taskId && taskId !== '') {
        emit('task-dropped', taskId, props.columnKey)
      }
    },
  },
})
</script>

<template>
  <div
    ref="dropZoneRef"
    class="column-drop-zone"
    :class="[
      `status-${columnKey}`,
      {
        'drag-over': isDragOver,
        'drag-allowed': isAllowed && isDragOver,
      },
    ]"
    :style="maxHeight ? { maxHeight } : undefined"
  >
    <KanbanTaskCard
      v-for="task in tasks"
      :key="task.id"
      :compact="compactMode"
      :task="task"
      :assignee-avatar="task.assignee ? profileAvatarByName[task.assignee] || null : null"
      @click="emit('task-click', task.id)"
    />
    <div v-if="tasks.length === 0" class="column-empty">
      {{ t('kanban.noTasks') }}
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.column-drop-zone {
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

  /* UI column colors */
  &.inbox,
  &.status-inbox { --kanban-status-color: #94a3b8; }
  &.agent_working,
  &.status-agent_working { --kanban-status-color: #8b5cf6; }
  &.waiting_me,
  &.status-waiting_me { --kanban-status-color: #f59e0b; }

  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  min-height: 60px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  transition: background-color 0.2s ease;

  /* Smooth vertical scroll */
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: $border-color;
    border-radius: 2px;
  }
}

.drag-over {
  background-color: rgba(var(--accent-primary-rgb), 0.04);
}

.drag-allowed {
  background-color: rgba(var(--accent-primary-rgb), 0.08);
  outline: 2px dashed var(--accent-primary);
  outline-offset: -2px;
  border-radius: 4px;
}

.column-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  font-size: 12px;
  color: $text-muted;
  padding: 12px;
  opacity: 0.6;
}
</style>
