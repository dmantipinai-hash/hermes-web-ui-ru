<template>
  <div class="goal-panel">
    <div v-if="loading" class="goal-loading">
      <NSpin size="small" />
    </div>
    <div v-else-if="goal">
      <div class="goal-header">
        <span class="goal-icon">🎯</span>
        <span class="goal-title">{{ goal.title }}</span>
      </div>
      <p v-if="goal.description" class="goal-desc">{{ goal.description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { request } from '@/api/client'
import { NSpin } from 'naive-ui'

interface Goal {
  id: string
  title: string
  description: string
  status: string
}

interface GoalResponse { goal: Goal }

const goal = ref<Goal | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const data = await request<GoalResponse>('/api/hermes/goals/active')
    goal.value = data.goal
  } catch {
    // silently ignore — goal panel is non-critical
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.goal-panel {
  padding: 12px 16px;
  border-bottom: 1px solid var(--n-border-color);
  background: var(--n-color);
}
.goal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
}
.goal-icon {
  font-size: 16px;
}
.goal-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.goal-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
}
.goal-desc {
  margin: 4px 0 0 24px;
  font-size: 12px;
  color: var(--n-text-color-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
