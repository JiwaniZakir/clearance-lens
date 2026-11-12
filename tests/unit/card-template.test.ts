import { describe, it, expect } from "vitest";
import { fillCardTemplate, parseCard } from "@/lib/card-template";
import type { CardTemplateField } from "@/lib/try-tool-types";

const FIELDS: CardTemplateField[] = [
  { name: "headline", label: "Headline", placeholder: "{{headline}}", kind: "text", guidance: "" },
  { name: "highlights", label: "Highlights", placeholder: "{{highlights}}", kind: "list", guidance: "" },
  { name: "notes", label: "Notes", placeholder: "{{notes}}", kind: "text", guidance: "" },
];
const TEMPLATE = "# Intro card — Engineer at Acme\n\n**Headline:** {{headline}}\n**Highlights:**\n{{highlights}}\n**Notes:** {{notes}}\n\nInterested in: [Engineer](https://example.com/jobs/1)";

describe("fillCardTemplate (D-047: the values never leave the user's side)", () => {
  it("fills text and list fields, and drops a field the user left blank", () => {
    const md = fillCardTemplate(TEMPLATE, FIELDS, { headline: "Backend engineer", highlights: ["Shipped RTOS firmware", "Rust"] });
    expect(md).toContain("**Headline:** Backend engineer");
    expect(md).toContain("**Highlights:**\n- Shipped RTOS firmware\n- Rust");
    expect(md).not.toContain("{{");
    expect(md).not.toContain("**Notes:**");
  });

  it("renders as structured blocks, with every value kept as plain text", () => {
    const md = fillCardTemplate(TEMPLATE, FIELDS, { headline: "<img src=x onerror=alert(1)>", highlights: ["a"] });
    const blocks = parseCard(md);
    expect(blocks[0]).toEqual({ type: "heading", text: "Intro card — Engineer at Acme" });
    expect(blocks).toContainEqual({ type: "field", label: "Headline", value: "<img src=x onerror=alert(1)>" });
    expect(blocks).toContainEqual({ type: "list", label: "Highlights", items: ["a"] });
    expect(blocks.at(-1)).toEqual({ type: "link", prefix: "Interested in: ", text: "Engineer", url: "https://example.com/jobs/1" });
  });
});
