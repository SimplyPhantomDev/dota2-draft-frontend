export default function MobileSlot({ hero, onTap }) {
    return (
        <div
            className="h-12 rounded border border-gray-700 flex items-center justify-center overflow-hidden"
            onClick={onTap}
            onTouchEnd={(e) => {
                if (onTap) onTap();
            }}
            role="button"
            tabIndex={0}
        >
            {hero ? (
                <img src={hero.icon_url} alt={hero.name} className="h-full object-contain" />
            ) : (
                <span className="text-gray-400 text-sm">Empty</span>
            )}
        </div>
    )
}