/*
This component provides the manual reporting button
and an expanded reminder. It displays the saved teams,
allowing the user to identify the match even after
changing the current draft. Placed inside sidebar's
scroll view.
*/

import { useState } from "react";

export default function MatchFeedbackPanel({ feedback, heroes }) {
  const [openedDraftId, setOpenedDraftId] = useState(null);

  if (!feedback?.enabled) return null;

  const {
    pendingDraft,
    reminderDue,
    error,
    message,
    resolveDraft,
  } = feedback;

  if (!pendingDraft) {
    return error
      ? <p role="alert" className="text-xs text-danger">{error}</p>
      : message
        ? <p role="status" className="text-xs text-ink-muted">{message}</p>
        : null;
  }

  if (!reminderDue && openedDraftId !== pendingDraft.id) {
    return (
      <button
        type="button"
        className="ui-button w-full text-xs"
        onClick={() => setOpenedDraftId(pendingDraft.id)}
      >
        Record a match result
      </button>
    );
  }

  const heroList = Object.values(heroes ?? {}).flat();

  const teamNames = ids => ids.map(id => (
    heroList.find(hero => Number(hero.HeroId) === id)?.name ?? `Hero ${id}`
  )).join(", ");

  return (
    <section
      aria-label="Match feedback"
      className="rounded-control border border-line bg-surface-raised p-ui-md text-xs"
      onKeyDown={event => event.stopPropagation()}
    >
      <h3 className="text-sm font-semibold text-ink">
        Did you play this draft?
      </h3>

      <p className="mt-ui-xs text-ink-muted">
        Saved {new Date(pendingDraft.capturedAt).toLocaleString()}.
        {" "}Record its result if you played it.
      </p>

      <dl className="my-ui-sm space-y-ui-xs leading-relaxed">
        <div>
          <dt className="font-semibold text-green-400">Ally team</dt>
          <dd className="text-ink">
            {teamNames(pendingDraft.allyHeroIds)}
          </dd>
        </div>

        <div>
          <dt className="font-semibold text-danger">Enemy team</dt>
          <dd className="text-ink">
            {teamNames(pendingDraft.enemyHeroIds)}
          </dd>
        </div>
      </dl>

      <div className="grid grid-cols-2 gap-ui-sm">
        <button
          type="button"
          className="ui-button ui-button-accent"
          onClick={() => resolveDraft(pendingDraft.id, "ally-win")}
        >
          Ally win
        </button>

        <button
          type="button"
          className="ui-button"
          onClick={() => resolveDraft(pendingDraft.id, "ally-loss")}
        >
          Ally loss
        </button>

        <button
          type="button"
          className="ui-button"
          onClick={() => resolveDraft(pendingDraft.id, "not-played")}
        >
          Didn't play
        </button>

        <button
          type="button"
          className="ui-button"
          onClick={() => resolveDraft(pendingDraft.id, "dismiss")}
        >
          Dismiss
        </button>
      </div>

      <p className="mt-ui-sm text-ink-muted">
        Saved on this device only. No result is submitted automatically.
      </p>

      {error && (
        <p role="alert" className="mt-ui-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}