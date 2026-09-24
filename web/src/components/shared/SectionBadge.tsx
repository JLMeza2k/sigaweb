interface Props {
  color: 'blue' | 'green';
  label: string;
}

export default function SectionBadge({ color, label }: Props) {
  const cls = color === 'blue'
    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
  const dot = color === 'blue' ? 'bg-blue-400' : 'bg-emerald-400';
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 border rounded-full text-sm font-bold uppercase tracking-widest ${cls}`}>
      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${dot}`} />
      {label}
    </div>
  );
}
