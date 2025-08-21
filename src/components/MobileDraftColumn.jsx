import MobileSlot from "./MobileSlot";

export default function MobileDraftColumn({ title, picks }) {
    return (
        <div>
            <div className="text-center font-semibold mb-2">{title}</div>
            <div className="grid gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <MobileSlot key={i} hero={picks} />
                ))}
            </div>
        </div>
    );
}