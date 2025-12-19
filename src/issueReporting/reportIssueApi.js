import { fetch } from "@tauri-apps/plugin-http";

const BASE_URL = import.meta.env.VITE_ISSUE_API_BASE_URL;

if (!BASE_URL) {
    throw new Error("Missing VITE_ISSUE_API_BASE_URL in .env");
}

export async function submitIssueReport(payload) {
    const res = await fetch(`${BASE_URL}/api/report-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data?.error || `Issue submit failed (${res.status})`);
    }

    return data;
}