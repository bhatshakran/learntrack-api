import { Program } from "./types";

function Sidebar({
  programs,
  onSelectProgram,
  selected,
}: {
  programs: Program[];
  onSelectProgram: (p: Program) => void;
  selected?: string | null;
}) {
  return (
    <aside className="w-56 h-screen sticky top-0 p-6 bg-slate-950 border-r border-slate-800">
      <div className="mb-6">
        <div className="text-2xl font-serif font-extrabold tracking-tight">
          Learn<span className="text-violet-400">Track</span>
        </div>
        <div className="text-xs font-mono text-slate-500 uppercase mt-1">
          Admin Console
        </div>
      </div>
      <nav className="space-y-3">
        <button className="w-full text-left px-3 py-2 rounded-lg bg-slate-900 text-violet-300 font-medium">
          Dashboard
        </button>
        <div className="mt-4 text-xs font-mono text-slate-500 uppercase">
          Programs
        </div>
        <div className="mt-2 space-y-2">
          {programs.length === 0 ? (
            <div className="text-sm text-slate-400">No programs</div>
          ) : (
            programs.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectProgram(p)}
                className={`w-full text-left px-3 py-2 rounded-lg transition ${selected === p.id ? "bg-violet-900 text-violet-200" : "hover:bg-slate-900 text-slate-300"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="truncate">{p.title}</div>
                  <div className="text-xs text-slate-400">
                    {p.durationWeeks ?? "—"}w
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">
                  {p.category ?? ""} · {p.level ?? ""}
                </div>
              </button>
            ))
          )}
        </div>
      </nav>
      <div className="mt-auto pt-6 border-t border-slate-800">
        <div className="text-sm text-slate-300">Admin</div>
        <div className="text-xs text-slate-500 mt-1">Instructor</div>
      </div>
    </aside>
  );
}
export default Sidebar;
