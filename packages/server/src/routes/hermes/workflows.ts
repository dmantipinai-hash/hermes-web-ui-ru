/**
 * Workflow API routes.
 */

import Router from '@koa/router'
import * as ctrl from '../../controllers/hermes/workflows'

export const workflowRoutes = new Router()

workflowRoutes.get('/api/hermes/workflows', ctrl.list)
workflowRoutes.get('/api/hermes/workflows/kanban', ctrl.getKanban)
workflowRoutes.get('/api/hermes/workflows/:id', ctrl.get)
workflowRoutes.post('/api/hermes/workflows', ctrl.create)
workflowRoutes.patch('/api/hermes/workflows/:id', ctrl.update)
workflowRoutes.delete('/api/hermes/workflows/:id', ctrl.remove)
workflowRoutes.post('/api/hermes/workflows/:id/run', ctrl.run)
workflowRoutes.post('/api/hermes/workflows/:id/runs/:runId/stop', ctrl.stop)
workflowRoutes.get('/api/hermes/workflows/:id/runs', ctrl.listRuns)
workflowRoutes.get('/api/hermes/workflows/:id/runs/:runId', ctrl.getRun)
workflowRoutes.get('/api/hermes/workflows/:id/time', ctrl.getTime)
