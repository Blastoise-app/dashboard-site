import type { ReactNode } from "react";

interface Props {
  id: string;
  num: string;
  title: string;
  children: ReactNode;
  className?: string;
}

export default function Section({ id, num, title, children, className }: Props) {
  return (
    <section id={id} className={"section" + (className ? " " + className : "")}>

      <div className="section-head">
        <span className="section-number">{num}</span>
        <h2 className="section-title">{title}</h2>
      </div>
      {children}
    </section>
  );
}
