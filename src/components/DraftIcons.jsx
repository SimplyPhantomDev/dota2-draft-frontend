function Icon({ children, className = "h-5 w-5" }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            className={className}
        >
            {children}
        </svg>
    );
}

export function OverviewIcon() {
    return (
        <Icon>
            <path d="M2.5 12C4.7 7.8 7.9 5.8 12 5.8s7.3 2 9.5 6.2c-2.2 4.2-5.4 6.2-9.5 6.2S4.7 16.2 2.5 12Z" />
            <circle cx="12" cy="12" r="2.6" />
        </Icon>
    );
}

export function GridLayoutIcon() {
    return (
        <Icon>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </Icon>
    );
}

export function RowLayoutIcon() {
    return (
        <Icon>
            <rect x="3" y="3" width="18" height="18" rx="1.5" />
            <path d="M7.5 3v18M12 3v18M16.5 3v18" />
        </Icon>
    );
}

export function InspectionIcon() {
    return (
        <Icon>
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m15.5 15.5 5.5 5.5" />
        </Icon>
    );
}