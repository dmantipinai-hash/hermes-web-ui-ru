<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useKanbanStore } from '@/stores/hermes/kanban'
import { totalActiveTime, avgActiveTime, formatDuration } from '@/composables/useKanbanMetrics'

const { t } = useI18n()
const kanbanStore = useKanbanStore()

const tasks = computed(() => kanbanStore.tasks)
const total = computed(() => tasks.value.length)
const done = computed(() => tasks.value.filter(t => t.status === 'done').length)
const running = computed(() => tasks.value.filter(t => t.status === 'running').length)
const blocked = computed(() => tasks.value.filter(t => t.status === 'blocked').length)
const totalTime = computed(() => formatDuration(totalActiveTime(tasks.value)))
const avgTime = computed(() => {
  const avg = avgActiveTime(tasks.value)
  return avg > 0 ? formatDuration(avg) : '—'
})
</script>

<template>
  <div class="stats-mini">
    <div class="stat-item">
      <span class="stat-value">{{ total }}</span>
      <span class="stat-label">{{ t('kanban.stats.total') }}</span>
    </div>
    <div class="stat-item">
      <span class="stat-value stat-done">{{ done }}</span>
      <span class="stat-label">{{ t('kanban.stats.done') }}</span>
    </div>
    <div class="stat-item">
      <span class="stat-value stat-running">{{ running }}</span>
      <span class="stat-label">{{ t('kanban.stats.running') }}</span>
    </div>
    <div class="stat-item">
      <span class="stat-value stat-blocked">{{ blocked }}</span>
      <span class="stat-label">{{ t('kanban.stats.blocked') }}</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">⏱ {{ totalTime }}</span>
      <span class="stat-label">{{ t('kanban.stats.totalTime') }}</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">⏱ {{ avgTime }}</span>
      <span class="stat-label">{{ t('kanban.stats.avgTime') }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.stats-mini {
  display: flex;
  gap: 16px;
  padding: 8px 20px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 48px;
}

.stat-value {
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
  font-variant-numeric: tabular-nums;
}

.stat-done { color: #22c55e; }
.stat-running { color: #8b5cf6; }
.stat-blocked { color: #ef4444; }

.stat-label {
  font-size: 10px;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
</style>
