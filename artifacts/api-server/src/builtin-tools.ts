import { DynamicTool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { evaluate as mathEvaluate } from "mathjs";
import { lookup as dnsLookup } from "node:dns/promises";

if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
  throw new Error("AI_INTEGRATIONS_OPENAI_BASE_URL must be set.");
}
if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
  throw new Error("AI_INTEGRATIONS_OPENAI_API_KEY must be set.");
}

const TOOL_MODEL = "gpt-4o-mini";

function makeChat(opts: { model?: string; jsonMode?: boolean; maxTokens?: number } = {}): ChatOpenAI {
  return new ChatOpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    configuration: { baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL },
    model: opts.model ?? TOOL_MODEL,
    maxCompletionTokens: opts.maxTokens ?? 1024,
    ...(opts.jsonMode ? { modelKwargs: { response_format: { type: "json_object" } } } : {}),
  });
}

export async function callLLM(systemPrompt: string, userContent: string, jsonMode = false): Promise<string> {
  const chat = makeChat({ jsonMode });
  const res = await chat.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ]);
  const content = res.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (typeof c === "string" ? c : "text" in c && typeof c.text === "string" ? c.text : ""))
      .join("");
  }
  return "";
}

export interface BuiltinToolMeta {
  id: string;
  name: string;
  description: string;
  category: string;
}

const META: BuiltinToolMeta[] = [
  {
    id: "web_search",
    name: "Web Search",
    category: "Research",
    description: "Search the web for up-to-date information on any topic. Input: the search query string.",
  },
  {
    id: "summarize",
    name: "Summarize",
    category: "Text",
    description: "Summarize a piece of text or content into key points. Input: the text to summarize.",
  },
  {
    id: "extract_data",
    name: "Extract Data",
    category: "Text",
    description: "Extract structured data (names, dates, numbers, URLs) from text. Input: the text to analyze.",
  },
  {
    id: "write_content",
    name: "Write Content",
    category: "Text",
    description: "Write or draft text content such as emails, reports, or documents. Input: a clear writing prompt.",
  },
  {
    id: "calculate",
    name: "Calculate",
    category: "Math",
    description: "Perform mathematical calculations or data analysis. Input: a math expression or word problem.",
  },
  {
    id: "fetch_url",
    name: "Fetch URL",
    category: "Research",
    description:
      "Fetch a public web page and return its readable text content. Use this AFTER web_search to actually open and read a result. Input: a single http(s):// URL.",
  },
  {
    id: "current_datetime",
    name: "Current Date & Time",
    category: "Utility",
    description:
      "Return the current real-world date and time. Use this whenever you need to know what 'today' or 'now' is — never guess. Input: optional IANA timezone like 'America/Los_Angeles' or 'UTC' (defaults to UTC).",
  },
  {
    id: "call_agent",
    name: "Call Another Agent",
    category: "Composition",
    description:
      'Invoke another Stroodly agent as a sub-task and get its final answer back. Useful for delegating a specialised step (research, formatting, etc.) to a different agent. Input MUST be a JSON object: {"agent": "<agent name or numeric id>", "input": "<task to give that agent>"}.',
  },
];

export const BUILTIN_TOOL_METADATA = META;

const IMPLS: Record<string, (input: string) => Promise<string>> = {
  web_search: async (query) => {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) {
      return `[Web Search Error] The web_search tool is not configured. Set the BRAVE_SEARCH_API_KEY environment variable to enable live web search.`;
    }
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return `[Web Search Error] Brave Search API returned ${response.status}: ${errText.substring(0, 300)}`;
    }
    const data = (await response.json()) as {
      web?: { results?: { title: string; url: string; description: string }[] };
    };
    const results = data.web?.results ?? [];
    if (results.length === 0) return `[Web Search Results for "${query}"]\n\nNo results found.`;
    const formatted = results
      .map((r, i) => `${i + 1}. **${r.title}**\n   URL: ${r.url}\n   ${r.description}`)
      .join("\n\n");
    return `[Web Search Results for "${query}"]\n\n${formatted}`;
  },

  summarize: async (content) => {
    return await callLLM(
      `You are a summarization expert. Summarize the provided content into clear, concise bullet points. Extract the most important ideas, key facts, and main conclusions. Format as:

SUMMARY:
• <Key point 1>
• <Key point 2>
• <Key point 3>
...

CONCLUSION: <1-2 sentence overall takeaway>`,
      content.length > 2000 ? content.substring(0, 2000) + "... [truncated]" : content,
    );
  },

  extract_data: async (text) => {
    const result = await callLLM(
      `You are a data extraction specialist. Extract all structured data from the provided text and return it as a JSON object. Include:
- "entities": named entities (people, organizations, locations)
- "dates": any dates or time references
- "numbers": numerical values with their context
- "urls": any URLs or web addresses
- "key_terms": important keywords or phrases
- "relationships": connections between entities if found

Return ONLY valid JSON.`,
      text.length > 2000 ? text.substring(0, 2000) + "... [truncated]" : text,
      true,
    );
    try {
      const parsed = JSON.parse(result);
      return `[Extracted Data]\n${JSON.stringify(parsed, null, 2)}`;
    } catch {
      return `[Extracted Data]\n${result}`;
    }
  },

  write_content: async (prompt) => {
    const result = await callLLM(
      `You are an expert writer. Generate high-quality, polished written content based on the provided prompt. Adapt your tone and format to match the requested content type (email, report, blog post, etc.). Be thorough, professional, and ready-to-use.`,
      prompt,
    );
    return `[Generated Content]\n\n${result}`;
  },

  calculate: async (expression) => {
    const cleaned = expression.trim();
    try {
      const result = mathEvaluate(cleaned);
      return `[Calculation Result]\nExpression: ${cleaned}\nResult: ${String(result)}`;
    } catch {
      const aiResult = await callLLM(
        `You are a mathematical assistant. Evaluate or analyze the given expression/problem and provide the answer. Show your work step by step.`,
        cleaned,
      );
      return `[Calculation]\n${aiResult}`;
    }
  },

  // ---------------------------------------------------------------------------
  // fetch_url — public web page reader. Pairs with web_search: search finds
  // URLs, fetch_url actually opens them. Hardened against SSRF (private IPs,
  // metadata services), large responses (2 MB cap), and slow servers (10 s).
  // ---------------------------------------------------------------------------
  fetch_url: async (rawInput) => {
    const input = rawInput.trim();
    let parsed: URL;
    try {
      parsed = new URL(input);
    } catch {
      return `[Fetch URL Error] Not a valid URL: ${input}`;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return `[Fetch URL Error] Only http(s) URLs are allowed (got ${parsed.protocol}).`;
    }
    if (await isUnsafeHost(parsed.hostname)) {
      return `[Fetch URL Error] Refusing to fetch ${parsed.hostname} — private, loopback, or metadata-service hosts are blocked for safety.`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    try {
      // Follow redirects manually so we can revalidate the host *before* each
      // hop. Letting fetch follow automatically would issue the next request
      // before our SSRF check ran, which is enough to leak data on
      // metadata-service URLs that respond to GET.
      const MAX_REDIRECTS = 5;
      let currentUrl = parsed;
      let res: Response | undefined;
      for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        res = await fetch(currentUrl.toString(), {
          method: "GET",
          redirect: "manual",
          headers: {
            "User-Agent": "StroodlyAgent/1.0 (+https://stroodly.app)",
            Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
          },
          signal: controller.signal,
        });
        const isRedirect = res.status >= 300 && res.status < 400 && res.headers.get("location");
        if (!isRedirect) break;
        if (hop === MAX_REDIRECTS) {
          return `[Fetch URL Error] Too many redirects (>${MAX_REDIRECTS}) starting from ${parsed.toString()}.`;
        }
        let next: URL;
        try {
          next = new URL(res.headers.get("location")!, currentUrl);
        } catch {
          return `[Fetch URL Error] Bad redirect Location header at ${currentUrl.toString()}.`;
        }
        if (next.protocol !== "http:" && next.protocol !== "https:") {
          return `[Fetch URL Error] Refusing to follow redirect to non-http(s) URL: ${next.toString()}`;
        }
        if (await isUnsafeHost(next.hostname)) {
          return `[Fetch URL Error] Refusing to follow redirect to ${next.hostname} — private, loopback, or metadata-service host.`;
        }
        // Drain the redirect response body so the connection can be reused.
        try { await res.body?.cancel(); } catch { /* noop */ }
        currentUrl = next;
      }
      if (!res) {
        return `[Fetch URL Error] No response from ${parsed.toString()}.`;
      }
      if (!res.ok) {
        return `[Fetch URL Error] ${currentUrl.toString()} returned HTTP ${res.status}.`;
      }
      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      const isText =
        contentType.includes("text/") ||
        contentType.includes("application/xhtml") ||
        contentType.includes("application/json") ||
        contentType.includes("application/xml") ||
        contentType === ""; // some servers omit it
      if (!isText) {
        return `[Fetch URL] ${parsed.toString()} — content-type ${contentType || "unknown"} is not text. Skipping body.`;
      }

      // Read with a hard 2 MB cap so a hostile server can't exhaust memory.
      const MAX_BYTES = 2 * 1024 * 1024;
      const reader = res.body?.getReader();
      if (!reader) {
        return `[Fetch URL Error] ${parsed.toString()} returned an empty body.`;
      }
      const chunks: Uint8Array[] = [];
      let total = 0;
      let truncated = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        if (total + value.length > MAX_BYTES) {
          chunks.push(value.subarray(0, MAX_BYTES - total));
          total = MAX_BYTES;
          truncated = true;
          await reader.cancel().catch(() => {});
          break;
        }
        chunks.push(value);
        total += value.length;
      }
      const buf = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        buf.set(c, offset);
        offset += c.length;
      }
      const raw = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      const isHtml = contentType.includes("html") || /<html[\s>]/i.test(raw.slice(0, 500));
      const title = isHtml ? extractTitle(raw) : "";
      const cleaned = isHtml ? stripHtml(raw) : raw;
      const MAX_TEXT = 8000; // ~2 k tokens — enough to be useful, small enough not to blow context
      const text = cleaned.length > MAX_TEXT
        ? cleaned.slice(0, MAX_TEXT) + "\n\n... [content truncated]"
        : cleaned;
      const header = title ? `[Page: ${title}]\n` : "";
      const sizeNote = truncated ? "\n[Note: response exceeded 2 MB and was truncated.]" : "";
      return `${header}URL: ${res.url}\n\n${text}${sizeNote}`;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return `[Fetch URL Error] Request to ${parsed.toString()} timed out after 10 seconds.`;
      }
      return `[Fetch URL Error] ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  // ---------------------------------------------------------------------------
  // current_datetime — what time is it, really? LLMs hallucinate dates badly,
  // so this is the cheapest correctness fix in the platform. Optional input is
  // an IANA timezone (e.g. "America/Los_Angeles"). Defaults to UTC.
  // ---------------------------------------------------------------------------
  current_datetime: async (rawInput) => {
    const input = (rawInput || "").trim();
    const tz = input || "UTC";
    // Validate the timezone by trying to format with it. Intl throws RangeError
    // on unknown zones, which is the cleanest way to test without a hardcoded list.
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    } catch {
      return `[Current Date/Time Error] Unknown timezone "${tz}". Use an IANA name like "America/Los_Angeles" or "Europe/London".`;
    }
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "short",
    });
    const parts = fmt.formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    // Build an ISO-ish "YYYY-MM-DD HH:MM:SS" in the target TZ for unambiguous parsing.
    const ymd = `${get("year")}-${get("month").padStart(2, "0")}-${get("day").padStart(2, "0")}`;
    const hms = `${get("hour")}:${get("minute")}:${get("second")}`;
    const weekday = get("weekday");
    const tzShort = get("timeZoneName");
    return [
      `[Current Date & Time]`,
      `Timezone: ${tz} (${tzShort})`,
      `Local: ${weekday}, ${ymd} ${hms}`,
      `UTC ISO: ${now.toISOString()}`,
      `Unix epoch (s): ${Math.floor(now.getTime() / 1000)}`,
    ].join("\n");
  },
};

// ---------------------------------------------------------------------------
// fetch_url helpers
// ---------------------------------------------------------------------------

const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^0\.0\.0\.0$/,
  /\.internal$/i,        // *.internal (GCP/AWS service discovery names)
  /\.local$/i,           // mDNS / Bonjour
  /^host\.docker\.internal$/i,
  /^metadata\.google\.internal$/i,
];

const PRIVATE_IP_PATTERNS = [
  /^127\./,              // loopback
  /^10\./,               // RFC1918
  /^192\.168\./,         // RFC1918
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC1918
  /^169\.254\./,         // link-local incl. 169.254.169.254 cloud metadata
  /^::1$/,               // IPv6 loopback
  /^fe80:/i,             // IPv6 link-local
  /^fc/i, /^fd/i,        // IPv6 unique local (fc00::/7)
];

async function isUnsafeHost(hostname: string): Promise<boolean> {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  if (BLOCKED_HOSTNAME_PATTERNS.some((p) => p.test(h))) return true;
  if (PRIVATE_IP_PATTERNS.some((p) => p.test(h))) return true;
  // DNS-rebinding defense: resolve ALL A/AAAA records and reject if ANY of
  // them point to a private/loopback/link-local/metadata range. A single
  // record check is not enough — a hostile resolver can return a mix of
  // public and private addresses, and we don't control which one fetch will
  // pick. `verbatim: true` keeps DNS order and disables Node's reordering.
  try {
    const addrs = await dnsLookup(h, { all: true, verbatim: true });
    if (addrs.length === 0) return true;
    for (const a of addrs) {
      if (PRIVATE_IP_PATTERNS.some((p) => p.test(a.address))) return true;
    }
  } catch {
    return true; // unresolvable → reject rather than fall through
  }
  return false;
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return "";
  return decodeEntities(m[1]).replace(/\s+/g, " ").trim().slice(0, 200);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(br|p|div|li|h[1-6]|tr|hr)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function makeBuiltinTool(id: string): DynamicTool | undefined {
  const meta = META.find((m) => m.id === id);
  const impl = IMPLS[id];
  if (!meta || !impl) return undefined;
  return new DynamicTool({
    name: meta.id,
    description: meta.description,
    func: async (input: string) => {
      try {
        return await impl(typeof input === "string" ? input : JSON.stringify(input));
      } catch (e) {
        return `[${meta.name} Error] ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  });
}

export function rawBuiltinExecute(id: string): ((input: string) => Promise<string>) | undefined {
  return IMPLS[id];
}
