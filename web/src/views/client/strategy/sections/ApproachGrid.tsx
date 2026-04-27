interface Props {
  intro: string;
  bullets: Array<{ title: string; body: string }>;
}

export default function ApproachGrid({ intro, bullets }: Props) {
  return (
    <>
      {intro && <p className="section-intro">{intro}</p>}
      <div className="approach-grid">
        {bullets.map((b, i) => (
          <div className="approach-card" key={i}>
            <span className="num">{String(i + 1).padStart(2, "0")}</span>
            <h3>{b.title}</h3>
            <p>{b.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}
