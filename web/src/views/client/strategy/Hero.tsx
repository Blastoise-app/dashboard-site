interface Props {
  title: string;
  subtitle: string;
  eyebrow: string;
}

const BOLT_POSITIONS = [
  { x: "14%", y: "12%", size: 22, rot: 12 },
  { x: "38%", y: "6%", size: 18, rot: -18 },
  { x: "62%", y: "18%", size: 26, rot: 8 },
  { x: "82%", y: "8%", size: 20, rot: -10 },
  { x: "92%", y: "44%", size: 16, rot: 20 },
  { x: "72%", y: "70%", size: 24, rot: -12 },
  { x: "48%", y: "82%", size: 18, rot: 14 },
  { x: "22%", y: "66%", size: 20, rot: -16 },
  { x: "4%", y: "46%", size: 22, rot: 10 },
] as const;

export default function Hero({ title, subtitle, eyebrow }: Props) {
  return (
    <div className="hero">
      <div className="hero-bolts" aria-hidden="true">
        {BOLT_POSITIONS.map((p, i) => (
          <svg
            key={i}
            viewBox="0 0 24 32"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              left: p.x,
              top: p.y,
              width: p.size + "px",
              height: p.size * 1.3 + "px",
              transform: `rotate(${p.rot}deg)`,
            }}
          >
            <path d="M14 0 L2 18 H11 L9 32 L22 12 H13 Z" />
          </svg>
        ))}
      </div>
      <div className="hero-content">
        <span className="eyebrow">{eyebrow}</span>
        <Headline title={title} />
        <p className="subtitle">{subtitle}</p>
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
