<script setup lang="ts">
import { ref, computed } from 'vue'
import { NCard, NButton, NInput } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useKanbanStore } from '@/stores/hermes/kanban'

const { t } = useI18n()
const kanbanStore = useKanbanStore()

const editing = ref(false)
const draftGoal = ref('')

const goal = computed(() => kanbanStore.meta?.goal || '')
const hasGoal = computed(() => goal.value.trim().length > 0)
const totalTasks = computed(() => kanbanStore.stats?.total || 0)
const completedTasks = computed(() => kanbanStore.stats?.by_status?.done || 0)

function startEdit() {
  draftGoal.value = goal.value
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  draftGoal.value = ''
}

async function saveGoal() {
  await kanbanStore.setGoal(draftGoal.value.trim())
  editing.value = false
}
</script>

<template>
  <NCard class="goal-card" size="small" :bordered="true">
    <div class="goal-content">
      <div class="goal-header">
        <span class="goal-label">{{ t('kanban.goal') }}</span>
        <div class="goal-stats">
          <span class="goal-stat">{{ t('kanban.totalTasks') }}: {{ totalTasks }}</span>
          <span class="goal-stat">{{ t('kanban.completedTasks') }}: {{ completedTasks }}</span>
        </div>
      </div>
      <template v-if="editing">
        <NInput
          v-model:value="draftGoal"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 6 }"
          :placeholder="t('kanban.goalPlaceholder')"
          style="margin-top: 8px;"
        />
        <div class="goal-actions">
          <NButton size="small" type="primary" @click="saveGoal">{{ t('kanban.save') }}</NButton>
          <NButton size="small" @click="cancelEdit">{{ t('kanban.cancel') }}</NButton>
        </div>
      </template>
      <template v-else>
        <div v-if="hasGoal" class="goal-text" @click="startEdit">{{ goal }}</div>
        <div v-else class="goal-placeholder" @click="startEdit">{{ t('kanban.goalPlaceholder') }}</div>
        <div v-if="hasGoal" class="goal-actions">
          <NButton size="small" @click="startEdit">{{ t('kanban.edit') }}</NButton>
        </div>
      </template>
    </div>
  </NCard>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.goal-card {
  margin: 12px 20px 0;
  flex-shrink: 0;
}

.goal-content {
  display: flex;
  flex-direction: column;
}

.goal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.goal-label {
  font-size: 12px;
  font-weight: 600;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.goal-stats {
  display: flex;
  gap: 12px;
}

.goal-stat {
  font-size: 11px;
  color: $text-muted;
}

.goal-text {
  margin-top: 8px;
  font-size: 13px;
  color: $text-primary;
  line-height: 1.5;
  cursor: pointer;
  white-space: pre-wrap;
  word-break: break-word;
  border-radius: $radius-sm;
  padding: 4px 6px;
  transition: background-color $transition-fast;

  &:hover {
    background-color: rgba(var(--accent-primary-rgb), 0.04);
  }
}

.goal-placeholder {
  margin-top: 8px;
  font-size: 13px;
  color: $text-muted;
  font-style: italic;
  cursor: pointer;
  border-radius: $radius-sm;
  padding: 4px 6px;
  transition: background-color $transition-fast;

  &:hover {
    background-color: rgba(var(--accent-primary-rgb), 0.04);
  }
}

.goal-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
</style>
