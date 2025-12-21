import { useEffect, useMemo, useRef, useState } from "react";
import { submitIssueReport } from "../issueReporting/reportIssueApi";

const modalStyles = {
    overlay: {
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.65)",
        display: "grid",
        placeItems: "center",
        padding: 16
    },
    card: {
        width: "min(720px, 100%)",
        borderRadius: 16,
        padding: 18,
        background: "rgba(20, 24, 30, 0.98)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
        color: "rgba(255,255,255,0.92)",
        maxHeight: "min(78vh, 780px)",
        overflow: "auto"
    },
    headerRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12
    },
    title: { margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: 0.2, },
    closeBtn: {
        padding: "6px 10px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.10)",
        color: "rgba(255,255,255,0.9)",
        cursor: "pointer"
    },
    form: { marginTop: 14 },
    field: { display: "grid", gap: 6 },
    label: {
        fontSize: 15,
        fontWeight: 600,
        color: "rgba(255,255,255,0.88)"
    },
    help: {
        fontSize: 12,
        color: "rgba(255,255,255,0.65)",
        lineHeight: 1.35
    },
    input: {
        padding: "10px 12px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        color: "rgba(255,255,255,0.92)",
        outline: "none",
        fontSize: 13
    },
    textarea: {
        padding: "10px 12px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        color: "rgba(255,255,255,0.92)",
        outline: "none",
        fontSize: 13,
        minHeight: 110,
        resize: "vertical"
    },
    select: {
        padding: "10px 12px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        color: "rgba(255,255,255,0.92)",
        outline: "none",
        fontSize: 13,
        maxWidth: 240
    },
    actions: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 },
    primaryBtn: {
        padding: "8px 12px",
        borderRadius: 12,
        background: "rgba(70, 140, 255, 0.25)",
        border: "1px solid rgba(70, 140, 255, 0.35)",
        color: "rgba(255,255,255,0.95)",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700
    },
    ghostBtn: {
        padding: "8px 12px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        color: "rgba(255,255,255,0.85)",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 600
    },
    error: { fontSize: 12, color: "rgba(255,120,120,0.95)" }
};

export default function ReportIssueButton() {
    const OS_OPTIONS = ["Windows", "macOS", "Linux", "Other"];
    const [open, setOpen] = useState(false);

    // form fields
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [steps, setSteps] = useState("");
    const [os, setOs] = useState("Windows");
    const [osOpen, setOsOpen] = useState(false);
    const osRef = useRef(null);
    const [touched, setTouched] = useState({ title: false, description: false });
    const [fieldErr, setFieldErr] = useState({ title: "", description: "" });

    // submit state
    const [submitting, setSubmitting] = useState(false);
    const [err, setErr] = useState("");
    const [successUrl, setSuccessUrl] = useState("");

    // Field errors
    const showTitleErr = touched.title && !!fieldErr.title;
    const showDescErr = touched.description && !!fieldErr.description;

    // context
    const datasetGeneratedAt = useMemo(() => {
        // if you later expose local manifest on window, this will pick it up
        const m = window.__LOCAL_DATASET_MANIFEST__ || window.__SYNERGY_MANIFEST__ || null;
        return m?.generatedAt || "";
    }, [open]);

    useEffect(() => {
        if (!open) return;

        // reset modal state every time it opens
        setErr("");
        setSuccessUrl("");
        setSubmitting(false);
        setTouched({ title: false, description: false });
        setFieldErr({ title: "", description: "" });

        // optional: keep title/description if you want; I reset them
        setTitle("");
        setDescription("");
        setSteps("");
        setOs("Windows");
    }, [open]);

    useEffect(() => {
        window.__ISSUE_MODAL_OPEN__ = open;
        return () => {
            window.__ISSUE_MODAL_OPEN__ = false;
        };
    }, [open]);

    useEffect(() => {
        function onDown(e) {
            if (osRef.current && !osRef.current.contains(e.target)) setOsOpen(false);
        }
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");
        setSuccessUrl("");

        const v = validate();
        setTouched({ title: true, description: true });
        setFieldErr(v);

        if (hasErrors(v)) {
            setSubmitting(false);
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                title: title.trim(),
                description: description.trim(),
                context: {
                    createdAt: new Date().toISOString(),
                    os,
                    userAgent: navigator.userAgent,
                    steps: steps.trim() || undefined,
                    appVersion: window.__APP_VERSION__ || undefined,
                    datasetGeneratedAt: (window.__LOCAL_DATASET_MANIFEST__?.generatedAt) || undefined
                }
            };

            const res = await submitIssueReport(payload);
            setSuccessUrl(res.issueUrl);
        } catch (e2) {
            setErr(e2?.message ?? String(e2));
        } finally {
            setSubmitting(false);
        }
    };

    const validate = () => {
        const e = { title: "", description: "" };
        if (!title.trim()) e.title = "Short title is required.";
        if (!description.trim()) e.description = "Description is required.";
        return e;
    };

    const hasErrors = (e) => Boolean(e.title || e.description);

    const inputWithError = (base, isErr) => ({
        ...base,
        border: isErr ? "1px solid rgba(255,120,120,0.75)" : base.border
    });

    return (
        <>
            {/* Bottom-center button */}
            <div
                style={{
                    position: "fixed",
                    left: "50%",
                    bottom: 14,
                    transform: "translateX(-50%)",
                    zIndex: 50
                }}
            >
                <button
                    onClick={() => setOpen(true)}
                    style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        fontSize: 16,
                        opacity: 0.9
                    }}
                >
                    Report an issue
                </button>
            </div>

            {/* Overlay */}
            {open && (
                <div
                    style={modalStyles.overlay}
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setOpen(false);
                    }}
                >
                    <div
                        style={modalStyles.card}
                    >
                        <div style={modalStyles.headerRow}>
                            <h3 style={modalStyles.title}>Report an issue</h3>
                            <button onClick={() => setOpen(false)} style={modalStyles.closeBtn}>
                                Close
                            </button>
                        </div>

                        {/* Success */}
                        {successUrl ? (
                            <div style={{ marginTop: 12, fontSize: 15, lineHeight: 1.4 }}>
                                <div style={{ marginBottom: 10 }}>
                                    ✅ Report submitted. Thanks!
                                </div>
                            </div>
                        ) : (
                            // Form
                            <form onSubmit={onSubmit} style={{ marginTop: 12 }}>
                                <div style={{ display: "grid", gap: 10 }}>
                                    <label style={modalStyles.field}>
                                        <span style={modalStyles.label}>Short title (required)</span>
                                        <input
                                            value={title}
                                            autoFocus
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setTitle(v);
                                                if (touched.title) {
                                                    setFieldErr((prev) => ({ ...prev, title: v.trim() ? "" : "Short title is required." }));
                                                }
                                            }}
                                            onBlur={() => {
                                                setTouched((prev) => ({ ...prev, title: true }));
                                                setFieldErr((prev) => ({ ...prev, title: title.trim() ? "" : "Short title is required." }));
                                            }}
                                            placeholder="e.g. Hero images missing after first launch"
                                            style={inputWithError(modalStyles.input, showTitleErr)}
                                            maxLength={80}
                                        />
                                        {showTitleErr && <div style={modalStyles.error}>{fieldErr.title}</div>}
                                    </label>

                                    <label style={modalStyles.field}>
                                        <span style={modalStyles.label}>What happened? (required)</span>
                                        <textarea
                                            value={description}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setDescription(v);
                                                if (touched.description) {
                                                    setFieldErr((prev) => ({ ...prev, description: v.trim() ? "" : "Description is required." }));
                                                }
                                            }}
                                            onBlur={() => {
                                                setTouched((prev) => ({ ...prev, description: true }));
                                                setFieldErr((prev) => ({ ...prev, description: description.trim() ? "" : "Description is required." }));
                                            }}
                                            placeholder="Describe the issue and what you expected."
                                            style={inputWithError(modalStyles.textarea, showDescErr)}
                                        />
                                        {showDescErr && <div style={modalStyles.error}>{fieldErr.description}</div>}
                                    </label>

                                    <label style={modalStyles.field}>
                                        <span style={modalStyles.label}>Steps to reproduce (optional)</span>
                                        <textarea
                                            value={steps}
                                            onChange={(e) => setSteps(e.target.value)}
                                            placeholder={"1) ...\n2) ...\n3) ..."}
                                            style={modalStyles.textarea}
                                        />
                                    </label>

                                    <div style={{ ...modalStyles.field, position: "relative", maxWidth: 260 }} ref={osRef}>
                                        <span style={modalStyles.label}>Operating system</span>

                                        <button
                                            type="button"
                                            onClick={() => setOsOpen((v) => !v)}
                                            style={{
                                                ...modalStyles.select,
                                                width: "100%",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                cursor: "pointer"
                                            }}
                                        >
                                            <span>{os}</span>
                                            <span style={{ opacity: 0.7 }}>▾</span>
                                        </button>

                                        {osOpen && (
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    top: 0,
                                                    left: "calc(95%)",
                                                    width: 220,
                                                    zIndex: 999,
                                                    background: "rgba(20, 24, 30, 0.98)",
                                                    border: "1px solid rgba(255,255,255,0.10)",
                                                    borderRadius: 12,
                                                    overflow: "hidden",
                                                    boxShadow: "0 18px 60px rgba(0,0,0,0.55)"
                                                }}
                                            >
                                                {OS_OPTIONS.map((opt) => (
                                                    <button
                                                        key={opt}
                                                        type="button"
                                                        onClick={() => {
                                                            setOs(opt);
                                                            setOsOpen(false);
                                                        }}
                                                        style={{
                                                            width: "100%",
                                                            textAlign: "left",
                                                            padding: "8px 12px",
                                                            background: "transparent",
                                                            border: "none",
                                                            color: "rgba(255,255,255,0.92)",
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Read-only context */}
                                    <div style={modalStyles.help}>
                                        <div><b>Auto included:</b> timestamp, OS, user agent</div>
                                        {datasetGeneratedAt ? (
                                            <div><b>Dataset generatedAt:</b> {datasetGeneratedAt}</div>
                                        ) : (
                                            <div><b>Dataset generatedAt:</b> (not available yet)</div>
                                        )}
                                    </div>

                                    {err && (
                                        <div style={modalStyles.error}>
                                            <b>Error:</b> {err}
                                        </div>
                                    )}

                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            style={modalStyles.primaryBtn}
                                        >
                                            {submitting ? "Submitting..." : "Submit"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setOpen(false)}
                                            disabled={submitting}
                                            style={modalStyles.ghostBtn}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
