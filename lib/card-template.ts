import type { CardTemplateField, ConsentedFields } from "@/lib/try-tool-types";

/**
 * Fills a prepare_consented_card template with the user's own values, on
 * the user's side (D-047) — the /try playground does here exactly what a
 * user's agent does locally. The server only ever saw the field names.
 * A list field becomes "- item" lines; a blank value drops its line.
 */
export function fillCardTemplate(markdown: string, fields: CardTemplateField[], values: ConsentedFields): string {
  let out = markdown;
  for (const f of fields) {
    const raw = values[f.name];
    const filled =
      f.kind === "list"
        ? (Array.isArray(raw) ? raw : []).map((item) => `- ${item}`).join("\n")
        : typeof raw === "string"
          ? raw.trim()
          : "";
    if (!filled) {
      // Drop the whole line (and a list field's label line) rather than
      // leave an empty label on a card someone is about to send.
      out = out
        .split("\n")
        .filter((line) => !line.includes(f.placeholder) && line !== `**${f.label}:**`)
        .join("\n");
      continue;
    }
    out = out.split(f.placeholder).join(filled);
  }
  return out;
}

export type CardBlock =
  | { type: "heading"; text: string }
  | { type: "field"; label: string; value: string }
  | { type: "list"; label: string; items: string[] }
  | { type: "link"; prefix: string; text: string; url: string }
  | { type: "text"; text: string };

/** Parses a filled card's known markdown shape into blocks the page renders
 *  as plain React text — never as HTML — so a value can't inject markup. */
export function parseCard(markdown: string): CardBlock[] {
  const blocks: CardBlock[] = [];
  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.startsWith("# ")) {
      blocks.push({ type: "heading", text: line.slice(2) });
      continue;
    }
    const listLabel = line.match(/^\*\*(.+):\*\*$/);
    if (listLabel) {
      const items: string[] = [];
      while (i + 1 < lines.length && lines[i + 1].startsWith("- ")) items.push(lines[++i].slice(2));
      blocks.push({ type: "list", label: listLabel[1], items });
      continue;
    }
    const field = line.match(/^\*\*(.+?):\*\*\s(.*)$/);
    if (field) {
      blocks.push({ type: "field", label: field[1], value: field[2] });
      continue;
    }
    const link = line.match(/^(.*?)\[(.+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link) {
      blocks.push({ type: "link", prefix: link[1], text: link[2], url: link[3] });
      continue;
    }
    blocks.push({ type: "text", text: line });
  }
  return blocks;
}
