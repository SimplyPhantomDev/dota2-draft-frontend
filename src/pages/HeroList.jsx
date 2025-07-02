import { useEffect, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import axios from "axios";
import { groupAndSortHeroes } from "../utils/groupHeroes";

const BASE_URL = "https://dota2-backend.onrender.com";


export default function HeroList() {

  const [selectedHeroes, setSelectedHeroes] = useState({
    ally: [],
    enemy: []
  });

  const [suggestedHeroes, setSuggestedHeroes] = useState([]);

  const [selectedTeam, setSelectedTeam] = useState("ally");
  
  const [bannedHeroes, setBannedHeroes] = useState([]);

  const [clickLockedHeroes, setClickLockedHeroes] = useState(new Set());

  const [heroes, setHeroes] = useState({});

  const hasPicks = selectedHeroes.ally.length > 0 || selectedHeroes.enemy.length > 0;

  const hasBans = bannedHeroes.length > 0;

  const updateSynergySuggestions = (
    ally = selectedHeroes.ally,
    enemy = selectedHeroes.enemy,
    bans = bannedHeroes
  ) => {

    if (ally.length === 0 && enemy.length === 0) {
      setSuggestedHeroes([]);
      return;
    }

    fetch(`${BASE_URL}/api/synergy-picks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allyHeroIds: ally.map(h => h.HeroId),
        enemyHeroIds: enemy.map(h => h.HeroId),
        bannedHeroIds: bans.map(h => h.HeroId),
      }),
    })
      .then(res => res.json())
      .then(data => setSuggestedHeroes(data))
      .catch(err => console.error("Failed to update synergy suggestions:", err));
  };

  const lockHero = (heroId) => {
    setClickLockedHeroes((prev) => new Set(prev).add(heroId));
  };

  const unlockHero = (heroId) => {
    setClickLockedHeroes((prev) => {
      const updated = new Set(prev);
      updated.delete(heroId);
      return updated;
    });
  };

  const handleClearBans = () => {
      setBannedHeroes([]);
      updateSynergySuggestions(selectedHeroes.ally, selectedHeroes.enemy, []);
  }

  function DraggableHero({ hero, isPicked, handleHeroClick, handleHeroBan }) {
    const [{ isDragging }, drag] = useDrag(() => ({
      type: "HERO",
      item: { hero },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }));

    const handleClick = () => {
      if (!isPicked) handleHeroClick(hero);
    };

    const handleRightClick = (e) => {
      e.preventDefault();
      if (!isPicked) handleHeroBan(hero)
    }

    return (
      <button
        ref={drag}
        onClick={handleClick}
        onContextMenu={handleRightClick}
        disabled={isPicked}
        className={`w-[106px] h-[76px] rounded shadow text-center transition
          ${isPicked ? "bg-gray-600 opacity-40 cursor-not-allowed" : "bg-gray-800 hover:ring-2 hover:ring-yellow-400"}
          ${isDragging ? "opacity-30" : ""}`}
      >
        <img src={hero.icon_url} alt={hero.name} className="w-full h-15 object-contain mx-auto" />
        <h3 className="text-xs font-medium px-1 truncate">{hero.name}</h3>
      </button>
    );
  }

  function TeamDropZone ({ team }) {
    const [collectedProps, dropRef] = useDrop(() => ({
      accept: "HERO",
      drop: (item) => handleDrop(item.hero, team),
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }));

    const isOver = collectedProps.isOver;
    const isAlly = team === "ally";
    const heroes2 = isAlly ? selectedHeroes.ally : selectedHeroes.enemy;

    return (
      <div
        ref={dropRef}
        className={`flex gap-2 p-1 rounded transition-all duration-200
          ${isOver ? "bg-yellow-500/20" : ""}
        `}
      >
        {[...Array(5)].map((_, i) => (
          <div key={i} className="relative w-[142px] h-[80px] bg-gray-700 rounded overflow-hidden flex items-center justify-center">
            {heroes2[i] && (
              <div
                className="relative group w-full h-full cursor-pointer"
                onClick={() => handleHeroDeselect(heroes2[i], team)}
              >
                <img
                  src={heroes2[i].icon_url}
                  alt={heroes2[i].name}
                  className="object-contain w-full h-full"
                />
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-75 flex items-center justify-center transition-opacity duration-200">
                  <span className="text-red-400 font-bold text-sm">REMOVE</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  const handleHeroClick = async (hero) => {
  if (clickLockedHeroes.has(hero.HeroId)) return;

  lockHero(hero.HeroId);

  const team = selectedTeam;
  const allyIds = selectedHeroes.ally.map(h => h.HeroId);
  const enemyIds = selectedHeroes.enemy.map(h => h.HeroId);

  try {
    const response = await fetch(`${BASE_URL}/api/select-hero`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        heroId: hero.HeroId,
        team,
        allyHeroIds: allyIds,
        enemyHeroIds: enemyIds,
      }),
    });

    const data = await response.json();
    if (data?.message === "Hero selected") {
      const updatedSelected = {
        ...selectedHeroes,
        [team]: [...selectedHeroes[team], hero],
      };
      setSelectedHeroes(updatedSelected);

      setTimeout(updateSynergySuggestions, 0);
    }

  } catch (err) {
    console.error("❌ Failed to select hero:", err);
  } finally {
    unlockHero(hero.HeroId);
  }
  }


  const handleDrop = async (hero, team) => {
  if (clickLockedHeroes.has(hero.HeroId)) return;
  if (selectedHeroes[team].some(h => h.HeroId === hero.HeroId)) return;
  if (selectedHeroes[team].length >= 5) return;

  lockHero(hero.HeroId);

  const allyIds = selectedHeroes.ally.map(h => h.HeroId);
  const enemyIds = selectedHeroes.enemy.map(h => h.HeroId);

  try {
    const response = await fetch(`${BASE_URL}/api/select-hero`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        heroId: hero.HeroId,
        team,
        allyHeroIds: allyIds,
        enemyHeroIds: enemyIds,
      }),
    });

    const data = await response.json();
    if (data?.message === "Hero selected") {
      const updatedSelected = {
        ...selectedHeroes,
        [team]: [...selectedHeroes[team], hero]
      };
      setSelectedHeroes(updatedSelected);
      setTimeout(updateSynergySuggestions, 0);
    } else {
      console.warn("Drop hero response:", data?.message);
    }
  } catch (err) {
    console.error(`Failed to drop hero to ${team} team`, err);
  } finally {
    unlockHero(hero.HeroId);
  }
  }

  const handleHeroDeselect = (hero, team) => {

    const newSelected = {
      ...selectedHeroes,
      [team]: selectedHeroes[team].filter(h => h.HeroId !== hero.HeroId),
    };

    setSelectedHeroes(newSelected);

    updateSynergySuggestions(newSelected.ally, newSelected.enemy, bannedHeroes);
  }

  const handleClear = () => {
    setSelectedHeroes({ ally: [], enemy: [] });
    setSuggestedHeroes([]);
    setBannedHeroes([]);
    setClickLockedHeroes(new Set());
  };

  const handleBanRemove = (hero) => {
    const updatedBans = bannedHeroes.filter(h => h.HeroId !== hero.HeroId);
    setBannedHeroes(updatedBans);
    updateSynergySuggestions(selectedHeroes.ally, selectedHeroes.enemy, updatedBans);
  }

  const handleHeroBan = async (hero) => {
    if (bannedHeroes.length >= 16) return;
    if (clickLockedHeroes.has(hero.HeroId)) return;

    lockHero(hero.HeroId);

    try {
      const updatedBans = [...bannedHeroes, hero];
      setBannedHeroes(updatedBans)

      updateSynergySuggestions();
        
    } catch (err) {
      console.error("Failed to ban hero:", err);
    } finally {
      unlockHero(hero.HeroId);
    }
  }

  useEffect(() => {
    axios
      .get(`${BASE_URL}/heroes`)
      .then((res) => {
        const grouped = groupAndSortHeroes(res.data);
        setHeroes(grouped);
      })
      .catch((err) => console.error("Failed to fetch heroes:", err));
  }, []);

  useEffect(() => {
  if (selectedHeroes.ally.length > 0 || selectedHeroes.enemy.length > 0) {
    updateSynergySuggestions();
  } else {
    // Clear suggestions if all heroes are removed
    setSuggestedHeroes([]);
  }
}, [selectedHeroes, bannedHeroes]);

  return (
    <div className="p-2 bg-black text-white h-screen overflow-hidden flex flex-col">
      {/* Drafting Panel with Title */}
      <div className="mb-2 bg-gray-800 rounded shadow px-4 py-2 flex items-center gap-6">
        <h1 className="text-2xl font-bold text-white mr-4">Dota 2 Counter Tool</h1>
        <TeamDropZone team="ally" />
        <div className="flex justify-center">
          <button
            onClick={() => setSelectedTeam(prev => prev === "ally" ? "enemy" : "ally")}
            className={`w-[188px] px-4 py-1 rounded-full text-white text-sm font-semibold transition 
            ${selectedTeam === "ally" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
          >
            Picking for: {selectedTeam === "ally" ? "Ally Team" : "Enemy Team"}
          </button>
        </div>
        <TeamDropZone team="enemy" />
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleClearBans}
            className="w-[71px] h-[60px] bg-gray-100 hover:bg-gray-200 text-black font-bold rounded shrink-0"
          >
            Clear Bans
          </button>
          <button
            onClick={handleClear}
            className="w-[71px] h-[60px] bg-gray-200 hover:bg-gray-300 text-black font-bold rounded shrink-0 align-right"
          >
            Clear All
          </button>
        </div>
      </div>
      {bannedHeroes.length > 0 || true ? (
        <div className="flex flex-col items-center">
          <h2 className="text-sm font-semibold text-white mb-1">Bans:</h2>
          <div className="flex justify-center mb-2 gap-2">
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                className="w-[71px] h-[40px] bg-gray-900 border border-gray-700 rounded flex items-center justify-center overflow-hidden"
              >
                {bannedHeroes[i] && (
                  <div
                    className="relative group w-full h-full cursor-pointer"
                    onClick={() => handleBanRemove(bannedHeroes[i])}
                  >
                    <img
                      src={bannedHeroes[i].icon_url}
                      alt={bannedHeroes[i].name}
                      className="object-contain w-full h-full filter grayscale"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                    <span className="text-red-400 font-bold text-[10px]">REMOVE</span>
                  </div>
                </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 overflow-hidden">
        {/* Main hero area */}
        <div className="flex flex-col flex-1 pr-3 overflow-y-auto gap-4">
          {/* Top Row: Strength + Agility */}
          <div className="flex gap-4">
            {["str", "agi"].map((attr) => (
              <div key={attr} className={`flex-1 border-2 rounded-lg p-4 space-y-2 ${
                attr === "str"
                  ? "border-red-600 bg-red-900/10"
                  : "border-green-600 bg-green-900/10"
              }`}>
                <h2 className={`text-xl font-bold mb-2 ${
                  attr === "str" ? "text-red-600" : "text-green-600"
                }`}>
                  {attr === "str" ? "Strength" : "Agility"}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {heroes[attr]?.map((hero) => {
                    const isPicked = selectedHeroes.ally.some(h => h.HeroId === hero.HeroId)
                      || selectedHeroes.enemy.some(h => h.HeroId === hero.HeroId)
                      || bannedHeroes.some(h => h.HeroId === hero.HeroId)
                      || clickLockedHeroes.has(hero.HeroId);

                    return (
                      <DraggableHero
                        key={hero.HeroId}
                        hero={hero}
                        isPicked={isPicked}
                        handleHeroClick={handleHeroClick}
                        handleHeroBan={handleHeroBan}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Row: Intelligence + Universal */}
          <div className="flex gap-4">
            {["int", "all"].map((attr) => (
              <div key={attr} className={`flex-1 border-2 rounded-lg p-4 space-y-2 ${
                attr === "int"
                  ? "border-blue-600 bg-blue-900/10"
                  : "border-purple-600 bg-purple-900/10"
              }`}>
                <h2 className={`text-xl font-bold mb-2 ${
                  attr === "int" ? "text-blue-600" : "text-purple-600"
                }`}>
                  {attr === "int" ? "Intelligence" : "Universal"}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {heroes[attr]?.map((hero) => {
                    const isPicked = selectedHeroes.ally.some(h => h.HeroId === hero.HeroId)
                      || selectedHeroes.enemy.some(h => h.HeroId === hero.HeroId)
                      || bannedHeroes.some(h => h.HeroId === hero.HeroId)
                      || clickLockedHeroes.has(hero.HeroId);

                    return (
                      <DraggableHero
                        key={hero.HeroId}
                        hero={hero}
                        isPicked={isPicked}
                        handleHeroClick={handleHeroClick}
                        handleHeroBan={handleHeroBan}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>


        <div className="w-64 bg-gray-800 rounded shadow flex flex-col justify-between p-4">
          <div className="space-y-2">
            {suggestedHeroes.length === 0 ? (
              hasPicks ? null : hasBans ? (
                <p className="text-gray-400 text-sm italic">
                  Pick a hero to see recommendations.
                </p>
              ) : (
                <p className="text-gray-400 text-sm italic">
                  Guide: <br />
                  Welcome to the ultimate Dota 2 drafting tool, powered by STRATZ API. Your hero suggestions 
                  will be shown here. Once you start selecting heroes to either team, the tool will start 
                  calculating the best possible picks judging by the heroes picked and what is left in the pool. <br /> <br />
                  To select a hero, simply press the hero within the grid below the draft panel. To remove a hero, click
                  them inside the draft panel at the top of your screen. Right clicking a hero will ban said hero. 
                  On this sidebar you can see the hero's icon, name and the synergy rating. The higher the synergy rating, 
                  the stronger the hero pick. <br /><br />
                  Thank you to reddit user u/Winter-Nectarine-601 for the idea. This was a fun little project to do
                  and I'll aim to keep it updated as long as possible if it gains enough traction. <br /> <br />
                  Note: This tool is based on pure statistical analysis and requires the user to use common sense 
                  as to what heroes are logical to be picked in certain situations. This tool is just a prototype for now
                  and platform-specific (mobile, different screen resolutions) support might be added later down the line.
                  If you happen to encounter any bugs while using the tool, the "Clear All" button should restart everything.
                </p>
              )
            ) : (
              <>
                <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-gray-300 border-b border-gray-600 mb-1">
                  <span className="w-10">Hero</span>
                  <span className="flex-1 pl-2">Name</span>
                  <span className="text-right pr-1">Synergy</span>
                </div>
                {suggestedHeroes.map((hero) => (
                  <div
                    key={hero.HeroId}
                    className="flex items-center justify between bg-gray-700 rounded px-2 py-1"
                  >
                    <img
                      src={hero.icon_url}
                      alt={hero.name}
                      className="w-10 h-10 object-contain mr-2"
                    />
                    <span className="flex-1 text-sm font-medium text-white truncate">
                      {hero.name}
                    </span>
                    <span className="text-green-400 text-sm font-mono pl-2">
                      {hero.totalScore}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="text-white text-xs mt-4 border-t border-gray-700 pt-2">
            <p>Patch: 7.39c</p>
            <p>Last updated: July 2</p>
          </div>
        </div>
      </div>
    </div>
  );
}