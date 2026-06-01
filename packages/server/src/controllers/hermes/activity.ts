/**
 * Activity feed controller — thin Koa handlers.
 */

import type { Context } from 'koa'
import * as svc from '../../services/activityService'

export async function getFeed(ctx: Context) {
  const limitParam = ctx.query.limit as string | undefined
  const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 200)
  const offsetParam = ctx.query.offset as string | undefined
  const offset = Math.max(parseInt(offsetParam || '0', 10) || 0, 0)
  ctx.body = { activities: svc.getFeed(limit, offset) }
}

export async function getEntityActivity(ctx: Context) {
  const type = ctx.params.type as string
  const entityId = ctx.params.id as string
  if (!['goal', 'workflow', 'run', 'step'].includes(type)) {
    ctx.status = 400
    ctx.body = { error: { message: 'Invalid type. Must be: goal, workflow, run, step' } }
    return
  }
  ctx.body = { activities: svc.getActivityForEntity(type as any, entityId) }
}
