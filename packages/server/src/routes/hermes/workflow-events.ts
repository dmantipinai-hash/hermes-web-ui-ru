/**
 * Workflow events WebSocket — broadcasts workflow/activity events via Socket.IO.
 * Uses the existing Socket.IO instance from GroupChatServer.
 */

import type { Server as IOServer } from 'socket.io'
import { logger } from '../../services/logger'

const WORKFLOW_NAMESPACE = '/workflow-events'

let io: IOServer | null = null

export function setupWorkflowEventsSocket(socketIO: IOServer): void {
  io = socketIO
  const nsp = io.of(WORKFLOW_NAMESPACE)

  nsp.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, '[workflow-events] client connected')

    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.id }, '[workflow-events] client disconnected')
    })
  })

  logger.info(`Socket.IO namespace '${WORKFLOW_NAMESPACE}' ready for workflow events`)
}

export function broadcastWorkflowEvent(event: {
  type: 'goal:updated' | 'workflow:status' | 'activity:new' | 'run:status'
  payload: Record<string, unknown>
}): void {
  if (!io) return
  const nsp = io.of(WORKFLOW_NAMESPACE)
  nsp.emit('event', event)
}
