import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { submitIssueReport } from "../issueReporting/reportIssueApi";

const EMPTY_FIELDS = {
    title: "",
    description: "",
    steps: "",
    os: "Windows"
};

const OS_OPTIONS = ["Windows", "macOS", "Linux", "Other"];

const FIELD_CLASS =
    "w-full rounded-control border bg-surface-raised px-ui-md py-ui-sm text-sm text-ink focus:border-accent disabled:opacity-60";

// Keep labels, errors and input styling consistent across the report fields.
function ReportField({
    id,
    label,
    multiline = false,
    inputRef,
    error,
    ...props
}) {
    const Control = multiline ? "textarea" : "input";

    return (
        <label htmlFor={id} className="grid min-w-0 gap-ui-xs">
            <span className="text-sm font-semibold text-ink">
                {label}
            </span>

            <Control
                {...props}
                id={id}
                ref={inputRef}
                rows={multiline ? 4 : undefined}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                className={`${FIELD_CLASS} ${
                    error ? "border-danger" : "border-line"
                } ${multiline ? "min-h-24 resize-y" : ""}`}
            />

            {error && (
                <span id={`${id}-error`} className="text-xs text-danger">
                    {error}
                </span>
            )}
        </label>
    );
}

export default function ReportIssueButton() {
    const [open, setOpen] = useState(false);
    const [fields, setFields] = useState(EMPTY_FIELDS);
    const [touched, setTouched] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [err, setErr] = useState("");

    const dialogRef = useRef(null);
    const triggerRef = useRef(null);
    const closeButtonRef = useRef(null);
    const titleRef = useRef(null);
    const descriptionRef = useRef(null);
    const submissionPendingRef = useRef(false);

    const datasetGeneratedAt =
        window.__LOCAL_DATASET_MANIFEST__?.generatedAt ||
        window.__SYNERGY_MANIFEST__?.generatedAt ||
        "";

    const errors = {
        title: fields.title.trim() ? "" : "Short title is required.",
        description: fields.description.trim()
            ? ""
            : "Description is required."
    };

    // Opening with showModal puts the dialog above the app and keeps focus inside.
    // Run only when open changes, so typing does not reopen it or reset focus.
    // The flag also pauses the application's global keyboard search.
    useLayoutEffect(() => {
        if (!open) return;

        const dialog = dialogRef.current;
        const trigger = triggerRef.current;

        window.__ISSUE_MODAL_OPEN__ = true;

        if (!dialog.open) dialog.showModal();
        titleRef.current?.focus({ preventScroll: true });

        return () => {
            if (dialog.open) dialog.close();
            window.__ISSUE_MODAL_OPEN__ = false;
            trigger?.focus({ preventScroll: true });
        };
    }, [open]);

    useEffect(() => {
        if (submitted) {
            closeButtonRef.current?.focus({ preventScroll: true });
        }
    }, [submitted]);

    function openDialog() {
        if (submissionPendingRef.current) return;

        setFields(EMPTY_FIELDS);
        setTouched({});
        setErr("");
        setSubmitted(false);
        setOpen(true);
    }

    function closeDialog() {
        // Keep one report session open until its request finishes.
        if (!submissionPendingRef.current) setOpen(false);
    }

    function updateField(name, value) {
        setFields(prev => ({ ...prev, [name]: value }));
    }

    function markTouched(name) {
        setTouched(prev => ({ ...prev, [name]: true }));
    }

    async function onSubmit(event) {
        event.preventDefault();

        // This ref blocks duplicate requests before React disables the button.
        if (submissionPendingRef.current || submitted) return;

        setErr("");
        setTouched({ title: true, description: true });

        if (errors.title || errors.description) {
            const firstInvalid = errors.title ? titleRef : descriptionRef;
            firstInvalid.current?.focus();
            return;
        }

        submissionPendingRef.current = true;
        setSubmitting(true);

        try {
            await submitIssueReport({
                title: fields.title.trim(),
                description: fields.description.trim(),
                context: {
                    createdAt: new Date().toISOString(),
                    os: fields.os,
                    userAgent: navigator.userAgent,
                    steps: fields.steps.trim() || undefined,
                    appVersion: window.__APP_VERSION__ || undefined,
                    datasetGeneratedAt: datasetGeneratedAt || undefined
                }
            });

            setSubmitted(true);
        } catch (error) {
            setErr(error?.message ?? String(error));
        } finally {
            submissionPendingRef.current = false;
            setSubmitting(false);
        }
    }

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                className="ui-footer-link"
                aria-haspopup="dialog"
                aria-expanded={open}
                onKeyDown={event => event.stopPropagation()}
                onClick={openDialog}
            >
                Report an issue
            </button>

            {open && createPortal(
                <dialog
                    ref={dialogRef}
                    aria-labelledby="report-issue-title"
                    className="ui-panel pointer-events-auto m-auto max-h-[calc(100vh_-_2rem)] w-[calc(100%_-_2rem)] max-w-2xl overflow-hidden p-0 text-ink backdrop:bg-black/60 open:flex open:flex-col"
                    onKeyDown={event => event.stopPropagation()}
                    onCancel={event => {
                        event.preventDefault();
                        closeDialog();
                    }}
                    onPointerDown={event => {
                        if (event.target !== event.currentTarget) return;

                        const bounds =
                            event.currentTarget.getBoundingClientRect();

                        // The backdrop targets the dialog too; check coordinates
                        // so clicking empty space inside the card does not close it.
                        if (
                            event.clientX < bounds.left ||
                            event.clientX > bounds.right ||
                            event.clientY < bounds.top ||
                            event.clientY > bounds.bottom
                        ) {
                            closeDialog();
                        }
                    }}
                >
                    <header className="flex shrink-0 items-center justify-between gap-ui-md border-b border-line p-ui-md">
                        <h2
                            id="report-issue-title"
                            className="text-lg font-semibold"
                        >
                            Report an issue
                        </h2>

                        <button
                            ref={closeButtonRef}
                            type="button"
                            aria-label="Close report dialog"
                            className="ui-button h-9 w-9 shrink-0 p-0 text-lg"
                            disabled={submitting}
                            onClick={closeDialog}
                        >
                            ×
                        </button>
                    </header>

                    <form
                        onSubmit={onSubmit}
                        noValidate
                        aria-busy={submitting}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <div className="min-h-0 flex-1 overflow-y-auto p-ui-md">
                            {submitted ? (
                                <p
                                    role="status"
                                    className="py-ui-lg text-sm text-ink"
                                >
                                    Report submitted. Thanks!
                                </p>
                            ) : (
                                <>
                                    <fieldset
                                        disabled={submitting}
                                        className="grid min-w-0 gap-ui-md"
                                    >
                                        <legend className="sr-only">
                                            Issue details
                                        </legend>

                                        <ReportField
                                            id="report-issue-short-title"
                                            label="Short title (required)"
                                            inputRef={titleRef}
                                            required
                                            maxLength={80}
                                            value={fields.title}
                                            onChange={event =>
                                                updateField(
                                                    "title",
                                                    event.target.value
                                                )
                                            }
                                            onBlur={() => markTouched("title")}
                                            error={touched.title ? errors.title : ""}
                                            placeholder="e.g. Hero images missing after first launch"
                                        />

                                        <ReportField
                                            id="report-issue-description"
                                            label="What happened? (required)"
                                            inputRef={descriptionRef}
                                            multiline
                                            required
                                            value={fields.description}
                                            onChange={event =>
                                                updateField(
                                                    "description",
                                                    event.target.value
                                                )
                                            }
                                            onBlur={() =>
                                                markTouched("description")
                                            }
                                            error={
                                                touched.description
                                                    ? errors.description
                                                    : ""
                                            }
                                            placeholder="Describe the issue and what you expected."
                                        />

                                        <ReportField
                                            id="report-issue-steps"
                                            label="Steps to reproduce (optional)"
                                            multiline
                                            value={fields.steps}
                                            onChange={event =>
                                                updateField(
                                                    "steps",
                                                    event.target.value
                                                )
                                            }
                                            placeholder={"1) ...\n2) ...\n3) ..."}
                                        />

                                        <label
                                            htmlFor="report-issue-os"
                                            className="grid min-w-0 gap-ui-xs"
                                        >
                                            <span className="text-sm font-semibold">
                                                Operating system
                                            </span>

                                            <select
                                                id="report-issue-os"
                                                value={fields.os}
                                                onChange={event =>
                                                    updateField(
                                                        "os",
                                                        event.target.value
                                                    )
                                                }
                                                className={`${FIELD_CLASS} max-w-xs border-line`}
                                            >
                                                {OS_OPTIONS.map(option => (
                                                    <option
                                                        key={option}
                                                        value={option}
                                                    >
                                                        {option}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </fieldset>

                                    <p className="mt-ui-md text-xs leading-relaxed text-ink-muted">
                                        Included automatically: timestamp, OS
                                        and browser information.

                                        {datasetGeneratedAt && (
                                            <span className="block">
                                                Dataset updated:{" "}
                                                {new Date(
                                                    datasetGeneratedAt
                                                ).toLocaleString()}
                                            </span>
                                        )}
                                    </p>

                                    {err && (
                                        <p
                                            role="alert"
                                            className="mt-ui-md break-words text-sm text-danger"
                                        >
                                            {err}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-ui-sm border-t border-line p-ui-md">
                            {!submitted && (
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="ui-button ui-button-accent"
                                >
                                    {submitting
                                        ? "Submitting..."
                                        : "Submit report"}
                                </button>
                            )}

                            <button
                                type="button"
                                disabled={submitting}
                                className="ui-button"
                                onClick={closeDialog}
                            >
                                {submitted ? "Done" : "Cancel"}
                            </button>
                        </div>
                    </form>
                </dialog>,
                document.body
            )}
        </>
    );
}