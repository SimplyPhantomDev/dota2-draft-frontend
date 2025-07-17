import { motion } from "framer-motion"
import { useDrag, useDrop } from "react-dnd";

export function DraggableHero({ hero, isPicked, handleHeroClick, handleHeroBan, grayscale, highlight, glowPurple }) {
    const [{ isDragging }, drag] = useDrag(() => ({
      type: "HERO",
      item: { hero },
      canDrag: !isPicked,
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
        <motion.button
        layout="position"
        transition={{ layout: { duration: 0.4, ease: "easeInOut" } }}
        ref={drag}
        onClick={handleClick}
        onContextMenu={handleRightClick}
        disabled={isPicked}
        className={`w-[106px] h-[76px] rounded shadow text-center transition-transform duration-300
          ${isPicked ? "bg-gray-500 opacity-40 cursor-not-allowed" : "bg-gray-700 hover:ring-2 hover:ring-yellow-400 hover:scale-[1.03]"}
          ${isDragging ? "opacity-30" : ""}
          ${glowPurple ? "animate-pulseSlow shadow-[0_0_12px_2px_rgba(128,0,128,0.6)]" : ""}
        `}
        >
        <img src={hero.icon_url} alt={hero.name} className={`w-full rounded h-15 object-contain mx-auto transition-all duration-300 ${
        grayscale ? "grayscale opacity-30" : ""} ${highlight ? "shadow-[0_0_10px_2px_rgba(59,130,246,0.7)]" : ""}
        `} />
        <h3 className="text-xs font-medium px-1 truncate">{hero.name}</h3>
        </motion.button>
    );
};

export function TeamDropZone ({ team, selectedHeroes, handleDrop, handleHeroDeselect }) {
    const [collectedProps, dropRef] = useDrop(() => ({
    accept: "HERO",
    canDrop: () => {
      const teamHeroes = team === "ally" ? selectedHeroes.ally : selectedHeroes.enemy;
      return teamHeroes.length < 5;
    },
    drop: (item, monitor) => {
      const teamHeroes = team === "ally" ? selectedHeroes.ally : selectedHeroes.enemy;
      // Safety check: prevent drop if team is full
      if (teamHeroes.length < 5) {
        handleDrop(item.hero, team);
      }
    },
    collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
    }),
    }));
  
    const isOver = collectedProps.isOver;
    const canDrop = collectedProps.canDrop;
    const isAlly = team === "ally";
    const heroes2 = isAlly ? selectedHeroes.ally : selectedHeroes.enemy;
  
    return (
    <div
      ref={dropRef}
      className={`flex gap-2 p-1 rounded border transition-all duration-200
        ${isOver ? "bg-yellow-500/20" : ""}
        ${isAlly ? "border-green-700" : "border-red-700"}
      `}
    >
      {/* Render in 5 hero slots for picks for each team */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="relative w-[106px] h-[60px] bg-gray-700 rounded overflow-hidden flex items-center justify-center">
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
};