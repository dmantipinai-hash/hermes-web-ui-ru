/**
 * Workflow controller — thin Koa handlers delegating to workflowService.
 */

import type { Context } from 'koa'
import * as svc from '../../services/workflowService'

function body(ctx: Context): Record<string, any> {
  return (ctx.request.body && typeof ctx.request.body === 'object')
    ? (ctx.request.body as Record<string, any>)
    : {}
}

export async function list(ctx: Context) {
  ctx.body = { workflows: svc.listWorkflows() }
}

export async function get(ctx: Context) {
  const wf = svc.getWorkflow(ctx.params.id)
  if (!wf) {
    ctx.status = 404
    ctx.body = { error: { message: 'Workflow not found' } }
    return
  }
  ctx.body = { workflow: wf }
}

export async function create(ctx: Context) {
  const b = body(ctx)
  if (!b.name || typeof b.name !== 'string' || !b.name.trim()) {
    ctx.status = 400
    ctx.body = { error: { message: 'name is required' } }
    return
  }
  const wf = svc.createWorkflow({
    name: b.name.trim(),
    description: b.description,
    goal_id: b.goal_id,
    config: b.config,
  })
  ctx.status = 201
  ctx.body = { workflow: wf }
}

export async function update(ctx: Context) {
  const b = body(ctx)
  const wf = svc.updateWorkflow(ctx.params.id, b)
  if (!wf) {
    ctx.status = 404
    ctx.body = { error: { message: 'Workflow not found' } }
    return
  }
  ctx.body = { workflow: wf }
}

export async function remove(ctx: Context) {
  if (!svc.deleteWorkflow(ctx.params.id)) {
    ctx.status = 404
    ctx.body = { error: { message: 'Workflow not found' } }
    return
  }
  ctx.body = { ok: true }
}

export async function run(ctx: Context) {
  try {
    const run = svc.startRun(ctx.params.id)
    ctx.status = 201
    ctx.body = { run }
  } catch (e: any) {
    ctx.status = 400
    ctx.body = { error: { message: e.message } }
  }
}

export async function stop(ctx: Context) {
  const b = body(ctx)
  try {
    const run = svc.stopRun(ctx.params.id, ctx.params.runId, b.result)
    if (!run) {
      ctx.status = 404
      ctx.body = { error: { message: 'Run not found' } }
      return
    }
    ctx.body = { run }
  } catch (e: any) {
    ctx.status = 400
    ctx.body = { error: { message: e.message } }
  }
}

export async function listRuns(ctx: Context) {
  ctx.body = { runs: svc.listRuns(ctx.params.id) }
}

export async function getRun(ctx: Context) {
  const run = svc.getRun(ctx.params.id, ctx.params.runId)
  if (!run) {
    ctx.status = 404
    ctx.body = { error: { message: 'Run not found' } }
    return
  }
  const steps = svc.getStepLogs(run.id)
  ctx.body = { run, steps }
}

export async function getTime(ctx: Context) {
  const wf = svc.getWorkflow(ctx.params.id)
  if (!wf) {
    ctx.status = 404
    ctx.body = { error: { message: 'Workflow not found' } }
    return
  }
  ctx.body = svc.getWorkflowTime(ctx.params.id)
}

export async function getKanban(ctx: Context) {
  const workflows = svc.listWorkflows()
  const cards = [] as Array<{
    id: string
    title: string
    status: string
    workflow_id: string
    goal_id: string | null
    started_at: number
    finished_at: number | null
    time_spent_sec: number
    description: string
  }>

  for (const wf of workflows) {
    const runs = svc.listRuns(wf.id)
    const latestRun = runs[0]
    cards.push({
      id: wf.id,
      title: wf.name,
      status: latestRun?.status ?? (wf.status === 'active' ? 'todo' : 'archived'),
      workflow_id: wf.id,
      goal_id: wf.goal_id,
      started_at: latestRun?.started_at ?? wf.created_at,
      finished_at: latestRun?.finished_at ?? null,
      time_spent_sec: latestRun?.time_spent_sec ?? 0,
      description: wf.description,
    })
  }

  ctx.body = { cards }
}
