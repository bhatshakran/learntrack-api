export function StatCard({
  title,
  value,
  subtitle,
  colorClass = "text-violet-400",
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  colorClass?: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="text-xs font-mono text-slate-400 uppercase tracking-widest">
        {title}
      </div>
      <div className={`mt-3 text-3xl font-serif font-bold ${colorClass}`}>
        {value}
      </div>
      {subtitle && (
        <div className="mt-2 text-sm text-slate-400">{subtitle}</div>
      )}
    </div>
  );
}
