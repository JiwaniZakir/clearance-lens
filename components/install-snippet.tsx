"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Check, Copy, Zap, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { MCP_URL, CLAUDE_CODE_INSTALL_COMMAND } from "@/lib/constants";

// The generic config shape Cursor, the JSON tab, and the manual fallback all
// share — defined once so the server URL is never hand-duplicated (R2 §3.2 /
// Do-Don't #4). VS Code's shape is genuinely different (see VSCODE_MCP_JSON
// below) — confirmed from VS Code's own current MCP docs, not guessed.
const MCP_SERVERS_JSON = `{
  "mcpServers": {
    "clearance-lens": {
      "url": "${MCP_URL}"
    }
  }
}`;

const VSCODE_MCP_JSON = `{
  "servers": {
    "clearance-lens": {
      "type": "http",
      "url": "${MCP_URL}"
    }
  }
}`;

/**
 * Small, reusable copy-to-clipboard button (R2 §3.2: "swaps its icon +
 * caption-sized label to a check mark + 'Copied' for 1200ms, then reverts").
 * Built on the `Button` atom (ghost) so focus/hover states stay consistent
 * with the rest of the app.
 */
function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const handleCopy = React.useCallback(() => {
    void navigator.clipboard.writeText(value).catch(() => {
      // Clipboard API can fail (permissions, insecure context) — the button
      // still reflects an attempted copy rather than throwing at the user.
    });
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1200);
  }, [value]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      className={cn(
        "h-8 shrink-0 gap-1.5 rounded-sm px-2.5 text-[0.8125rem]",
        copied ? "text-success-11" : "text-neutral-11",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

/** A single copyable line (a URL or a one-line CLI command) — the action
 * comes first, before any explanatory prose (Do-Don't #4). */
function CommandRow({ value, prompt, className }: { value: string; prompt?: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-neutral-6 bg-neutral-1 py-1.5 pl-3 pr-1.5",
        className,
      )}
    >
      <code className="min-w-0 flex-1 overflow-x-auto text-[0.9375rem] leading-[1.6] font-mono whitespace-pre text-neutral-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {prompt ? <span className="mr-2 text-neutral-9">{prompt}</span> : null}
        {value}
      </code>
      <CopyButton value={value} />
    </div>
  );
}

/** A fenced, multi-line JSON block with its own copy affordance in a header
 * strip (avoids overlapping the code on narrow screens). */
function JsonBlock({ code, className }: { code: string; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-md border border-neutral-6 bg-neutral-1", className)}>
      <div className="flex items-center justify-end border-b border-neutral-6 bg-neutral-2 px-2 py-1">
        <CopyButton value={code} />
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 text-[0.9375rem] leading-[1.6] font-mono text-neutral-12">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[0.8125rem] leading-[1.4] text-neutral-10">{children}</p>;
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="mt-3 list-inside list-decimal space-y-1.5 text-[0.875rem] leading-[1.55] text-neutral-11">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  );
}

const TABS = [
  { value: "claude", label: "Claude" },
  { value: "cursor", label: "Cursor" },
  { value: "chatgpt", label: "ChatGPT" },
  { value: "vscode", label: "VS Code" },
  { value: "json", label: "JSON" },
] as const;

/**
 * Install-snippet (R2 §3.2): promoted Claude Code one-liner first, then
 * per-client tabs, then a closed-by-default manual-JSON accordion.
 *
 * Claude (Desktop/claude.ai) and ChatGPT are deliberately NOT given a JSON
 * block: both currently add a remote MCP server through a Connectors-style
 * UI form (paste a name + URL), not a config file a user hand-edits — and
 * for Claude Desktop specifically, hand-editing its local config with a
 * URL-based remote server currently has open reliability issues. Cursor and
 * VS Code DO take real config files, and their shapes genuinely differ
 * (VS Code uses a top-level `servers` key plus an explicit `type: "http"`,
 * not `mcpServers`) — verified against each client's current docs rather
 * than assumed.
 */
export function InstallSnippet() {
  return (
    <section id="install" className="mx-auto max-w-[1120px] px-6 py-16 sm:py-20 lg:py-24">
      <h2 className="text-[1.5rem] leading-[1.3] font-semibold tracking-[-0.005em] text-neutral-12">
        Add to your agent
      </h2>
      <p className="mt-2 max-w-2xl text-[0.875rem] leading-[1.55] text-neutral-11">
        One server, one URL — pick whatever your agent already speaks.
      </p>

      <div className="mt-6 rounded-lg border border-neutral-6 border-l-2 border-l-accent-9 bg-neutral-2 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[0.8125rem] font-semibold text-accent-11">
          <Zap className="h-3.5 w-3.5" aria-hidden />
          Fastest path — Claude Code
        </div>
        <div className="mt-3">
          <CommandRow value={CLAUDE_CODE_INSTALL_COMMAND} prompt="$" />
        </div>
      </div>

      <TabsPrimitive.Root defaultValue="claude" className="mt-8">
        <TabsPrimitive.List className="flex gap-1 overflow-x-auto border-b border-neutral-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => (
            <TabsPrimitive.Trigger
              key={tab.value}
              value={tab.value}
              className="shrink-0 border-b-2 border-transparent px-3.5 py-2.5 text-[0.9375rem] font-medium text-neutral-11 transition-colors duration-150 ease-out hover:text-neutral-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-6 data-[state=active]:border-accent-9 data-[state=active]:text-neutral-12"
            >
              {tab.label}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>

        <TabsPrimitive.Content value="claude" className="pt-5 focus-visible:outline-none">
          <CommandRow value={MCP_URL} />
          <Steps
            items={[
              "Settings → Connectors → Add custom connector.",
              <>
                Name it <strong className="font-semibold text-neutral-12">Clearance Lens</strong> and paste the URL
                above.
              </>,
              "Leave authentication as “No auth” and save.",
            ]}
          />
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="cursor" className="pt-5 focus-visible:outline-none">
          <JsonBlock code={MCP_SERVERS_JSON} />
          <Note>
            Add this to <code className="font-mono">~/.cursor/mcp.json</code> (global) or{" "}
            <code className="font-mono">.cursor/mcp.json</code> (project).
          </Note>
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="chatgpt" className="pt-5 focus-visible:outline-none">
          <CommandRow value={MCP_URL} />
          <Steps
            items={[
              "Settings → Apps & Connectors → Advanced → turn on Developer mode.",
              "Apps & Connectors → Create. Paste the URL above as the connector URL.",
              "Set authentication to “No auth,” save, then enable it from the + menu in any chat.",
            ]}
          />
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="vscode" className="pt-5 focus-visible:outline-none">
          <JsonBlock code={VSCODE_MCP_JSON} />
          <Note>
            Add this to <code className="font-mono">.vscode/mcp.json</code> in your workspace. VS Code&apos;s key is
            {" "}
            <code className="font-mono">servers</code>, not <code className="font-mono">mcpServers</code> — and it
            needs the explicit <code className="font-mono">type</code>.
          </Note>
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="json" className="pt-5 focus-visible:outline-none">
          <JsonBlock code={MCP_SERVERS_JSON} />
          <Note>The shape most other MCP clients use (Windsurf, Zed, Claude Code&apos;s own project config, etc.).</Note>
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>

      <AccordionPrimitive.Root type="single" collapsible className="mt-2 border-t border-neutral-6">
        <AccordionPrimitive.Item value="manual-json">
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between gap-3 py-3.5 text-left text-[0.9375rem] font-medium text-neutral-11 transition-colors duration-150 ease-out hover:text-neutral-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-6">
              Manual setup (JSON)
              <ChevronDown
                className="h-4 w-4 flex-none transition-transform duration-150 ease-out group-data-[state=open]:rotate-180"
                aria-hidden
              />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="pb-5 data-[state=closed]:hidden">
            <JsonBlock code={MCP_SERVERS_JSON} />
            <Note>
              Some clients — including VS Code, above — use <code className="font-mono">servers</code> instead of{" "}
              <code className="font-mono">mcpServers</code> as the top-level key, and may need an explicit{" "}
              <code className="font-mono">type</code>. If this generic shape doesn&apos;t connect, check your
              client&apos;s own docs for its exact key name.
            </Note>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      </AccordionPrimitive.Root>
    </section>
  );
}
