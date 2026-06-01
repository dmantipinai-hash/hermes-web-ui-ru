import { ref, onMounted, onUnmounted } from 'vue'
import { io as socketIO } from 'socket.io-client'

interface WorkflowEvent {
  type: 'goal:updated' | 'workflow:status' | 'activity:new' | 'run:status'
  payload: Record<string, unknown>
}

export function useWorkflowEvents() {
  const lastEvent = ref<WorkflowEvent | null>(null)
  const connected = ref(false)
  let socket: ReturnType<typeof socketIO> | null = null

  function connect() {
    socket = socketIO('/workflow-events', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    })

    socket.on('connect', () => { connected.value = true })
    socket.on('disconnect', () => { connected.value = false })
    socket.on('event', (event: WorkflowEvent) => {
      lastEvent.value = event
    })
  }

  function disconnect() {
    if (socket) {
      socket.disconnect()
      socket = null
    }
  }

  onMounted(connect)
  onUnmounted(disconnect)

  return { lastEvent, connected }
}
