import { useMemo, useState, useRef } from "react";

const TABS = ["ALL", "STR", "AGI", "INT", "UNI"];

const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" });

export default function MobileHeroPicker({
  team,
  slot,
  heroes,
  selectedHeroes,
  bannedHeroes,
  onClose,
  onPick,
  onBan,
  onUnban
}) {
  const [tab, setTab] = useState("ALL");
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState(null);
  const pressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  const bannedSet = useMemo(() => {
    if (!bannedHeroes) return new Set();
    return bannedHeroes instanceof Set ? bannedHeroes : new Set(bannedHeroes);
  }, [bannedHeroes]);

  const pickedSet = useMemo(() => {
    const ids = new Set();
    if (selectedHeroes?.ally) selectedHeroes.ally.forEach(h => h && ids.add(h.HeroId));
    if (selectedHeroes?.enemy) selectedHeroes.enemy.forEach(h => h && ids.add(h.HeroId));
    return ids;
  }, [selectedHeroes]);

  // Flatten once; your 'heroes' prop already has grouped arrays
  const allHeroes = useMemo(() => ([
    ...(heroes.str || []),
    ...(heroes.agi || []),
    ...(heroes.int || []),
    ...(heroes.all || []),
  ].sort(byName)), [heroes]);

  // Map for quick lookups per attribute
  const byAttr = useMemo(() => ({
    STR: heroes.str || [],
    AGI: heroes.agi || [],
    INT: heroes.int || [],
    UNI: heroes.all || [],
  }), [heroes]);

  const filtered = useMemo(() => {
    const baseList = tab === "ALL" ? allHeroes : byAttr[tab] || [];
    const term = q.trim().toLowerCase();
    if (!term) return baseList;
    return baseList.filter(h =>
      (h.name || "").toLowerCase().includes(term)
    );
  }, [allHeroes, byAttr, q, tab]);

  // Helpers
  const isPicked = (id) => pickedSet.has(id);
  const isBanned = (id) => bannedSet.has(id);

  //Long press handling
  const startPress = (hero) => {
    clearTimeout(pressTimerRef.current);
    longPressTriggeredRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      // Instant pick on long press
      if (onPick) onPick(hero.HeroId);
      else console.log("LONG PRESS PICK", hero.name);
      if (onClose) onClose();
    }, 650);
  };

  const endPress = () => clearTimeout(pressTimerRef.current);

  // Actions from preview

  const doPick = (hero) => {
    if (isPicked(hero.HeroId) || isBanned(hero.HeroId)) return;
    if (onPick) onPick(hero.HeroId);
    else console.log("PICK", hero.name);
    if (onClose) onClose();
  };

  const doBan = (hero) => {
    if (isPicked(hero.HeroId)) return;
    if (isBanned(hero.HeroId)) {
      if (onUnban) onUnban(hero.HeroId);
      else console.log("UNBAN", hero.name);
    } else {
      if (onBan) onBan(hero.HeroId);
      else console.log("BAN", hero.name);
    }
    setPreview(null); // stay in picker after ban/unban
  };

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
        {filtered.map(h => {
          const picked = isPicked(h.HeroId);
          const banned = isBanned(h.HeroId);

          return (
            <div
              key={h.HeroId}
              className={`relative h-full rounded border overflow-hidden flex items-center justify-center
                ${banned ? "border-red-700 opacity-60" : "border-gray-700"}`}
              onPointerDown={() => startPress(h)}
              onPointerUp={() => { endPress(); }}
              onPointerCancel={endPress}
              onPointerLeave={endPress}
              onClick={() => {
                // If we just long-pressed, suppress the tap action
                if (longPressTriggeredRef.current) {
                  longPressTriggeredRef.current = false;
                  return;
                }
                setPreview(h); // normal tap -> open preview
              }}
              role="button"
              tabIndex={0}
            >
              <img src={h.icon_url} alt={h.name} className="h-full object-contain" />
              {picked && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-xs">Picked</div>
              )}
              {banned && !picked && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-xs">Banned</div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center text-gray-400 py-10 text-sm">
            No heroes match “{q}”
          </div>
        )}
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/70" onClick={() => setPreview(null)} />
          <div className="relative bg-[#0b0b0b] border border-gray-800 rounded-xl p-4 w-[min(92vw,420px)]">
            <button
              onClick={() => setPreview(null)}
              className="absolute top-2 right-2 text-gray-300"
              aria-label="Close preview"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <img src={preview.icon_url} alt={preview.name} className="w-16 h-16 object-contain" />
              <div>
                <div className="text-lg font-semibold">{preview.name}</div>
                <div className="text-xs text-gray-400">ID: {preview.HeroId}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {/* Pick */}
              <button
                className="col-span-2 px-3 py-2 rounded border border-gray-700 disabled:opacity-40"
                onClick={() => doPick(preview)}
                disabled={isPicked(preview.HeroId) || isBanned(preview.HeroId)}
              >
                Pick
              </button>

              {/* Ban / Unban */}
              <button
                className={`px-3 py-2 rounded border ${isBanned(preview.HeroId) ? "border-yellow-600" : "border-red-700"}`}
                onClick={() => doBan(preview)}
                disabled={isPicked(preview.HeroId)}
              >
                {isBanned(preview.HeroId) ? "Unban" : "Ban"}
              </button>
            </div>

            {/* Hints */}
            <div className="mt-3 text-[11px] text-gray-400">
              Tip: Long-press a hero for instant pick. Tap outside to close.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}