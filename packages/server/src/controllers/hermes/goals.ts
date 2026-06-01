/**
 * Goal controller — thin Koa handlers.
 */

import type { Context } from 'koa'
import * as svc from '../../services/goalService'

function body(ctx: Context): Record<string, any> {
  return (ctx.request.body && typeof ctx.request.body === 'object')
    ? (ctx.request.body as Record<string, any>)
    : {}
}

export async function list(ctx: Context) {
  ctx.body = { goals: svc.listGoals() }
}

export async function getActive(ctx: Context) {
  const goal = svc.getActiveGoal()
  ctx.body = { goal: goal ?? null }
}

export async function get(ctx: Context) {
  const goal = svc.getGoal(ctx.params.id)
  if (!goal) {
    ctx.status = 404
    ctx.body = { error: { message: 'Goal not found' } }
    return
  }
  ctx.body = { goal }
}

export async function create(ctx: Context) {
  const b = body(ctx)
  if (!b.title || typeof b.title !== 'string' || !b.title.trim()) {
    ctx.status = 400
    ctx.body = { error: { message: 'title is required' } }
    return
  }
  const goal = svc.createGoal({ title: b.title.trim(), description: b.description })
  ctx.status = 201
  ctx.body = { goal }
}

export async function update(ctx: Context) {
  const b = body(ctx)
  const goal = svc.updateGoal(ctx.params.id, b)
  if (!goal) {
    ctx.status = 404
    ctx.body = { error: { message: 'Goal not found' } }
    return
  }
  ctx.body = { goal }
}

export async function remove(ctx: Context) {
  if (!svc.deleteGoal(ctx.params.id)) {
    ctx.status = 404
    ctx.body = { error: { message: 'Goal not found' } }
    return
  }
  ctx.body = { ok: true }
}
