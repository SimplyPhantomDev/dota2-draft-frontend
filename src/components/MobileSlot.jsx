export default function MobileSlot({ hero, onTap }) {
  return (
    <div
      className="relative h-12 w-full rounded border border-gray-700 flex items-center overflow-hidden"
      onClick={onTap}
      role="button"
      tabIndex={0}
    >
      {hero ? (
        <>
          {/* Icon hugs left; height exactly 48px (h-12) */}
          <img
            src={hero.icon_url}
            alt={hero.name}
            className="h-full w-auto object-contain pointer-events-none mr-2"
          />
          {/* Name fills remaining space */}
          <div className="flex-1 text-sm leading-tight text-white truncate">
            {hero.name}
          </div>
        </>
      ) : (
        <span className="mx-auto text-gray-400 text-sm">Empty</span>
      )}
    </div>
  );
}