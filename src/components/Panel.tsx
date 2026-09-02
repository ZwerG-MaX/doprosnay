import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  sub?: string;
  right?: ReactNode;
  ledClass?: string;
  className?: string;
  delay?: number;
  children: ReactNode;
}

export function Panel({
  title,
  sub,
  right,
  ledClass = "bg-live shadow-[0_0_8px_rgba(53,217,127,0.8)]",
  className = "",
  delay = 0,
  children,
}: PanelProps) {
  return (
    <section
      className={`rise flex min-h-0 flex-col rounded-md border border-line bg-panel/90 shadow-[0_14px_36px_rgba(2,6,12,0.5)] ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="flex h-11 shrink-0 items-center gap-2.5 rounded-t-md border-b border-line bg-panel2/80 px-3.5">
        <span className={`led ${ledClass}`} />
        <h2 className="font-display text-[11.5px] tracking-[0.18em] text-fg">{title}</h2>
        {sub && (
          <span className="hidden font-mono text-[10px] text-faint md:block">{sub}</span>
        )}
        {right && <div className="ml-auto flex items-center gap-1.5">{right}</div>}
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
