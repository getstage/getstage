import type { ActionCtx } from "../../_generated/server";
import { libraryFetch } from "./libraryFetch";

// Calling a tool on a design library's MCP server (Mobbin, Details) and reading its answer.

export type Json = unknown;
export type JsonObject = Record<string, Json>;

export function isObject(value: Json): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The library can't be used for this user right now: not connected, signed out (401), out of credits (402)
 * or over its limit (429). Research then runs without UI pattern references instead of failing.
 */
export class LibraryUnavailableError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

export type LibraryServer = { label: string; url: string; token: string };

/** Calls one tool with the user's token; the server may answer as JSON or as an event stream. */
export async function callLibraryTool(ctx: Pick<ActionCtx, "runAction">, server: LibraryServer, name: string, args: JsonObject): Promise<Json> {
  const response = await libraryFetch(ctx, server.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${server.token}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name, arguments: args } }),
  });
  if ([401, 402, 429].includes(response.status)) throw new LibraryUnavailableError(`${server.label} refused the search (status ${response.status}).`, response.status);
  if (!response.ok) throw new Error(`${server.label} request failed with status ${response.status}.`);
  const text = await response.text();
  const json = text.trimStart().startsWith("{") ? text : text.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5)).pop();
  const body = (json ? JSON.parse(json) : {}) as { result?: Json; error?: { message?: string } };
  if (body.error) throw new Error(`${server.label} tool call failed: ${body.error.message ?? "unknown error"}`);
  if (isObject(body.result) && body.result.isError === true) {
    const message = Array.isArray(body.result.content) && isObject(body.result.content[0]) ? String(body.result.content[0].text ?? "") : "";
    throw new Error(`${server.label} tool call failed: ${message.slice(0, 200) || "unknown error"}`);
  }
  return body.result ?? null;
}

/** MCP tool results put JSON in `structuredContent` or in text content; returns that JSON. */
export function unwrapToolResult(raw: Json): Json {
  if (!isObject(raw)) return raw;
  if ("structuredContent" in raw) return raw.structuredContent;
  if ("result" in raw) return unwrapToolResult(raw.result);
  if (Array.isArray(raw.content)) {
    const text = raw.content.map((item) => (isObject(item) && item.type === "text" && typeof item.text === "string" ? item.text : "")).join("").trim();
    if (text) {
      try {
        return JSON.parse(text) as Json;
      } catch {
        // Not JSON; fall through.
      }
    }
  }
  return raw;
}

export function stringField(value: JsonObject, keys: string[]) {
  for (const key of keys) {
    const field = value[key];
    if (typeof field === "string" && field.trim()) return field.trim();
    if (typeof field === "number") return String(field);
  }
  return undefined;
}
