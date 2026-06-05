/**
 * AI Credential Agent — Anthropic Claude + Tatum MCP server
 *
 * Flow for buildCredential():
 *  1. Connect to @tatumio/blockchain-mcp via stdio MCP transport
 *  2. Fetch available tools from the Tatum MCP server
 *  3. Start an agentic loop with Claude (claude-sonnet-4-6):
 *     – Send file bytes (vision for images) + tool definitions
 *     – Claude MUST call check_malicious_address on the creator address
 *     – Execute each tool_use block via the MCP client
 *     – Continue until Claude returns final JSON
 *  4. Parse + return Credential
 *
 * Flow for explainDiff():
 *  Single-shot Claude call with both image bytes → string[] of visible changes.
 */
import Anthropic from '@anthropic-ai/sdk';
import { Client as McpClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Tool as McpTool } from '@modelcontextprotocol/sdk/types.js';
import type { Credential, AiOrigin } from './types.js';
import { checkMaliciousAddress } from './tatum.js';

// ── Anthropic client ──────────────────────────────────────────────────────────

function getAnthropic(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey: key });
}

// ── Tatum MCP client lifecycle ────────────────────────────────────────────────

interface McpSession {
  client: McpClient;
  tools: McpTool[];
  close: () => Promise<void>;
}

async function openMcpSession(): Promise<McpSession> {
  const tatumKey = process.env.TATUM_API_KEY;
  if (!tatumKey) throw new Error('TATUM_API_KEY is not set');

  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['--yes', '@tatumio/blockchain-mcp'],
    env: { ...process.env, TATUM_API_KEY: tatumKey },
  });

  const client = new McpClient(
    { name: 'veris-backend', version: '0.1.0' },
    { capabilities: {} },
  );

  await client.connect(transport);

  const { tools } = await client.listTools();

  return {
    client,
    tools,
    close: () => client.close(),
  };
}

/** Convert an MCP tool to the shape Anthropic SDK expects */
function mcpToolToAnthropic(t: McpTool): Anthropic.Tool {
  return {
    name: t.name,
    description: t.description ?? '',
    input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
  };
}

/** Execute a tool_use block via the MCP client */
async function callMcpTool(
  session: McpSession,
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  const result = await session.client.callTool({ name, arguments: input });
  const content = result.content;
  if (Array.isArray(content)) {
    return content.map(c => ('text' in c ? c.text : JSON.stringify(c))).join('\n');
  }
  return JSON.stringify(content);
}

// ── Agentic loop ──────────────────────────────────────────────────────────────

const CREDENTIAL_SYSTEM = `You are an AI content credential analyzer for Veris, a decentralized provenance platform.

Your task: analyze the provided file and creator wallet address, then return a JSON content credential.

Rules:
1. You MUST call the check_malicious_address tool with the creator's wallet address before returning.
2. For images, examine artifacts, noise patterns, and visual characteristics to assess origin.
3. For other files, analyze structure and metadata.
4. Return ONLY a JSON object — no markdown, no prose, no code fences.

Required JSON shape (exactly):
{
  "description": "<1-3 sentence analysis>",
  "tags": ["<tag1>", "<tag2>"],
  "aiOrigin": "likely-camera" | "possibly-ai" | "unknown",
  "metadata": { "<key>": "<value>" },
  "addressScreen": { "malicious": <boolean>, "source": "<string>" }
}`;

/**
 * Build an AI content credential for a file.
 * Uses Tatum REST for address screening + Claude for file analysis.
 * (The stdio MCP server hangs in production environments — we use the REST fallback directly.)
 */
export async function buildCredential(
  bytes: Buffer,
  mediaType: string,
  creator: string,
  extraMeta: Record<string, unknown> = {},
): Promise<Credential> {
  const anthropic = getAnthropic();
  return buildCredentialFallback(anthropic, bytes, mediaType, creator, extraMeta);
}

async function buildCredentialViaMcp(
  anthropic: Anthropic,
  session: McpSession,
  bytes: Buffer,
  mediaType: string,
  creator: string,
  extraMeta: Record<string, unknown>,
): Promise<Credential> {
  const tools = session.tools.map(mcpToolToAnthropic);

  const userContent: Anthropic.MessageParam['content'] = [];

  // Vision: include image for image types
  if (mediaType.startsWith('image/') && bytes.length < 5 * 1024 * 1024) {
    const ext = mediaType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpeg';
    const validTypes = ['jpeg', 'png', 'gif', 'webp'] as const;
    type ImgType = typeof validTypes[number];
    const imgType: ImgType = validTypes.includes(ext as ImgType) ? (ext as ImgType) : 'jpeg';
    userContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: `image/${imgType}`,
        data: bytes.toString('base64'),
      },
    });
  }

  userContent.push({
    type: 'text',
    text: `Analyze this file and generate a content credential.
Creator address: ${creator}
Media type: ${mediaType}
File size: ${bytes.length} bytes
Extra metadata: ${JSON.stringify(extraMeta)}

Remember: call check_malicious_address with the creator address, then return the JSON credential.`,
  });

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userContent }];

  // Agentic loop
  for (let turn = 0; turn < 6; turn++) {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: CREDENTIAL_SYSTEM,
      tools,
      messages,
    });

    // Collect tool calls
    const toolUses = resp.content.filter(b => b.type === 'tool_use');
    const textBlocks = resp.content.filter(b => b.type === 'text');

    if (toolUses.length === 0) {
      // No more tool calls — parse final JSON from text
      const text = textBlocks.map(b => (b as Anthropic.TextBlock).text).join('');
      return parseCredential(text);
    }

    // Execute tool calls
    messages.push({ role: 'assistant', content: resp.content });
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolUses) {
      if (block.type !== 'tool_use') continue;
      const result = await callMcpTool(session, block.name, block.input as Record<string, unknown>);
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  throw new Error('Agent: agentic loop exceeded max turns');
}

/** Fallback: use Tatum REST directly + Claude without MCP tools */
async function buildCredentialFallback(
  anthropic: Anthropic,
  bytes: Buffer,
  mediaType: string,
  creator: string,
  extraMeta: Record<string, unknown>,
): Promise<Credential> {
  // Call Tatum directly for address screening
  const screen = await checkMaliciousAddress(creator);

  const userContent: Anthropic.MessageParam['content'] = [];

  if (mediaType.startsWith('image/') && bytes.length < 5 * 1024 * 1024) {
    const ext = mediaType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpeg';
    const validTypes = ['jpeg', 'png', 'gif', 'webp'] as const;
    type ImgType = typeof validTypes[number];
    const imgType: ImgType = validTypes.includes(ext as ImgType) ? (ext as ImgType) : 'jpeg';
    userContent.push({
      type: 'image',
      source: { type: 'base64', media_type: `image/${imgType}`, data: bytes.toString('base64') },
    });
  }

  userContent.push({
    type: 'text',
    text: `Analyze this file.
Creator: ${creator}
Media type: ${mediaType}
File size: ${bytes.length} bytes
Extra metadata: ${JSON.stringify(extraMeta)}
Address screen result (from Tatum): ${JSON.stringify(screen)}

Return ONLY the JSON credential (no prose, no fences):
{
  "description": "...",
  "tags": [...],
  "aiOrigin": "likely-camera"|"possibly-ai"|"unknown",
  "metadata": {...},
  "addressScreen": { "malicious": ${screen.malicious}, "source": "${screen.source}" }
}`,
  });

  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: CREDENTIAL_SYSTEM,
    messages: [{ role: 'user', content: userContent }],
  });

  const text = resp.content
    .filter(b => b.type === 'text')
    .map(b => (b as Anthropic.TextBlock).text)
    .join('');

  return parseCredential(text);
}

function parseCredential(text: string): Credential {
  // Strip any accidental markdown fences
  const clean = text.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(clean) as Partial<Credential>;
    return {
      description: parsed.description ?? 'Content credential generated by Veris AI agent.',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      aiOrigin: (['likely-camera', 'possibly-ai', 'unknown'].includes(parsed.aiOrigin ?? '')
        ? parsed.aiOrigin
        : 'unknown') as AiOrigin,
      metadata: parsed.metadata ?? {},
      addressScreen: parsed.addressScreen ?? { malicious: false, source: 'unknown' },
    };
  } catch {
    return {
      description: text.slice(0, 300),
      tags: [],
      aiOrigin: 'unknown',
      metadata: {},
      addressScreen: { malicious: false, source: 'parse-error' },
    };
  }
}

// ── Diff explanation ──────────────────────────────────────────────────────────

/**
 * Given two image buffers (original, modified), return an array of
 * human-readable change descriptions.
 */
export async function explainDiff(
  originalBytes: Buffer,
  submittedBytes: Buffer,
  mediaType = 'image/jpeg',
): Promise<string[]> {
  const anthropic = getAnthropic();

  const isImage = mediaType.startsWith('image/');
  const ext = mediaType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpeg';
  const validTypes = ['jpeg', 'png', 'gif', 'webp'] as const;
  type ImgType = typeof validTypes[number];
  const imgType: ImgType = validTypes.includes(ext as ImgType) ? (ext as ImgType) : 'jpeg';

  const content: Anthropic.MessageParam['content'] = [];

  if (isImage && originalBytes.length < 4 * 1024 * 1024) {
    content.push({ type: 'text', text: 'Original file:' });
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: `image/${imgType}`, data: originalBytes.toString('base64') },
    });
  }

  if (isImage && submittedBytes.length < 4 * 1024 * 1024) {
    content.push({ type: 'text', text: 'Modified file:' });
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: `image/${imgType}`, data: submittedBytes.toString('base64') },
    });
  }

  content.push({
    type: 'text',
    text: 'List the visible differences between these two files as a JSON array of short strings. Return ONLY the JSON array, no prose.',
  });

  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content }],
  });

  const text = resp.content
    .filter(b => b.type === 'text')
    .map(b => (b as Anthropic.TextBlock).text)
    .join('');

  try {
    const clean = text.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
    const arr = JSON.parse(clean) as unknown;
    if (Array.isArray(arr)) return arr.map(String);
  } catch { /* ignore */ }

  // If parse fails, split by newline
  return text.split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean).slice(0, 8);
}
