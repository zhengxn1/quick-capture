import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import worker from "../src/index";
import { decryptQueuePayloadForTest, encryptQueuePayload } from "../src/crypto";
import type { Env, RelayMessage } from "../src/types";

interface StoredMessage {
  id: string;
  created_at: number;
  expires_at: number;
  iv: string;
  ciphertext: string;
}

class MemoryD1 {
  readonly messages = new Map<string, StoredMessage>();

  prepare(query: string): MemoryStatement {
    return new MemoryStatement(this, query);
  }
}

class MemoryStatement {
  private values: unknown[] = [];

  constructor(private readonly db: MemoryD1, private readonly query: string) {}

  bind(...values: unknown[]): this {
    this.values = values;
    return this;
  }

  async run(): Promise<D1Result> {
    if (this.query.startsWith("INSERT INTO messages")) {
      const [id, createdAt, expiresAt, iv, ciphertext] = this.values as [string, number, number, string, string];
      this.db.messages.set(id, { id, created_at: createdAt, expires_at: expiresAt, iv, ciphertext });
    } else if (this.query.startsWith("DELETE FROM messages WHERE expires_at")) {
      const [now] = this.values as [number];
      for (const [id, message] of this.db.messages) {
        if (message.expires_at <= now) this.db.messages.delete(id);
      }
    } else if (this.query.startsWith("DELETE FROM messages WHERE id IN")) {
      for (const id of this.values as string[]) this.db.messages.delete(id);
    }
    return { success: true, meta: {} } as D1Result;
  }

  async all<T>(): Promise<D1Result<T>> {
    const results = [...this.db.messages.values()]
      .sort((left, right) => left.id.localeCompare(right.id))
      .slice(0, 500)
      .map(({ id, iv, ciphertext }) => ({ id, iv, ciphertext }) as T);
    return { success: true, results, meta: {} } as D1Result<T>;
  }

  async first<T>(): Promise<T | null> {
    const [now] = this.values as [number];
    const message = [...this.db.messages.values()].find((item) => item.expires_at > now);
    return message ? ({ id: message.id } as T) : null;
  }
}

function testEnv(): Env {
  return {
    CAPTURE_DB: new MemoryD1() as unknown as D1Database,
    CLIENT_TOKEN: randomBytes(32).toString("hex"),
    MOBILE_CAPTURE_TOKEN: randomBytes(32).toString("hex"),
    SYNC_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
    QUEUE_TTL_SECONDS: "604800",
  };
}

function clientRequest(env: Env, path: string, method = "GET", body?: unknown): Request {
  return new Request(`https://relay.example${path}`, {
    method,
    headers: {
      authorization: `Bearer ${env.CLIENT_TOKEN}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("Quick Capture relay", () => {
  it("returns a health response without authentication", async () => {
    const response = await worker.fetch(
      new Request("https://relay.example/health"),
      testEnv(),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, service: "quick-capture" });
  });

  it("encrypts captured text before queueing it", async () => {
    const env = testEnv();
    const response = await worker.fetch(
      new Request("https://relay.example/api/mobile-capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: env.MOBILE_CAPTURE_TOKEN, content: "手机随手记录" }),
      }),
      env,
    );
    expect(response.status).toBe(201);

    const queueResponse = await worker.fetch(clientRequest(env, "/api/messages"), env);
    const queue = (await queueResponse.json()) as {
      messages: Array<{ id: string; iv: string; ciphertext: string }>;
    };
    expect(queue.messages).toHaveLength(1);
    expect(queue.messages[0]?.ciphertext).not.toContain("手机随手记录");
    expect(
      decryptQueuePayloadForTest<RelayMessage>(queue.messages[0]!, env.SYNC_ENCRYPTION_KEY),
    ).toMatchObject({ msgType: "text", content: "手机随手记录" });
  });

  it("accepts links and Bearer authentication", async () => {
    const env = testEnv();
    const response = await worker.fetch(
      new Request("https://relay.example/api/mobile-capture", {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.MOBILE_CAPTURE_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ content: "https://example.com" }),
      }),
      env,
    );
    expect(response.status).toBe(201);
  });

  it("rejects unauthorized capture and client requests", async () => {
    const env = testEnv();
    const captureResponse = await worker.fetch(
      new Request("https://relay.example/api/mobile-capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: "not allowed" }),
      }),
      env,
    );
    expect(captureResponse.status).toBe(401);
    expect(
      (await worker.fetch(new Request("https://relay.example/api/messages"), env)).status,
    ).toBe(401);
  });

  it("acknowledges and deletes delivered messages", async () => {
    const env = testEnv();
    const encrypted = encryptQueuePayload({ content: "queued" }, env.SYNC_ENCRYPTION_KEY);
    await env.CAPTURE_DB.prepare(
      "INSERT INTO messages (id, created_at, expires_at, iv, ciphertext) VALUES (?, ?, ?, ?, ?)",
    ).bind("msg:000000000001:test", 1, 9_999_999_999, encrypted.iv, encrypted.ciphertext).run();
    const response = await worker.fetch(
      clientRequest(env, "/api/ack", "POST", { ids: ["msg:000000000001:test"] }),
      env,
    );
    expect(response.status).toBe(200);
    const remaining = await env.CAPTURE_DB.prepare(
      "SELECT id FROM messages WHERE expires_at > ? LIMIT 1",
    ).bind(0).first();
    expect(remaining).toBeNull();
  });
});
