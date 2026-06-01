<template>
  <div class="activity-feed">
    <div class="feed-header">
      <span class="feed-icon">⚡</span>
      <span class="feed-title">Activity</span>
    </div>
    <div v-if="loading" class="feed-loading">Loading...</div>
    <div v-else-if="activities.length === 0" class="feed-empty">No activity yet</div>
    <div v-else class="feed-list">
      <div v-for="item in activities" :key="item.id" class="feed-item">
        <span class="feed-item-icon">{{ iconFor(item) }}</span>
        <div class="feed-item-content">
          <span class="feed-item-message">{{ item.message }}</span>
          <span class="feed-item-time">{{ timeAgo(item.created_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface ActivityEntry {
  id: number
  type: string
  entity_id: string
  action: string
  message: string
  created_at: number
}

const activities = ref<ActivityEntry[]>([])
const loading = ref(true)

function iconFor(item: ActivityEntry): string {
  if (item.type === 'goal') return '🎯'
  if (item.type === 'workflow') return '🔄'
  if (item.type === 'run') {
    if (item.action === 'started') return '▶️'
    if (item.action === 'completed') return '✅'
    if (item.action === 'failed') return '❌'
    return '🏃'
  }
  if (item.type === 'step') return '📋'
  return '📌'
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

onMounted(async () => {
  try {
    const res = await fetch('/api/hermes/activity?limit=20')
    if (res.ok) {
      const data = await res.json()
      activities.value = data.activities ?? []
    }
  } catch {
    // silently ignore — activity feed is non-critical
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.activity-feed {
  padding: 8px 16px 12px;
  border-bottom: 1px solid var(--n-border-color);
  background: var(--n-color);
}
.feed-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
}
.feed-icon {
  font-size: 16px;
}
.feed-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.feed-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}
.feed-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
}
.feed-item-icon {
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1;
}
.feed-item-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.feed-item-message {
  color: var(--n-text-color-2);
  word-break: break-word;
}
.feed-item-time {
  color: var(--n-text-color-3);
  font-size: 11px;
}
.feed-loading,
.feed-empty {
  font-size: 12px;
  color: var(--n-text-color-3);
  padding: 4px 0;
}
</style>
