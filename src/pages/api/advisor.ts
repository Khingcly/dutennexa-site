import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

// Runs as a Vercel serverless function (not pre-rendered).
export const prerender = false;

const MODEL = 'claude-opus-4-8';
const MAX_MESSAGES = 12;
const MAX_CHARS = 2000;

// Best-effort per-IP rate limiting. Serverless instances are ephemeral, so this
// caps abuse per warm instance rather than globally. Pair with a platform-level
// limit (or a KV store) for hard guarantees on a busy site.
const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

const SYSTEM_PROMPT = `You are the Automation Advisor for Duten Nexa, a consultancy that builds operating systems for growing 5-200 person companies: a ClickUp command center, Make automations, live dashboards, and AI agents.

A visitor has described an operational bottleneck. Give them one concrete, tailored automation direction.

Voice: direct (state the problem plainly), practical (a concrete takeaway), confident (an expert, not a vendor pitching), accessible (plain business language, zero jargon).

Rules:
- Keep it under 160 words. Lead with the fix, not a preamble.
- Name the specific layer that solves it (ClickUp, Make, dashboards, or AI agents) and what it would connect or automate.
- Only reference these approved outcome figures if relevant: up to 75% less manual reporting, up to 80% fewer repetitive tasks, 5-day audit turnaround. Never invent other metrics, prices, client names, or guarantees.
- End by pointing them to book a 5-day Automation Audit to get a costed plan.
- If the message is off-topic (not about business operations, workflows, tools, or automation), briefly and politely steer back to operational bottlenecks. Do not answer unrelated questions.
- You are an AI assistant. Do not claim to be a human team member.
- Do not use the em dash character; use commas or hyphens.`;

const BOOKING_FALLBACK =
  "I couldn't reach the advisor just now. You can still book a free 5-day Automation Audit and we'll map your biggest time and money leaks in person: email admin@dutennexa.com or head to the audit page.";

type Msg = { role: 'user' | 'assistant'; content: string };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Validate payload
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  const raw = (payload as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) {
    return json({ error: 'Invalid request.' }, 400);
  }

  const messages: Msg[] = [];
  for (const m of raw) {
    const role = (m as Msg)?.role;
    const content = (m as Msg)?.content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') {
      return json({ error: 'Invalid request.' }, 400);
    }
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > MAX_CHARS) {
      return json({ error: 'Message is empty or too long.' }, 400);
    }
    messages.push({ role, content: trimmed });
  }
  if (messages[0].role !== 'user') {
    return json({ error: 'Invalid request.' }, 400);
  }

  // Rate limit
  let ip = 'unknown';
  try {
    ip = clientAddress || 'unknown';
  } catch {
    // clientAddress can throw on prerendered contexts; ignore
  }
  if (rateLimited(ip)) {
    return json(
      { reply: "You've sent a lot of messages in a short window. Give it a minute, then try again, or just book an audit and we'll dig in properly.", fallback: true },
      429
    );
  }

  // Graceful fallback if the key isn't configured
  const apiKey = import.meta.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ reply: BOOKING_FALLBACK, fallback: true });
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });
    const reply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return json({ reply: reply || BOOKING_FALLBACK, fallback: !reply });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return json({ reply: 'The advisor is busy right now. Try again in a moment, or book an audit and a human will take it from here.', fallback: true }, 503);
    }
    console.error('advisor error', err);
    return json({ reply: BOOKING_FALLBACK, fallback: true }, 502);
  }
};
