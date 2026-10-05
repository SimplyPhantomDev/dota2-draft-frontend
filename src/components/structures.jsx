import { motion } from "framer-motion";
import { useDrag, useDrop } from "react-dnd";

export function DraggableHero({
  hero,
  isPicked,
  handleHeroClick,
  handleHeroBan,
  grayscale,
  highlight,
  glowPurple
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "HERO",
    item: { hero },
    canDrag: !isPicked,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [hero, isPicked]);

  const handleClick = () => {
    if (!isPicked) handleHeroClick(hero);
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    if (!isPicked) handleHeroBan(hero)
  }

  return (
    <motion.button
      layout="position"
      transition={{ layout: { duration: 0.4, ease: "easeInOut" } }}
      ref={drag}
      onClick={handleClick}
      onContextMenu={handleRightClick}
      disabled={isPicked}
      title={hero.name}
      className={`w-full min-w-0 rounded-control shadow text-center transition-transform duration-300
        ${isPicked ? "bg-gray-500 opacity-40 cursor-not-allowed" : "bg-gray-700 hover:ring-2 hover:ring-yellow-400 hover:scale-[1.03]"}
        ${isDragging ? "opacity-30" : ""}
        ${glowPurple ? "animate-pulseSlow shadow-[0_0_12px_2px_rgba(128,0,128,0.6)]" : ""}
      `}
    >
      <img
        src={hero.icon_url}
        alt={hero.name}
        className={`block aspect-video w-full rounded-t-control object-cover transition-all duration-300
          ${grayscale ? "grayscale opacity-30" : ""}
          ${highlight ? "shadow-[0_0_10px_2px_rgba(59,130,246,0.7)]" : ""}
        `}
      />
      <h3 className="w-full min-w-0 truncate px-ui-xs text-xs font-medium">
        {hero.name}
      </h3>
    </motion.button>
  );
};

export function TeamDropZone({
  team,
  selectedHeroes,
  handleDrop,
  handleHeroDeselect,
  rolePredictions = {}
}) {
  const [collectedProps, dropRef] = useDrop(() => ({
    accept: "HERO",
    canDrop: (item) => {
      const alreadyPicked =
        selectedHeroes.ally.some(h => h.HeroId === item.hero.HeroId) ||
        selectedHeroes.enemy.some(h => h.HeroId === item.hero.HeroId);

      return selectedHeroes[team].length < 5 && !alreadyPicked;
    },
    drop: (item) => {
      handleDrop(item.hero, team);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [team, selectedHeroes, handleDrop]);

  const isOver = collectedProps.isOver && collectedProps.canDrop;
  const isAlly = team === "ally";
  const heroes2 = isAlly ? selectedHeroes.ally : selectedHeroes.enemy;

  return (
    <div
      ref={dropRef}
      className={`grid w-full min-w-0 grid-cols-5 gap-ui-xs p-ui-xs rounded-control border transition-all duration-200
        ${isOver ? "bg-yellow-500/20" : ""}
        ${isAlly ? "border-green-700" : "border-red-700"}
      `}
    >
      {/* Render in 5 hero slots for picks for each team */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="relative min-w-0 aspect-video bg-surface-raised rounded-control overflow-hidden flex items-center justify-center"
        >
          {heroes2[i] && (
            <div
              className="relative group w-full h-full cursor-pointer"
              onClick={() => handleHeroDeselect(heroes2[i], team)}
            >
              <img
                src={heroes2[i].icon_url}
                alt={heroes2[i].name}
                className="object-cover w-full h-full"
              />
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-75 flex items-center justify-center transition-opacity duration-200">
                <span className="text-red-400 font-bold text-sm">REMOVE</span>
              </div>
            </div>
          )}
          {heroes2[i] && !isAlly && (
            <div className="absolute bottom-0 w-full bg-black/70 text-center z-10 pointer-events-none">
              <span className={`text-[12px] font-semibold ${rolePredictions[heroes2[i].HeroId] === "?"
                ? "text-gray-400 italic"
                : "text-white"
                }`}>
                {rolePredictions[heroes2[i].HeroId] || ""}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};