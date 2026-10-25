// Send one saved report through the existing Vercel backend.
// Only a matching successful acknowledgement permits local queue removal.
import { fetch } from "@tauri-apps/plugin-http";

const BASE_URL = import.meta.env.VITE_ISSUE_API_BASE_URL;

export async function submitMatchResult(report, { signal } = {}) {
    if (!BASE_URL) {
        throw new Error("Match reporting is unavailable in this build.");
    }

    const controller = new AbortController();
    const cancel = () => controller.abort();

    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) cancel();

    const timer = setTimeout(cancel, 20000);

    try {
        if (controller.signal.aborted) {
            throw new Error("Sending cancelled.");
        }

        const response = await fetch(
            `${BASE_URL.replace(/\/+$/, "")}/api/report-match`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(report),
                connectTimeout: 10000,
                signal: controller.signal,
            }
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                data?.error
          || `Sending failed (${response.status}). Try again later.`
            );
        }

        if (
            ![200, 201].includes(response.status)
      || data?.ok !== true
      || typeof data.draftId !== "string"
      || data.draftId.toLowerCase() !== report.draftId.toLowerCase()
      || typeof data.duplicate !== "boolean"
        ) {
            throw new Error(
                "The server did not confirm this report. It remains saved for retry."
            );
        }

        return data;
    } catch (error) {
        if (controller.signal.aborted && !signal?.aborted) {
            throw new Error("Sending timed out. Please try again.", { cause: error });
        }

        throw error;
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", cancel);
    }
}