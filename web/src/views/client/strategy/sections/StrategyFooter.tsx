export default function StrategyFooter({ text }: { text: string }) {
  if (!text) return <div className="footer" />;
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (!emailMatch) {
    return (
      <div className="footer">
        <span>{text}</span>
      </div>
    );
  }
  const before = text.slice(0, emailMatch.index).trim();
  return (
    <div className="footer">
      <span>{before || "Questions?"}</span>
      <a className="email-pill" href={`mailto:${emailMatch[0]}`}>
        {emailMatch[0]}
      </a>
    </div>
  );
}
