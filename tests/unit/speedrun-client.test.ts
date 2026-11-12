import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { searchJobs, getJob, SpeedrunApiError } from "@/lib/speedrun/client";

const originalFetch = global.fetch;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.useRealTimers();
});

describe("speedrun client", () => {
  it("attaches the source param and never the user's literal query as an upstream identifier field", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ total: 0, page: 0, page_size: 50, total_pages: 0, has_more: false, next_page: null, jobs: [] }), {
        status: 200,
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await searchJobs({ q: "autonomy", industry: "defense_space" });

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("source")).toBe("clearance-lens");
    expect(calledUrl.searchParams.get("q")).toBe("autonomy");
    expect(calledUrl.pathname).toBe("/api/v1/jobs");
  });

  it("retries on 429 then succeeds", async () => {
    const ok = new Response(
      JSON.stringify({ job: { id: "x", title: "t" } }),
      { status: 200 },
    );
    const rateLimited = new Response(null, { status: 429, headers: { "retry-after": "0" } });
    const fetchMock = vi.fn().mockResolvedValueOnce(rateLimited).mockResolvedValueOnce(ok);
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = getJob("x");
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.job.id).toBe("x");
  });

  it("throws SpeedrunApiError with the upstream error code/message on non-2xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "not_found", message: "Job not found" } }), {
        status: 404,
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(getJob("missing")).rejects.toMatchObject({
      name: "SpeedrunApiError",
      status: 404,
      code: "not_found",
      message: "Job not found",
    });
  });

  it("retries a 5xx a bounded number of times, then falls back to a generic message when the error body isn't JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("<html>502</html>", { status: 502 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = expect(getJob("x")).rejects.toBeInstanceOf(SpeedrunApiError);
    await vi.runAllTimersAsync();
    await promise;
    expect(fetchMock).toHaveBeenCalledTimes(3); // MAX_RETRIES, confirmed bounded rather than infinite
  });

  it("retries a transient 500 and succeeds once the upstream recovers (reproduces a real failure seen live against the Speedrun API)", async () => {
    const serverError = new Response(null, { status: 500 });
    const ok = new Response(JSON.stringify({ job: { id: "y" } }), { status: 200 });
    const fetchMock = vi.fn().mockResolvedValueOnce(serverError).mockResolvedValueOnce(ok);
    global.fetch = fetchMock as unknown as typeof fetch;

    const promise = getJob("y");
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.job.id).toBe("y");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
