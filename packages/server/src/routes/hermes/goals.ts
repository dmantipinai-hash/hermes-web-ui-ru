/**
 * Goal API routes.
 */

import Router from '@koa/router'
import * as ctrl from '../../controllers/hermes/goals'

export const goalRoutes = new Router()

goalRoutes.get('/api/hermes/goals', ctrl.list)
goalRoutes.get('/api/hermes/goals/active', ctrl.getActive)
goalRoutes.get('/api/hermes/goals/:id', ctrl.get)
goalRoutes.post('/api/hermes/goals', ctrl.create)
goalRoutes.patch('/api/hermes/goals/:id', ctrl.update)
goalRoutes.delete('/api/hermes/goals/:id', ctrl.remove)
