import { z } from "zod";
import { SourceRefSchema } from "@/lib/tools/wrap";
import timelinesJson from "@/data/timelines.json";

const InvestigationStatsSchema = z.object({
  medianDays: z.number().nullable(),
  meanDays: z.number().nullable(),
  source: SourceRefSchema,
  notes: z.string(),
});

export const ModifierSchema = z.object({
  id: z.string(),
  appliesTo: z.array(z.enum(["secret", "ts"])),
  effectDescription: z.string(),
  typicalDaysMin: z.number().nullable(),
  typicalDaysMax: z.number().nullable(),
  source: SourceRefSchema,
});
export type Modifier = z.infer<typeof ModifierSchema>;

const TimelinesFileSchema = z.object({
  lastVerified: z.string(),
  investigations: z.object({ secret: InvestigationStatsSchema, ts: InvestigationStatsSchema }),
  modifiers: z.array(ModifierSchema),
});

const parsed = TimelinesFileSchema.parse(timelinesJson);

export const TIMELINES = parsed;
export const TIMELINES_LAST_VERIFIED: string = parsed.lastVerified;

export function findModifier(id: string): Modifier | undefined {
  return TIMELINES.modifiers.find((m) => m.id === id);
}
