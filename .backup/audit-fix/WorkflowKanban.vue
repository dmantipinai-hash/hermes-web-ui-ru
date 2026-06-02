<template>
  <div class="workflow-kanban">
    <div class="kanban-columns">
      <div v-for="col in columns" :key="col.status" class="kanban-column">
        <div class="column-header">
          <span class="column-icon">{{ col.icon }}</span>
          <span class="column-title">{{ col.title }}</span>
          <span class="column-count">{{ cardsFor(col.status).length }}</span>
        </div>
        <div class="column-cards">
          <div v-for="card in cardsFor(col.status)" :key="card.id" class="kanban-card" :class="{ running: card.status === 'running' }">
            <div class="card-title">{{ card.title }}</div>
            <div v-if="card.description" class="card-desc">{{ card.description }}</div>
            <div class="card-meta">
              <span v-if="card.time_spent_sec" class="card-time">⏱ {{ formatTime(card.time_spent_sec) }}</span>
              <span v-if="card.goal_id" class="card-goal">🎯</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface WorkflowCard {
  id: string
  title: string
  status: string
  workflow_id: string
  goal_id: string | null
  started_at: number
  finished_at: number | null
  time_spent_sec: number
  description: string
}

const cards = ref<WorkflowCard[]>([])

const columns = [
  { status: 'todo', title: 'To Do', icon: '📋' },
  { status: 'running', title: 'Running', icon: '▶️' },
  { status: 'completed', title: 'Completed', icon: '✅' },
  { status: 'failed', title: 'Failed', icon: '❌' },
]

function cardsFor(status: string): WorkflowCard[] {
  return cards.value.filter(c => c.status === status)
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

onMounted(async () => {
  try {
    const res = await fetch('/api/hermes/workflows/kanban')
    if (res.ok) {
      const data = await res.json()
      cards.value = data.cards ?? []
    }
  } catch {
    // non-critical
  }
})
</script>

<style scoped>
.workflow-kanban {
  padding: 16px;
}
.kanban-columns {
  display: flex;
  gap: 16px;
  overflow-x: auto;
}
.kanban-column {
  min-width: 260px;
  flex: 1;
  background: var(--n-color);
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  padding: 12px;
}
.column-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--n-border-color);
}
.column-count {
  margin-left: auto;
  background: var(--n-color-embedded);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}
.column-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.kanban-card {
  background: var(--n-color-embedded);
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  padding: 10px;
  cursor: default;
}
.kanban-card.running {
  border-left: 3px solid #10b981;
}
.card-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 4px;
}
.card-desc {
  font-size: 12px;
  color: var(--n-text-color-3);
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--n-text-color-3);
}
</style>
