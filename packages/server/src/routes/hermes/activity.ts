/**
 * Activity feed API routes.
 */

import Router from '@koa/router'
import * as ctrl from '../../controllers/hermes/activity'

export const activityRoutes = new Router()

activityRoutes.get('/api/hermes/activity', ctrl.getFeed)
activityRoutes.get('/api/hermes/activity/:type/:id', ctrl.getEntityActivity)
