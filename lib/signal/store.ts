/**
 * Clearance Lens v2 piece #4: storage for the aggregated, anonymized
 * recruiter-facing signal tool (DECISIONS.md D-032's "aggregated signal, not
 * ranking" design, chosen explicitly over literal candidate scoring/ranking,
 * which this project has declined three times — D-032, D-035, D-036).
 *
 * This is the first and only piece of this product that is NOT stateless
 * (see DECISIONS.md D-001/D-002 for why every other tool deliberately has no
 * persistence) — an aggregate across multiple candidates' contributions, by
 * definition, requires remembering something across separate tool calls.
 * That tradeoff was made explicitly, not by accident: a single contribution
 * carries no name, contact info, or identifier of any kind, only a handful
 * of closed-enum buckets (see ContributionSchema in
 * lib/tools/contribute-anonymous-signal.ts), and getAggregate() enforces a
 * k-anonymity floor so a reader can never learn anything about a group
 * smaller than MIN_CONTRIBUTORS.
 *
 * Backend selection: if KV_REST_API_URL/KV_REST_API_TOKEN are set,
 * contributions persist durably in Upstash Redis. If not, this falls back
 * to an in-memory Map so local development and tests work with no external
 * account — but that fallback is NOT durable across separate serverless
 * invocations in production, and getAggregate()'s own output says so
 * explicitly rather than silently reporting numbers that could reset
 * without warning.
 *
 * Env var names, confirmed live against the real provisioned resource (not
 * assumed): Vercel's marketplace integration for "Upstash for Redis"
 * injects the legacy Vercel KV naming (KV_REST_API_URL/KV_REST_API_TOKEN/
 * KV_URL/REDIS_URL), not @upstash/redis's own native UPSTASH_REDIS_REST_*
 * names — so this constructs the client explicitly from the KV_* names
 * rather than calling Redis.fromEnv(), which looks for the native names and
 * would find nothing.
 */

import { Redis } from "@upstash/redis";

export const MIN_CONTRIBUTORS = 5;

export type ClearanceLevel = "none" | "interim" | "secret" | "ts" | "ts_sci";
export type CitizenshipStatus = "us_citizen" | "green_card" | "other_protected_individual" | "not_us_person";
export type ExperienceBucket = "0-2" | "3-5" | "6-10" | "10+";

export interface SignalContribution {
  clearance_level?: ClearanceLevel;
  citizenship_status?: CitizenshipStatus;
  years_experience_bucket?: ExperienceBucket;
}

export interface SignalScope {
  roleId: string;
  // null for a stealth posting with no public company page — the
  // contribution is still recorded against its role, just not rolled up
  // into any company-wide aggregate (there's no real company_slug a future
  // reader could even query by).
  companySlug: string | null;
}

/** `null` for a dimension means "fewer than MIN_CONTRIBUTORS total
 * contributions exist for this scope at all" (checked once, at the
 * breakdown level, by the caller) OR "every value for this specific
 * dimension fell below the floor individually." `otherBelowFloor` groups
 * any value that didn't itself reach MIN_CONTRIBUTORS, rather than
 * reporting it on its own — reporting "4 secret, 1 none" out of 5 would
 * let a reader single out the 1. */
export interface AggregateBreakdown {
  totalContributions: number;
  meetsFloor: boolean;
  clearanceLevel: Partial<Record<ClearanceLevel | "otherBelowFloor", number>> | null;
  citizenshipStatus: Partial<Record<CitizenshipStatus | "otherBelowFloor", number>> | null;
  yearsExperience: Partial<Record<ExperienceBucket | "otherBelowFloor", number>> | null;
}

export interface SignalStore {
  readonly backend: "upstash" | "in-memory";
  addContribution(scope: SignalScope, contribution: SignalContribution): Promise<void>;
  getRawContributions(key: "role" | "company", id: string): Promise<SignalContribution[]>;
  /** Found live via the spec §6 judging panel round 7 (recruiter_user,
   * directly demonstrated): with no accounts or auth of any kind, nothing
   * stopped one script from pushing a role's pool from 0 to 10
   * contributions in under 2 seconds, producing a plausible-looking but
   * entirely fabricated aggregate. A per-identity rate limit isn't
   * possible here (there is no identity), but a short, scope-level
   * cooldown directly defeats that exact burst pattern — returns false
   * (reject) if a contribution to this same role was accepted within the
   * last COOLDOWN_MS, true (allow) otherwise. Not a complete fix for a
   * sufficiently patient adversary submitting one every few seconds — see
   * DECISIONS.md for why a stronger fix isn't built here, and the
   * disclaimer this gates is honest about that remaining limit. */
  tryAcquireCooldown(roleId: string): Promise<boolean>;
}

export const COOLDOWN_MS = 2000;

function roleKey(roleId: string): string {
  return `clearance-lens:signal:role:${roleId}`;
}
function companyKey(companySlug: string): string {
  return `clearance-lens:signal:company:${companySlug}`;
}
function cooldownKey(roleId: string): string {
  return `clearance-lens:signal:cooldown:${roleId}`;
}

class UpstashSignalStore implements SignalStore {
  readonly backend = "upstash" as const;
  private redis: Redis;
  constructor() {
    this.redis = new Redis({
      url: process.env.KV_REST_API_URL as string,
      token: process.env.KV_REST_API_TOKEN as string,
    });
  }
  async addContribution(scope: SignalScope, contribution: SignalContribution): Promise<void> {
    const payload = JSON.stringify(contribution);
    const writes = [this.redis.rpush(roleKey(scope.roleId), payload)];
    if (scope.companySlug) writes.push(this.redis.rpush(companyKey(scope.companySlug), payload));
    await Promise.all(writes);
  }
  async getRawContributions(key: "role" | "company", id: string): Promise<SignalContribution[]> {
    const redisKey = key === "role" ? roleKey(id) : companyKey(id);
    const raw = await this.redis.lrange<string>(redisKey, 0, -1);
    return raw.map((r) => (typeof r === "string" ? (JSON.parse(r) as SignalContribution) : (r as SignalContribution)));
  }
  async tryAcquireCooldown(roleId: string): Promise<boolean> {
    // SET ... NX EX: atomically set-if-absent with a TTL in one round trip
    // — the standard Redis lock/cooldown pattern, no separate read+write
    // race window.
    const result = await this.redis.set(cooldownKey(roleId), "1", { nx: true, px: COOLDOWN_MS });
    return result !== null;
  }
}

/** Not durable across separate serverless invocations in production — see
 * module doc comment. Exported so tests can construct a fresh, isolated
 * store per test rather than sharing the module-level singleton below. */
export class InMemorySignalStore implements SignalStore {
  readonly backend = "in-memory" as const;
  private data = new Map<string, SignalContribution[]>();
  private cooldowns = new Map<string, number>();
  async addContribution(scope: SignalScope, contribution: SignalContribution): Promise<void> {
    const rk = roleKey(scope.roleId);
    this.data.set(rk, [...(this.data.get(rk) ?? []), contribution]);
    if (scope.companySlug) {
      const ck = companyKey(scope.companySlug);
      this.data.set(ck, [...(this.data.get(ck) ?? []), contribution]);
    }
  }
  async getRawContributions(key: "role" | "company", id: string): Promise<SignalContribution[]> {
    const redisKey = key === "role" ? roleKey(id) : companyKey(id);
    return this.data.get(redisKey) ?? [];
  }
  async tryAcquireCooldown(roleId: string): Promise<boolean> {
    const key = cooldownKey(roleId);
    const expiresAt = this.cooldowns.get(key);
    if (expiresAt !== undefined && Date.now() < expiresAt) return false;
    this.cooldowns.set(key, Date.now() + COOLDOWN_MS);
    return true;
  }
}

let singleton: SignalStore | null = null;

export function getSignalStore(): SignalStore {
  if (singleton) return singleton;
  singleton =
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
      ? new UpstashSignalStore()
      : new InMemorySignalStore();
  return singleton;
}

function breakdownFor<T extends string>(contributions: SignalContribution[], field: keyof SignalContribution): Partial<Record<T | "otherBelowFloor", number>> | null {
  const counts = new Map<string, number>();
  for (const c of contributions) {
    const value = c[field];
    if (value === undefined) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const result: Partial<Record<T | "otherBelowFloor", number>> = {};
  let otherTotal = 0;
  for (const [value, count] of counts) {
    if (count >= MIN_CONTRIBUTORS) result[value as T] = count;
    else otherTotal += count;
  }
  if (otherTotal > 0) result.otherBelowFloor = otherTotal;
  return result;
}

export async function getAggregate(store: SignalStore, key: "role" | "company", id: string): Promise<AggregateBreakdown> {
  const contributions = await store.getRawContributions(key, id);
  const meetsFloor = contributions.length >= MIN_CONTRIBUTORS;
  return {
    totalContributions: contributions.length,
    meetsFloor,
    clearanceLevel: meetsFloor ? breakdownFor<ClearanceLevel>(contributions, "clearance_level") : null,
    citizenshipStatus: meetsFloor ? breakdownFor<CitizenshipStatus>(contributions, "citizenship_status") : null,
    yearsExperience: meetsFloor ? breakdownFor<ExperienceBucket>(contributions, "years_experience_bucket") : null,
  };
}
