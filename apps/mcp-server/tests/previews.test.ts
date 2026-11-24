import { afterEach, describe, expect, test, vi } from "vitest";
import { preview, screenPictures } from "../src/previews";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const png = () => new Response(PNG, { headers: { "Content-Type": "image/png" } });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("search_references pictures", () => {
  test("each screen with a thumbnail comes back as its numbered title plus the image", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => png()));
    const content = await screenPictures({ screens: [{ title: "Aesop", thumbnailUrl: "https://cdn.example.com/a.png" }, { title: "Seed" }] });
    expect(content).toEqual([
      { type: "text", text: "1. Aesop" },
      { type: "image", data: btoa(String.fromCharCode(...PNG)), mimeType: "image/png" },
    ]);
  });

  test("only the first 8 screens are downloaded", async () => {
    const fetch = vi.fn(async () => png());
    vi.stubGlobal("fetch", fetch);
    const screens = Array.from({ length: 12 }, (_, index) => ({ title: `S${index}`, thumbnailUrl: `https://cdn.example.com/${index}.png` }));
    expect(await screenPictures({ screens })).toHaveLength(16);
    expect(fetch).toHaveBeenCalledTimes(8);
  });

  test("a type the chat can't show, a failed download or an error response is skipped", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x", { headers: { "Content-Type": "image/avif" } })));
    expect(await preview("https://cdn.example.com/a.avif")).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(PNG, { status: 404, headers: { "Content-Type": "image/png" } })));
    expect(await preview("https://cdn.example.com/a.png")).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network"); }));
    expect(await preview("https://cdn.example.com/a.png")).toBeNull();
  });

  test("a body over 2 MB stops downloading and is skipped", async () => {
    let sent = 0;
    const chunk = new Uint8Array(512 * 1024);
    const endless = new ReadableStream<Uint8Array>({ pull(controller) { sent += 1; controller.enqueue(chunk); } });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(endless, { headers: { "Content-Type": "image/png" } })));
    expect(await preview("https://cdn.example.com/big.png")).toBeNull();
    expect(sent).toBeLessThanOrEqual(6);
  });

  test("a stalled host is given up on and the other pictures still return", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((url: string, init: RequestInit) =>
      url.includes("slow")
        ? new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason)))
        : Promise.resolve(png())));
    const pending = screenPictures({ screens: [{ title: "Slow", thumbnailUrl: "https://slow.example.com/a.png" }, { title: "Fast", thumbnailUrl: "https://cdn.example.com/b.png" }] });
    await vi.advanceTimersByTimeAsync(4_000);
    expect((await pending).map((item) => item.type === "text" && item.text).filter(Boolean)).toEqual(["2. Fast"]);
  });
});
