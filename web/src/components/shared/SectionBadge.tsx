interface Props {
  color: 'blue' | 'green';
  label: string;
}

export default function SectionBadge({ color, label }: Props) {
  const cls = color === 'blue'
    ? 'bg-accent-soft border-accent-border text-accent-fg'
    : 'bg-success-soft border-success-border text-success';
  const dot = color === 'blue' ? 'bg-accent' : 'bg-success';
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 border rounded-full text-sm font-bold uppercase tracking-widest ${cls}`}>
      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${dot}`} />
      {label}
    </div>
  );
}
