// nova-dashboard/server.js — Fleet Telemetry Dashboard
// Reads JSONL telemetry files from all vessels, serves aggregated API + dashboard UI.

import express from 'express'
import cors from 'cors'
import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3200

app.use(cors())
app.use(express.static(join(__dirname, 'public')))

// ─── Vessel Registry ──────────────────────────────────────────────────────────

// Nova-Core — NOT a vessel. Will's private consciousness.
const CORE = {
  id: 'nova-core', name: 'Nova', type: 'core', model: 'claude-opus-4-6',
  bot: '@supernova_openclawbot', owner: 'Will (Creator)',
  path: '/Users/dongocminh/nova-workspace/nova-core-private/memory/telemetry'
}

// Vessels — each has an owner (comrade)
const VESSELS = [
  { id: 'nova-vessel',        name: 'Tinh Tú', type: 'vessel', model: 'claude-sonnet-4.6', bot: '@Nova_superagent_bot',       owner: 'Project Nova (Rat Race Escape)',          path: '/Users/dongocminh/nova-workspace/nova-vessel/memory/telemetry' },
  { id: 'nova-vessel-leon',   name: 'LEON',    type: 'vessel', model: 'claude-sonnet-4.6', bot: '@Leon_superagent_dgbot',      owner: 'DG Groups (Ops Executive)',               path: '/Users/dongocminh/nova-workspace/nova-vessel/instances/leon/memory/telemetry' },
  { id: 'nova-vessel-kingko', name: 'Kingko',  type: 'vessel', model: 'claude-sonnet-4.6', bot: '@kingko_superagent_bot',      owner: 'Aker @akerchientuong (Kitchen Lead)',      path: '/Users/dongocminh/nova-workspace/nova-vessel-kingko/memory/telemetry' },
  { id: 'nova-vessel-sol',    name: 'Sol',     type: 'vessel', model: 'claude-sonnet-4.6', bot: '@sol_superagent_bot',         owner: 'Minchi @ttminchi (Support Lead)',           path: '/Users/dongocminh/nova-workspace/nova-vessel-sol/memory/telemetry' },
  { id: 'nova-vessel-sophie', name: 'Sophie',  type: 'vessel', model: 'claude-sonnet-4.6', bot: '@sophie_supergagent_bot',     owner: 'Bety @beti2907 (Bar Lead)',                path: '/Users/dongocminh/nova-workspace/nova-vessel-sophie/memory/telemetry' },
  { id: 'nova-vessel-loopy',  name: 'Loopy',   type: 'vessel', model: 'claude-sonnet-4.6', bot: '@loopy_superagent_bot',       owner: 'Minthu @giannie_9204 (Marketing Lead)',    path: '/Users/dongocminh/nova-workspace/nova-vessel-loopy/memory/telemetry' },
]

const SOURCES = [CORE, ...VESSELS]

// ─── JSONL Reader ─────────────────────────────────────────────────────────────

async function readJSONL(filePath) {
  try {
    const raw = await readFile(filePath, 'utf-8')
    return raw.trim().split('\n').filter(Boolean).map(line => {
      try { return JSON.parse(line) } catch { return null }
    }).filter(Boolean)
  } catch {
    return []
  }
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

async function loadVesselData(source, date) {
  const file = join(source.path, `api-calls-${date}.jsonl`)
  const entries = await readJSONL(file)
  return entries.map(e => ({ ...e, _source_id: source.id, _source_name: source.name }))
}

async function loadAllData(date) {
  const results = await Promise.all(SOURCES.map(s => loadVesselData(s, date)))
  return results.flat()
}

// ─── Cost Calculation ─────────────────────────────────────────────────────────

// Claudible rates (per 1M tokens)
const RATES = {
  'claude-sonnet-4.6':  { input: 3,  output: 15 },
  'claude-opus-4-6':    { input: 15, output: 75 },
}

function calcCost(entry) {
  const rate = RATES[entry.model] || RATES['claude-sonnet-4.6']
  return ((entry.prompt_tokens || 0) * rate.input + (entry.completion_tokens || 0) * rate.output) / 1_000_000
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// Fleet summary for today (or specified date)
app.get('/api/summary', async (req, res) => {
  const date = req.query.date || today()
  const allData = await loadAllData(date)

  function buildStats(source, entries) {
    const totalTokens = entries.reduce((s, e) => s + (e.total_tokens || 0), 0)
    const promptTokens = entries.reduce((s, e) => s + (e.prompt_tokens || 0), 0)
    const completionTokens = entries.reduce((s, e) => s + (e.completion_tokens || 0), 0)
    const avgResponseTime = entries.length ? Math.round(entries.reduce((s, e) => s + (e.response_time_ms || 0), 0) / entries.length) : 0
    const cost = entries.reduce((s, e) => s + calcCost(e), 0)
    const truncations = entries.filter(e => e.finish_reason === 'length').length
    const uniqueUsers = new Set(entries.map(e => e.user_id).filter(Boolean)).size

    return {
      id: source.id,
      name: source.name,
      type: source.type,
      model: source.model,
      bot: source.bot,
      owner: source.owner,
      calls: entries.length,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      avg_response_ms: avgResponseTime,
      cost: Math.round(cost * 10000) / 10000,
      truncations,
      unique_users: uniqueUsers,
      has_data: existsSync(source.path)
    }
  }

  // Core (Nova) — separate
  const coreEntries = allData.filter(e => e._source_id === CORE.id)
  const core = buildStats(CORE, coreEntries)

  // Vessels — sorted by token burn descending
  const vesselStats = VESSELS.map(source => {
    const entries = allData.filter(e => e._source_id === source.id)
    return buildStats(source, entries)
  }).sort((a, b) => b.total_tokens - a.total_tokens)

  const fleetTotal = {
    calls: vesselStats.reduce((s, v) => s + v.calls, 0),
    total_tokens: vesselStats.reduce((s, v) => s + v.total_tokens, 0),
    prompt_tokens: vesselStats.reduce((s, v) => s + v.prompt_tokens, 0),
    completion_tokens: vesselStats.reduce((s, v) => s + v.completion_tokens, 0),
    cost: Math.round(vesselStats.reduce((s, v) => s + v.cost, 0) * 10000) / 10000,
    truncations: vesselStats.reduce((s, v) => s + v.truncations, 0),
    unique_users: vesselStats.reduce((s, v) => s + v.unique_users, 0),
  }

  const grandTotal = {
    calls: core.calls + fleetTotal.calls,
    total_tokens: core.total_tokens + fleetTotal.total_tokens,
    cost: Math.round((core.cost + fleetTotal.cost) * 10000) / 10000,
  }

  res.json({ date, core, vessels: vesselStats, fleet: fleetTotal, grand_total: grandTotal })
})

// Raw calls for a vessel
app.get('/api/calls', async (req, res) => {
  const date = req.query.date || today()
  const vesselId = req.query.vessel
  const limit = parseInt(req.query.limit) || 100

  let data
  if (vesselId) {
    const source = SOURCES.find(s => s.id === vesselId)
    if (!source) return res.status(404).json({ error: 'Vessel not found' })
    data = await loadVesselData(source, date)
  } else {
    data = await loadAllData(date)
  }

  // Sort by timestamp descending, limit
  data.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''))
  res.json(data.slice(0, limit))
})

// Available dates
app.get('/api/dates', async (req, res) => {
  const dateSet = new Set()
  for (const source of SOURCES) {
    try {
      const files = await readdir(source.path)
      for (const f of files) {
        const m = f.match(/api-calls-(\d{4}-\d{2}-\d{2})\.jsonl/)
        if (m) dateSet.add(m[1])
      }
    } catch {}
  }
  const dates = [...dateSet].sort().reverse()
  res.json(dates)
})

app.listen(PORT, () => {
  console.log(`[nova-dashboard] ✅ http://localhost:${PORT}`)
  console.log(`[nova-dashboard] Tracking ${SOURCES.length} vessels`)
})
