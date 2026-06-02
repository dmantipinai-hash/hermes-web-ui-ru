<script setup lang="ts">
import { computed } from 'vue'
import { NSelect, NButton, NModal, NInput, useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { useKanbanStore } from '@/stores/hermes/kanban'

const props = defineProps<{
  taskId: string
  currentMilestoneId?: string | null
}>()

const { t } = useI18n()
const message = useMessage()
const kanbanStore = useKanbanStore()

const showCreate = ref(false)
const newMilestoneName = ref('')
const newMilestoneDesc = ref('')

const activeMilestones = computed(() =>
  (kanbanStore.meta?.milestones || []).filter(ms => !ms.archived)
)

const options = computed(() => [
  { label: t('kanban.noMilestone'), value: '__none__' },
  ...activeMilestones.value.map(ms => ({
    label: ms.name,
    value: ms.id,
  })),
])

const selectedValue = computed({
  get: () => props.currentMilestoneId || '__none__',
  set: async (val: string) => {
    const milestoneId = val === '__none__' ? null : val
    try {
      await kanbanStore.setTaskMilestone(props.taskId, milestoneId)
    } catch (err: any) {
      message.error(err.message)
    }
  },
})

async function handleCreate() {
  const name = newMilestoneName.value.trim()
  if (!name) {
    message.warning(t('kanban.milestoneName'))
    return
  }
  try {
    await kanbanStore.createMilestone({
      name,
      description: newMilestoneDesc.value.trim() || undefined,
    })
    showCreate.value = false
    newMilestoneName.value = ''
    newMilestoneDesc.value = ''
    message.success(t('common.ok'))
  } catch (err: any) {
    message.error(err.message)
  }
}
</script>

<template>
  <div class="milestone-select">
    <NSelect
      v-model:value="selectedValue"
      :options="options"
      size="small"
      style="flex: 1;"
    />
    <NButton size="small" @click="showCreate = true">+</NButton>

    <NModal v-model:show="showCreate" preset="dialog" :title="t('kanban.addMilestone')" style="width: 380px;">
      <div class="create-form">
        <NInput v-model:value="newMilestoneName" :placeholder="t('kanban.milestoneName')" />
        <NInput v-model:value="newMilestoneDesc" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" :placeholder="t('kanban.milestoneDesc')" />
      </div>
      <template #action>
        <NButton @click="showCreate = false">{{ t('kanban.cancel') }}</NButton>
        <NButton type="primary" @click="handleCreate">{{ t('kanban.save') }}</NButton>
      </template>
    </NModal>
  </div>
</template>

<style scoped lang="scss">
.milestone-select {
  display: flex;
  gap: 6px;
  align-items: center;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
