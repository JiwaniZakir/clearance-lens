import { describe, it, expect, vi, afterEach } from "vitest";
import { getCosignPublicProfile, parseCosignPath } from "@/lib/cosign/client";

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

describe("parseCosignPath", () => {
  it("accepts a bare path and normalizes a leading slash onto it", () => {
    expect(parseCosignPath("sytses")).toBe("/sytses");
    expect(parseCosignPath("/sytses")).toBe("/sytses");
  });
  it("accepts a path with Cosign's own category segment", () => {
    expect(parseCosignPath("x/esk3nder")).toBe("/x/esk3nder");
  });
  it("extracts the path from a full cosign.co URL", () => {
    expect(parseCosignPath("https://cosign.co/sytses")).toBe("/sytses");
    expect(parseCosignPath("https://cosign.co/x/esk3nder")).toBe("/x/esk3nder");
  });
  it("rejects an empty or invalid-char string", () => {
    expect(() => parseCosignPath("")).toThrow();
    expect(() => parseCosignPath("not a path!")).toThrow();
  });
});

function page(items: Array<{ path: string; name: string; description: string | null; imageUrl: string | null; updatedAt: number }>, nextCursor: string | null) {
  return new Response(JSON.stringify({ items, nextCursor }), { status: 200 });
}

describe("getCosignPublicProfile", () => {
  it("finds a profile on the first page and maps Cosign's thin fields honestly", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      page(
        [{ path: "/sytses", name: "Sid Sijbrandij", description: "@sytses", imageUrl: "https://x/img.jpg", updatedAt: 123 }],
        null,
      ),
    ) as unknown as typeof fetch;

    const { entry, searchExhausted } = await getCosignPublicProfile("sytses");
    expect(entry).not.toBeNull();
    expect(entry?.login).toBe("sytses");
    expect(entry?.name).toBe("Sid Sijbrandij");
    expect(entry?.bio).toBe("@sytses");
    expect(entry?.profileUrl).toBe("https://cosign.co/sytses");
    expect(entry?.followers).toBeNull();
    expect(entry?.publicRepoCount).toBe(0);
    expect(searchExhausted).toBe(false);
  });

  it("follows nextCursor across sparse (even empty) pages until it finds a match", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(page([], "cursor-1")) // a real, documented Cosign behavior: empty page, more to come
      .mockResolvedValueOnce(page([{ path: "/x/esk3nder", name: "Eskender", description: "@esk3nder", imageUrl: null, updatedAt: 1 }], null));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { entry } = await getCosignPublicProfile("/x/esk3nder");
    expect(entry?.login).toBe("x/esk3nder");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports searchExhausted:true when nextCursor reaches null without a match (confirmed absent, not just unsearched)", async () => {
    global.fetch = vi.fn().mockResolvedValue(page([{ path: "/someone-else", name: "x", description: null, imageUrl: null, updatedAt: 1 }], null)) as unknown as typeof fetch;

    const { entry, searchExhausted } = await getCosignPublicProfile("nobody-with-this-path");
    expect(entry).toBeNull();
    expect(searchExhausted).toBe(true);
  });

  it("reports searchExhausted:false when the page-count bound is hit before nextCursor goes null (incomplete, not confirmed absent)", async () => {
    // mockImplementation (not mockResolvedValue reusing one Response) -- a
    // Response body can only be read once, and this path calls fetch many
    // times against the bound.
    global.fetch = vi.fn().mockImplementation(() => Promise.resolve(page([], "always-more"))) as unknown as typeof fetch; // nextCursor never null

    const { entry, searchExhausted } = await getCosignPublicProfile("needle");
    expect(entry).toBeNull();
    expect(searchExhausted).toBe(false);
  });
});
