import { useMemo, useState } from "react";

const TABS = ["ALL", "STR", "AGI", "INT", "UNI"];

const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });

export default function MobileHeroPicker({ team, slot, heroes, onClose }) {
  const [tab, setTab] = useState("ALL");
  const [q, setQ] = useState("");

  // Flatten once; your 'heroes' prop already has grouped arrays
  const allHeroes = useMemo(() => ([
    ...(heroes.str || []),
    ...(heroes.agi || []),
    ...(heroes.int || []),
    ...(heroes.all || []), // if you have "universal" here, keep it; else adjust naming
  ].sort(byName)), [heroes]);

  // Map for quick lookups per attribute
  const byAttr = useMemo(() => ({
    STR: heroes.str || [],
    AGI: heroes.agi || [],
    INT: heroes.int || [],
    UNI: heroes.all || [], // adjust if your universal key is different
  }), [heroes]);

  const baseList = tab === "ALL" ? allHeroes : byAttr[tab] || [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return baseList;
    return baseList.filter(h =>
      (h.name || "").toLowerCase().includes(term)
    );
  }, [baseList, q]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-3 border-b border-gray-800 bg-black">
        <div className="text-sm">
          Picking for <span className="font-semibold">{team.toUpperCase()}</span> — Slot {slot + 1}
        </div>
        <button onClick={onClose} className="text-white text-lg" aria-label="Close">✕</button>
      </div>

      {/* Search + Tabs */}
      <div className="bg-black border-b border-gray-800 px-3 py-2 space-y-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search heroes…"
          className="w-full bg-[#111] border border-gray-700 rounded px-3 py-2 text-sm outline-none"
        />
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map(t => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-4 rounded text-xs border ${active ? "border-white" : "border-gray-700 text-gray-300"}`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3 grid gap-2 auto-rows-[62px] grid-cols-[repeat(auto-fit,108px)]">
        {filtered.map(h => (
          <div
            key={h.HeroId}
            className="h-full rounded border border-gray-700 overflow-hidden flex items-center justify-center"
          >
            <img src={h.icon_url} alt={h.name} className="h-full object-contain" />
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center text-gray-400 py-10 text-sm">
            No heroes match “{q}”
          </div>
        )}
      </div>
    </div>
  );
}