// Final CTA card. Two variants — a pre-kickoff "greenlight the plan" version
// and an active-engagement "questions?" version. CSS shows the right one based
// on the strategy root's .pre-engagement class.

const ARROW = (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M3.5 8h9m0 0L8.5 4m4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function FinalCta({
  clientName,
  contactEmail = "hailey@growthmarketingpro.com",
  contactLabel = "Hailey",
  contractUrl,
}: {
  clientName: string;
  contactEmail?: string;
  contactLabel?: string;
  contractUrl?: string;
}) {
  const subj = (s: string) => encodeURIComponent(`${clientName} ${s}`);

  return (
    <div className="final-cta" id="sec-final-cta">
      {/* Pre-engagement: greenlight / contract */}
      <div className="final-cta-variant final-cta-pre">
        <div className="final-cta-copy">
          <h3 className="final-cta-title">Ready to greenlight the plan?</h3>
          <p className="final-cta-body">
            View the contract when you're ready to move forward, or send any questions our
            way — we'll start within two weeks of sign-off.
          </p>
        </div>
        <div className="final-cta-actions">
          <a
            className="final-cta-btn final-cta-btn-primary"
            href={contractUrl || "#contract"}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>View the contract</span>
            {ARROW}
          </a>
          <a
            className="final-cta-btn final-cta-btn-secondary"
            href={`mailto:${contactEmail}?subject=${subj("strategy — questions")}`}
          >
            Email {contactLabel}
          </a>
        </div>
      </div>

      {/* Active engagement: ask a question */}
      <div className="final-cta-variant final-cta-active">
        <div className="final-cta-copy">
          <h3 className="final-cta-title">Questions about the engagement?</h3>
          <p className="final-cta-body">
            Anything you want to talk through — priorities, results, what's next — send it our
            way and we'll get back same-day.
          </p>
        </div>
        <div className="final-cta-actions">
          <a
            className="final-cta-btn final-cta-btn-primary"
            href={`mailto:${contactEmail}?subject=${subj("engagement — question")}`}
          >
            <span>Email {contactLabel}</span>
            {ARROW}
          </a>
        </div>
      </div>
    </div>
  );
}
