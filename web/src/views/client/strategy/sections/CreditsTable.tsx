interface Props {
  intro: string;
  rows: Array<{ deliverable: string; credits: string; what: string }>;
}

export default function CreditsTable({ intro, rows }: Props) {
  return (
    <>
      {intro && <p className="section-intro">{intro}</p>}
      <div className="credits-table">
        <table>
          <thead>
            <tr>
              <th>Deliverable</th>
              <th style={{ textAlign: "right", width: 100 }}>Credits</th>
              <th>What It Is</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="deliv">{r.deliverable}</td>
                <td className="credits">{r.credits}</td>
                <td className="what">{r.what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
