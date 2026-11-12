import { afterEach, describe, expect, test, vi } from "vitest";
import { downloadImage, parsePublicImageUrl } from "../convex/lib/references/imageUrl";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

afterEach(() => vi.unstubAllGlobals());

describe("image links for the moodboard", () => {
  test("public hosts pass, including names that start like private IPv6 prefixes", () => {
    for (const url of ["https://cdn.example.com/a.png", "https://fd.example.com/a.png", "https://fc.example.com/a.png", "https://fe80.example.com/a.png"]) {
      expect(parsePublicImageUrl(url).hostname).toBe(new URL(url).hostname);
    }
  });

  test("local and private addresses are refused", () => {
    for (const url of ["http://localhost/a.png", "http://127.0.0.1/a.png", "http://10.0.0.1/a.png", "http://192.168.1.1/a.png", "http://[::1]/a.png", "http://[fd00::1]/a.png", "http://[fe80::1]/a.png", "http://[::ffff:127.0.0.1]/a.png"]) {
      expect(() => parsePublicImageUrl(url), url).toThrow("That image URL is not allowed.");
    }
  });

  test("a redirect to a private address is refused", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 302, headers: { Location: "http://127.0.0.1/secret.png" } })));
    await expect(downloadImage("https://cdn.example.com/a.png")).rejects.toThrow("That image URL is not allowed.");
  });

  test("a redirect to a public image is followed", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: URL) =>
      url.hostname === "cdn.example.com"
        ? new Response(null, { status: 301, headers: { Location: "https://images.example.com/a.png" } })
        : new Response(PNG)));
    await expect(downloadImage("https://cdn.example.com/a.png")).resolves.toMatchObject({ mimeType: "image/png", bytes: PNG });
  });

  test("a body over 10 MB without Content-Length stops downloading", async () => {
    let sent = 0;
    const chunk = new Uint8Array(1024 * 1024);
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += 1;
        controller.enqueue(chunk);
      },
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(endless)));
    await expect(downloadImage("https://cdn.example.com/a.png")).rejects.toThrow("That image is too large.");
    expect(sent).toBeLessThanOrEqual(12);
  });
});
