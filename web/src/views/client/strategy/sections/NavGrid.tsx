interface Props {
  items: Array<{ name: string; description: string }>;
}

export default function NavGrid({ items }: Props) {
  return (
    <div className="nav-grid">
      {items.map((it) => (
        <div className="nav-item" key={it.name}>
          <h4>{it.name}</h4>
          {it.description && <p>{it.description}</p>}
        </div>
      ))}
    </div>
  );
}
