interface SectionRef {
  id: string;
  title: string;
}

interface Props {
  title: string;
  subtitle: string;
  eyebrow: string;
  sections?: SectionRef[];
}

// V6's three crisp GMP bolts, anchored to the right gutter. Hidden by default
// (.hero-bolts { display: none }) — kept for parity / future enablement.
const BOLT_POSITIONS = [
  { right: "20%", top: "14%" },
  { right: "30%", top: "48%" },
  { right: "22%", top: "80%" },
] as const;
const BOLT_SIZE = 36;
const BOLT_ROT = 14;
const BOLT_PATH = "M13 0 L0 18 H9 L7 32 L22 12 H12 L13 0 Z";

export default function Hero({ title, subtitle, eyebrow, sections = [] }: Props) {
  const roadmap = sections.find((s) => /roadmap/i.test(s.title));
  const credits = sections.find((s) => /credit/i.test(s.title));

  const scrollTo = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - 76;
    window.scrollTo({ top, behavior: "smooth" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className="hero">
      <div className="hero-bolts" aria-hidden="true">
        {BOLT_POSITIONS.map((p, i) => (
          <svg
            key={i}
            viewBox="0 0 22 32"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              right: p.right,
              top: p.top,
              width: BOLT_SIZE + "px",
              height: (BOLT_SIZE * 32) / 22 + "px",
              transform: `rotate(${BOLT_ROT}deg)`,
            }}
          >
            <path d={BOLT_PATH} />
          </svg>
        ))}
      </div>
      <div className="hero-content">
        <span className="eyebrow">{eyebrow}</span>
        <Headline title={title} />
        <p className="subtitle">{subtitle}</p>
        {(roadmap || credits) && (
          <div className="hero-cta-row">
            {roadmap && (
              <button
                type="button"
                className="hero-cta hero-cta-primary"
                onClick={() => scrollTo(roadmap.id)}
              >
                <span className="hero-cta-arrow">
                  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path
                      d="M3.75 10h11m0 0L10 5.25M14.75 10 10 14.75"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span>Review the Roadmap</span>
              </button>
            )}
            {credits && (
              <button
                type="button"
                className="hero-cta hero-cta-secondary"
                onClick={() => scrollTo(credits.id)}
              >
                How credits work
              </button>
            )}
          </div>
        )}
      </div>
      <div className="hero-mark">
        <img src="/assets/gmp-brandmark.gif" alt="Growth Marketing Pro" />
      </div>
    </div>
  );
}

function Headline({ title }: { title: string }) {
  // Split at em-dash: brand name muted, rest takes display weight,
  // last word goes italic-red.
  const parts = title.split(/\s+—\s+/);
  if (parts.length < 2) return <h1>{title}</h1>;

  const rest = parts.slice(1).join(" — ");
  const words = rest.split(" ");
  const last = words.pop() ?? "";
  const lead = words.length ? words.join(" ") + " " : "";

  return (
    <h1>
      <span className="brand-name">{parts[0]}</span> {lead}
      <em>{last}</em>
    </h1>
  );
}
