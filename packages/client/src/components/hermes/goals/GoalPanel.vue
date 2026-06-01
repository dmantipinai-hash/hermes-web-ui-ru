<template>
  <div class="goal-panel" v-if="goal">
    <div class="goal-header">
      <span class="goal-icon">🎯</span>
      <span class="goal-title">{{ goal.title }}</span>
    </div>
    <p v-if="goal.description" class="goal-desc">{{ goal.description }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Goal {
  id: string
  title: string
  description: string
  status: string
}

const goal = ref<Goal | null>(null)

onMounted(async () => {
  try {
    const res = await fetch('/api/hermes/goals/active')
    if (res.ok) {
      const data = await res.json()
      goal.value = data.goal
    }
  } catch {
    // silently ignore — goal panel is non-critical
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
.goal-desc {
  margin: 4px 0 0 24px;
  font-size: 12px;
  color: var(--n-text-color-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
