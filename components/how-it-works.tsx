const STEPS = [
  {
    number: "01",
    title: "Your agent calls our tools",
    body: "It asks for a role, a rule, or a rubric in plain language — no dashboard, no login required.",
  },
  {
    number: "02",
    title: "We return public knowledge only",
    body: "Job postings and published rules, each with a source link. Never PII, never a lookup on you.",
  },
  {
    number: "03",
    title: "Your agent reasons privately",
    body: "It evaluates your fit inside your own conversation — we never see your answers.",
  },
] as const;

/**
 * The core privacy mental model, in three steps (research/R2-design-system.md
 * §5's `/` wireframe). Kept deliberately short and simple here — `/privacy`
 * (built separately) is the detailed version of the same three claims.
 */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-[1120px] px-6 py-16 sm:py-20 lg:py-24">
      <h2 className="text-[1.5rem] leading-[1.3] font-semibold tracking-[-0.005em] text-neutral-12">
        How it works
      </h2>
      <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
        {STEPS.map((step) => (
          <div key={step.number} className="flex flex-col gap-2">
            <span className="font-mono text-[0.8125rem] leading-[1.5] text-neutral-9">{step.number}</span>
            <h3 className="text-[1.0625rem] leading-[1.4] font-semibold text-neutral-12">{step.title}</h3>
            <p className="text-[0.875rem] leading-[1.55] text-neutral-11">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
