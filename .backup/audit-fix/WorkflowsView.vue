<template>
  <div class="workflows-view">
    <div class="view-header">
      <h1>Workflows</h1>
      <button class="btn btn-primary" @click="showCreate = true">+ New Workflow</button>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <h2>Create Workflow</h2>
        <div class="form-group">
          <label>Name</label>
          <input v-model="newWf.name" type="text" placeholder="Workflow name" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea v-model="newWf.description" placeholder="Optional description" rows="3"></textarea>
        </div>
        <div class="form-actions">
          <button class="btn" @click="showCreate = false">Cancel</button>
          <button class="btn btn-primary" @click="createWorkflow">Create</button>
        </div>
      </div>
    </div>

    <!-- Workflow List -->
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="workflows.length === 0" class="empty">
      No workflows yet. Create one to get started.
    </div>
    <div v-else class="workflow-list">
      <div v-for="wf in workflows" :key="wf.id" class="workflow-card" @click="selectWorkflow(wf)">
        <div class="wf-header">
          <span class="wf-name">{{ wf.name }}</span>
          <span class="wf-status" :class="wf.status">{{ wf.status }}</span>
        </div>
        <div v-if="wf.description" class="wf-desc">{{ wf.description }}</div>
        <div class="wf-meta">
          <span class="wf-runs">{{ wf._runCount ?? 0 }} runs</span>
          <span v-if="wf._totalTime" class="wf-time">⏱ {{ formatTime(wf._totalTime) }}</span>
        </div>
        <div class="wf-actions">
          <button v-if="wf.status === 'active'" class="btn btn-sm" @click.stop="runWorkflow(wf.id)">▶ Run</button>
          <button class="btn btn-sm" @click.stop="toggleDetail(wf.id)">📋 Runs</button>
          <button class="btn btn-sm btn-danger" @click.stop="deleteWorkflow(wf.id)">🗑</button>
        </div>

        <!-- Run Details -->
        <div v-if="expandedWf === wf.id && runDetails.length > 0" class="run-details">
          <div v-for="run in runDetails" :key="run.id" class="run-item" :class="run.status">
            <span class="run-status-dot"></span>
            <span class="run-id">{{ run.id.slice(0, 8) }}</span>
            <span class="run-status-text">{{ run.status }}</span>
            <span v-if="run.time_spent_sec" class="run-time">{{ formatTime(run.time_spent_sec) }}</span>
            <span class="run-date">{{ formatDate(run.started_at) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

interface Workflow {
  id: string
  name: string
  description: string
  status: string
  goal_id: string | null
  created_at: number
  updated_at: number
  _runCount?: number
  _totalTime?: number
}

interface WorkflowRun {
  id: string
  workflow_id: string
  status: string
  started_at: number
  finished_at: number | null
  time_spent_sec: number
}

const route = useRoute()
const workflows = ref<Workflow[]>([])
const loading = ref(true)
const showCreate = ref(false)
const expandedWf = ref<string | null>(null)
const runDetails = ref<WorkflowRun[]>([])

const newWf = ref({ name: '', description: '' })

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString()
}

async function fetchWorkflows() {
  try {
    const res = await fetch('/api/hermes/workflows')
    if (res.ok) {
      const data = await res.json()
      workflows.value = data.workflows ?? []
      // Fetch time for each workflow
      for (const wf of workflows.value) {
        try {
          const timeRes = await fetch(`/api/hermes/workflows/${wf.id}/time`)
          if (timeRes.ok) {
            const timeData = await timeRes.json()
            wf._runCount = timeData.runs_count
            wf._totalTime = timeData.total_seconds
          }
        } catch { /* best effort */ }
      }
    }
  } catch {
    // silently
  } finally {
    loading.value = false
  }
}

async function createWorkflow() {
  if (!newWf.value.name.trim()) return
  try {
    const res = await fetch('/api/hermes/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWf.value),
    })
    if (res.ok) {
      showCreate.value = false
      newWf.value = { name: '', description: '' }
      await fetchWorkflows()
    }
  } catch { /* silently */ }
}

async function runWorkflow(id: string) {
  try {
    await fetch(`/api/hermes/workflows/${id}/run`, { method: 'POST' })
    await fetchWorkflows()
    if (expandedWf.value === id) await toggleDetail(id)
  } catch { /* silently */ }
}

async function deleteWorkflow(id: string) {
  if (!confirm('Delete this workflow?')) return
  try {
    await fetch(`/api/hermes/workflows/${id}`, { method: 'DELETE' })
    await fetchWorkflows()
  } catch { /* silently */ }
}

async function toggleDetail(id: string) {
  if (expandedWf.value === id) {
    expandedWf.value = null
    runDetails.value = []
    return
  }
  expandedWf.value = id
  try {
    const res = await fetch(`/api/hermes/workflows/${id}/runs`)
    if (res.ok) {
      const data = await res.json()
      runDetails.value = data.runs ?? []
    }
  } catch { runDetails.value = [] }
}

function selectWorkflow(wf: Workflow) {
  // Future: navigate to detail/edit view
}

onMounted(() => {
  if (route.params.id) {
    expandedWf.value = route.params.id as string
    toggleDetail(route.params.id as string)
  }
  fetchWorkflows()
})
</script>

<style scoped>
.workflows-view {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}
.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.view-header h1 {
  margin: 0;
  font-size: 24px;
}
.btn {
  padding: 6px 14px;
  border: 1px solid var(--n-border-color);
  background: var(--n-color);
  color: var(--n-text-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.btn-primary {
  background: #10b981;
  color: white;
  border-color: #10b981;
}
.btn-sm { padding: 3px 10px; font-size: 12px; }
.btn-danger { color: #ef4444; }
.btn:hover { opacity: 0.85; }

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: var(--n-color);
  border-radius: 12px;
  padding: 24px;
  width: 400px;
  max-width: 90vw;
}
.modal h2 { margin: 0 0 16px; font-size: 18px; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 13px; margin-bottom: 4px; font-weight: 600; }
.form-group input, .form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  background: var(--n-color-embedded);
  color: var(--n-text-color);
  font-size: 14px;
  box-sizing: border-box;
}
.form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }

.workflow-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.workflow-card {
  background: var(--n-color);
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.workflow-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.wf-header { display: flex; justify-content: space-between; align-items: center; }
.wf-name { font-weight: 600; font-size: 16px; }
.wf-status {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  text-transform: capitalize;
}
.wf-status.active { background: #d1fae5; color: #065f46; }
.wf-status.paused { background: #fef3c7; color: #92400e; }
.wf-status.archived { background: #e5e7eb; color: #6b7280; }
.wf-desc { font-size: 13px; color: var(--n-text-color-3); margin: 6px 0; }
.wf-meta { display: flex; gap: 12px; font-size: 12px; color: var(--n-text-color-3); margin: 8px 0; }
.wf-actions { display: flex; gap: 6px; margin-top: 8px; }

.run-details {
  margin-top: 12px;
  border-top: 1px solid var(--n-border-color);
  padding-top: 12px;
}
.run-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
}
.run-status-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #6b7280;
}
.run-item.running .run-status-dot { background: #10b981; }
.run-item.completed .run-status-dot { background: #3b82f6; }
.run-item.failed .run-status-dot { background: #ef4444; }
.run-id { font-family: monospace; font-size: 12px; color: var(--n-text-color-3); }
.run-status-text { text-transform: capitalize; }
.run-time { color: var(--n-text-color-3); }
.run-date { margin-left: auto; color: var(--n-text-color-3); font-size: 12px; }

.loading, .empty {
  text-align: center;
  color: var(--n-text-color-3);
  padding: 40px;
}
</style>
