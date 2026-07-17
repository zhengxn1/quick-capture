import { encryptQueuePayload, secureTokenEquals } from "./crypto";
import type { Env, QueuedEnvelope, RelayMessage } from "./types";

const MESSAGE_PREFIX = "msg:";

function headers(): Headers {
  return new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: headers() });
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function bearerToken(request: Request): string {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
}

function isClientAuthorized(request: Request, env: Env): boolean {
  return secureTokenEquals(env.CLIENT_TOKEN, bearerToken(request));
}

function isCaptureAuthorized(
  request: Request,
  env: Env,
  suppliedToken: string,
): boolean {
  return secureTokenEquals(
    env.MOBILE_CAPTURE_TOKEN,
    bearerToken(request) || suppliedToken,
  );
}

async function enqueue(env: Env, message: RelayMessage): Promise<string> {
  const timestamp = String(message.createTime).padStart(12, "0");
  const key = `${MESSAGE_PREFIX}${timestamp}:${message.id}`;
  const envelope = encryptQueuePayload(message, env.SYNC_ENCRYPTION_KEY);
  const expiresAt = message.createTime + positiveInteger(env.QUEUE_TTL_SECONDS, 604800);
  await env.CAPTURE_DB.prepare(
    "INSERT INTO messages (id, created_at, expires_at, iv, ciphertext) VALUES (?, ?, ?, ?, ?)",
  ).bind(key, message.createTime, expiresAt, envelope.iv, envelope.ciphertext).run();
  return key;
}

async function capture(request: Request, env: Env): Promise<Response> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "content_type_must_be_json" }, 415);
  }

  const payload = (await request.json()) as {
    token?: unknown;
    content?: unknown;
    url?: unknown;
    title?: unknown;
  };
  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  if (!isCaptureAuthorized(request, env, token)) {
    return json({ error: "unauthorized" }, 401);
  }

  const content = typeof payload.content === "string" ? payload.content.trim() : "";
  const suppliedUrl = typeof payload.url === "string" ? payload.url.trim() : "";
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  if (!content && !suppliedUrl) {
    return json({ error: "content_or_url_required" }, 400);
  }
  if (content.length > 100_000 || suppliedUrl.length > 4_096 || title.length > 200) {
    return json({ error: "capture_too_large" }, 413);
  }

  const contentIsUrl = /^https?:\/\/\S+$/i.test(content);
  const url = suppliedUrl || (contentIsUrl ? content : "");
  if (url && !/^https?:\/\/\S+$/i.test(url)) {
    return json({ error: "invalid_url" }, 400);
  }

  const message: RelayMessage = {
    id: `mobile-${crypto.randomUUID()}`,
    createTime: Math.floor(Date.now() / 1000),
    msgType: url ? "link" : "text",
    source: "手机快捷指令",
    ...(url
      ? {
          url,
          title: title || "手机分享链接",
          ...(content && !contentIsUrl ? { description: content } : {}),
        }
      : { content }),
  };
  return json({ accepted: true, id: await enqueue(env, message) }, 201);
}

async function listQueue(env: Env): Promise<QueuedEnvelope[]> {
  const now = Math.floor(Date.now() / 1000);
  await env.CAPTURE_DB.prepare("DELETE FROM messages WHERE expires_at <= ?").bind(now).run();
  const result = await env.CAPTURE_DB.prepare(
    "SELECT id, iv, ciphertext FROM messages ORDER BY id LIMIT 500",
  ).all<QueuedEnvelope>();
  return result.results;
}

async function api(request: Request, env: Env): Promise<Response> {
  if (!isClientAuthorized(request, env)) {
    return json({ error: "unauthorized" }, 401);
  }
  const path = new URL(request.url).pathname;
  if (request.method === "GET" && path === "/api/status") {
    const pending = await env.CAPTURE_DB.prepare(
      "SELECT id FROM messages WHERE expires_at > ? LIMIT 1",
    ).bind(Math.floor(Date.now() / 1000)).first<{ id: string }>();
    return json({ ownerBound: true, hasPending: Boolean(pending) });
  }
  if (request.method === "GET" && path === "/api/messages") {
    return json({ messages: await listQueue(env) });
  }
  if (request.method === "POST" && path === "/api/ack") {
    const payload = (await request.json()) as { ids?: unknown };
    if (!Array.isArray(payload.ids)) return json({ error: "invalid_ids" }, 400);
    const ids = payload.ids.filter(
      (id): id is string =>
        typeof id === "string" && id.startsWith(MESSAGE_PREFIX) && id.length < 256,
    );
    if (ids.length > 0) {
      const placeholders = ids.map(() => "?").join(",");
      await env.CAPTURE_DB.prepare(`DELETE FROM messages WHERE id IN (${placeholders})`)
        .bind(...ids)
        .run();
    }
    return json({ deleted: ids.length });
  }
  return json({ error: "not_found" }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const path = new URL(request.url).pathname;
      if (request.method === "GET" && path === "/health") {
        return json({ ok: true, service: "quick-capture" });
      }
      if (request.method === "POST" && path === "/api/mobile-capture") {
        return await capture(request, env);
      }
      if (path.startsWith("/api/")) return await api(request, env);
      return json({ error: "not_found" }, 404);
    } catch (error) {
      console.error("quick_capture_request_failed", error instanceof Error ? error.message : "unknown");
      return json({ error: "internal_error" }, 500);
    }
  },
};
