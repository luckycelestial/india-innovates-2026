/**
 * PRAJA MCP Server
 * Exposes PRAJA tools (Grievances, NayakAI, SentinelPulse) to GitHub Copilot Chat.
 *
 * Transport : Streamable HTTP  (POST /mcp)
 * Port      : 3131  (configure with MCP_PORT env)
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'
const PORT        = parseInt(process.env.MCP_PORT || '3131', 10)

// ── helpers ──────────────────────────────────────────────────────────────────

async function apiGet(path) {
  const r = await fetch(`${BACKEND_URL}/api${path}`)
  if (!r.ok) throw new Error(`Backend ${r.status}: ${await r.text()}`)
  return r.json()
}

async function apiPost(path, body) {
  const r = await fetch(`${BACKEND_URL}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`Backend ${r.status}: ${await r.text()}`)
  return r.json()
}

// ── MCP server ────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'praja-mcp',
  version: '1.0.0',
  description: 'PRAJA – AI-powered Citizen Grievance & Constituency Intelligence Platform',
})

// Tool: file a grievance
server.tool(
  'file_grievance',
  'Submit a new citizen grievance to GrievanceOS. Returns the created grievance record.',
  {
    title:       z.string().describe('Short title of the grievance'),
    description: z.string().describe('Full description of the issue'),
    category:    z.string().optional().describe('Category e.g. Roads, Water, Electricity'),
    ward:        z.string().optional().describe('Ward or locality name'),
    phone:       z.string().optional().describe('Contact phone number of the citizen'),
  },
  async ({ title, description, category, ward, phone }) => {
    const data = await apiPost('/grievances', { title, description, category, ward, phone })
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    }
  }
)

// Tool: list grievances
server.tool(
  'list_grievances',
  'Fetch a list of grievances, optionally filtered by status or department.',
  {
    status:     z.string().optional().describe('Filter by status: open | in_progress | closed'),
    department: z.string().optional().describe('Filter by assigned department'),
    limit:      z.number().int().min(1).max(100).optional().describe('Max records to return (default 20)'),
  },
  async ({ status, department, limit = 20 }) => {
    const params = new URLSearchParams()
    if (status)     params.set('status', status)
    if (department) params.set('department', department)
    params.set('limit', String(limit))
    const data = await apiGet(`/grievances?${params}`)
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    }
  }
)

// Tool: NayakAI chat
server.tool(
  'nayakai_query',
  'Ask the NayakAI assistant a governance question, draft a speech, summarize a document, or generate a morning brief.',
  {
    query:      z.string().describe('Your question or instruction for NayakAI'),
    context:    z.string().optional().describe('Optional document text or extra context'),
    task_type:  z.enum(['chat', 'summarize', 'speech', 'brief']).optional().describe('Task type (default: chat)'),
  },
  async ({ query, context, task_type = 'chat' }) => {
    const data = await apiPost('/nayakai/chat', { query, context, task_type })
    return {
      content: [{ type: 'text', text: data.response || JSON.stringify(data, null, 2) }],
    }
  }
)

// Tool: SentinelPulse alerts
server.tool(
  'sentinel_alerts',
  'Get real-time SentinelPulse ward-level sentiment alerts. Returns critical or warning wards.',
  {
    severity: z.enum(['critical', 'warning', 'all']).optional().describe('Filter by severity (default: all)'),
  },
  async ({ severity = 'all' }) => {
    const data = await apiGet('/sentinel/alerts')
    const alerts = Array.isArray(data) ? data : (data.alerts || [])
    const filtered = severity === 'all' ? alerts : alerts.filter(a => a.severity === severity)
    return {
      content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }],
    }
  }
)

// Tool: grievance status
server.tool(
  'grievance_status',
  'Get the current status and timeline of a specific grievance by its ID.',
  {
    id: z.string().describe('Grievance ID (UUID)'),
  },
  async ({ id }) => {
    const data = await apiGet(`/grievances/${id}`)
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    }
  }
)

// ── Express HTTP layer ────────────────────────────────────────────────────────

const app = express()
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', server: 'praja-mcp', version: '1.0.0', backend: BACKEND_URL })
})

// MCP endpoint – stateless: new transport per request
app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  res.on('close', () => transport.close())
  try {
    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: String(err) })
  }
})

// GET /mcp – SSE stream (for clients that prefer SSE)
app.get('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  res.on('close', () => transport.close())
  try {
    await server.connect(transport)
    await transport.handleRequest(req, res)
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: String(err) })
  }
})

app.listen(PORT, () => {
  console.log(`✅ PRAJA MCP Server running at http://localhost:${PORT}/mcp`)
  console.log(`   Backend: ${BACKEND_URL}`)
})
