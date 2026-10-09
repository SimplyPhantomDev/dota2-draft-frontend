# Dota 2 Drafting Tool

A desktop application for exploring Dota 2 drafts, comparing hero matchups, and finding suitable picks for your team.

Built with React and Tauri, the tool combines hero synergy data, counter-matchup scores, and team-composition rules to generate recommendations as you enter picks and bans. A personal hero pool helps you compare statistically favourable choices with heroes you actually play.

This repository contains the application interface, drafting logic, and desktop wrapper. Dataset generation is maintained separately in [d2dt-dataset](https://github.com/SimplyPhantomDev/d2dt-dataset).

## Features

- **Interactive drafting:** build allied and enemy teams by clicking or dragging heroes into their slots.
- **Ban tracking:** exclude unavailable heroes from recommendations.
- **Live recommendations:** recalculate suggested picks as the draft changes.
- **Personal hero pool:** save preferred heroes locally, compare pool and global recommendations, and open a full pool score breakdown.
- **Role filters:** narrow suggestions to Carry or Support heroes.
- **Composition adjustments:** prioritise useful traits when your team lacks initiation, disables, or pushing ability.
- **Score breakdowns:** inspect how allied synergy, enemy matchups, and composition bonuses contribute to recommendations.
- **Draft overview:** open a modal at any draft stage to compare each picked hero's ally synergy, enemy matchup and total scores, without a win-probability estimate.
- **Full-draft analysis:** compare individual hero scores, team totals, and estimated draft advantage once all ten heroes have been selected.
- **Enemy role estimates:** suggest positions using predefined hero-role priorities.
- **Hero search:** find heroes by name or configured aliases.
- **Alternative layouts:** choose a 2-by-2 arrangement of attribute panels or four equal-height panels side by side.
- **Responsive desktop interface:** resize hero cards and draft controls while keeping the hero grid and recommendation list independently scrollable.
- **Built-in help:** open the drafting guide and an explanation of the win-percentage estimate.
- **Dataset update checks:** retrieve newer hero and matchup data independently of application releases.
- **In-app bug reporting:** submit a description, reproduction steps, and application context through the built-in reporting form.

## How recommendations work

For each available hero, the recommendation engine combines:

1. Synergy with heroes already selected by the allied team.
2. Matchup scores against heroes selected by the enemy team.
3. Composition bonuses for useful traits missing from the allied draft.

Picked and banned heroes are excluded. The selected role filter is applied before the remaining candidates are ranked.

Composition bonuses encourage an initiator after the second allied pick and disablers or pushers after the third pick when those traits are still missing.

During drafting, personal-pool filtering displays up to three suggestions from your pool alongside up to ten suggestions from outside it.

When the floating full-pool breakdown is open, pool scores appear in that panel and the sidebar displays the suggestions from outside your pool.

### Full-draft analysis

Once both teams contain five heroes, the application calculates individual hero scores and combined team scores using allied synergy and opposing matchups.

The composition bonuses used during recommendations are excluded from this final comparison.

When all ten selected heroes have valid seven-day win rate baselines and complete matchup data, the displayed percentages use a baseline-adjusted heuristic. Each hero's baseline is adjusted by the equally weighted averages of its ally synergy and opponent matchup scores. The hero estimates are averaged within each team, then the ally estimate is averaged with the enemy's implied loss estimate. The displayed percentages sum to 100%.

If the required data is unavailable, the application uses the existing transformation of the team-score difference, bounded between 20% and 80%.

Both calculations are heuristics that have not been validated against match results. Player skill, execution, item choices, and coordination are outside the calculation.

### Enemy role estimates

Enemy positions are assigned using predefined primary, secondary, and fallback roles. The algorithm attempts to avoid assigning the same position to multiple heroes and displays `?` when it cannot find an available role.

## Interface and window sizes

The interface is designed for desktop mouse and keyboard use, with a minimum layout target of **1280 x 720**.

The desktop application opens maximized. Its restored window size and minimum permitted size are both 1280 x 720, configured in `src-tauri/tauri.conf.json`. Tauri window dimensions use [logical pixels](https://v2.tauri.app/reference/config/#windowconfig), so account for Windows display scaling when checking available screen space.

### Hero layouts and scrolling

- **Default layout:** Strength and Agility panels above Intelligence and Universal panels, forming a 2-by-2 arrangement.
- **Row layout:** all four attribute panels side by side with equal height.

The selected arrangement is retained as the window resizes. Hero cards adjust their column count within each attribute panel.

The hero grid and sidebar recommendations scroll independently. Draft controls, suggestion filters, patch information, and the centered **Report an issue** footer link remain accessible while scrolling.

Below 1536px viewport width, ban slots use two rows and the action buttons move beside them.

### Full hero pool breakdown

While personal-pool filtering is enabled and allied picks are still incomplete, use the questionmark button beside the pool-recommendations heading to open the full pool scores.

- At viewport widths of at least **1800px** and heights of at least **720px**, the breakdown opens as a floating panel to the left of the sidebar. Drafting remains interactive, and the sidebar shows suggestions from outside your pool.
- In smaller viewports, it opens as a centered modal with a scrollable list.

The panel changes mode when resizing across these thresholds. Close it with its close button; Escape also closes it while focus is inside the panel.

### Help and issue reporting

The info button beside the application title opens the drafting guide at the top of the sidebar and brings it into view. The info button beside the win percentages expands an explanation below them.

The reporting dialog keeps its title and action buttons visible while the form body scrolls. Required fields are validated before submission. While a request is pending, the form and dismissal controls are disabled; failed submissions display an error and allow a retry with the entered text preserved.

## Data and updates

The application uses three main data files:

| File | Purpose |
| --- | --- |
| `heroes.json` | Hero names, IDs, attributes, role tags, image URLs, and search aliases. |
| `synergyMatrix.json` | Matchup and synergy values used by the recommendation engine. |
| `hero-roles.json` | Position priorities used for enemy-role estimates. |

Hero and matchup data are generated from the STRATZ API in the companion [dataset repository](https://github.com/SimplyPhantomDev/d2dt-dataset).

The desktop application caches matching copies of `heroes.json`, `synergyMatrix.json`, and their manifest in its application-data directory. During startup, it checks for newer data and verifies file sizes, SHA-256 hashes, and dataset structure before activating an update. If the update fails or network requests time out, it uses the verified local dataset. Dataset generation dates are retained from the original manifests.

Position metadata in `hero-roles.json` is currently bundled with the application.

Draft calculations run locally. Dataset updates, remotely hosted hero images, and bug-report submissions use network services.

## Technology

| Technology | Purpose |
| --- | --- |
| React 19 | Interface components and application state. |
| JavaScript | Drafting logic, scoring, filtering, and data handling. |
| Tauri 2 and Rust | Desktop application runtime and native integration. |
| Vite 7 | Frontend development server and production builds. |
| Tailwind CSS | Interface styling. |
| Framer Motion | Animations and layout transitions. |
| React DnD | Drag-and-drop hero selection. |
| Tauri filesystem and HTTP plugins | Local dataset storage and native HTTP requests. |
| `localStorage` | Persistent personal hero pool. |

## Development setup

### Requirements

- Node.js 22.12 or newer and npm.
- A current stable Rust toolchain.
- The platform dependencies listed in the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/).

On Windows, Tauri development requires Microsoft C++ Build Tools with the **Desktop development with C++** workload and the Microsoft Edge WebView2 runtime.

### Install dependencies

```bash
git clone https://github.com/SimplyPhantomDev/dota2-draft-frontend.git
cd dota2-draft-frontend
npm ci
```

### Configure issue reporting

Create a `.env.local` file in the repository root and set the base URL of the issue-reporting service:

```dotenv
VITE_ISSUE_API_BASE_URL=https://d2dt-dataset.vercel.app
```

The example hostname is included in the current Tauri HTTP allowlist. If you deploy the reporting service elsewhere, update both this value and the permitted URL in `src-tauri/capabilities/default.json`.

The client appends `/api/report-issue` to this base URL.

**Issue reporting is optional.** Set this variable before building to enable report submissions. The application starts normally without it; attempts to submit a report show "Issue reporting is unavailable in this build."

Vite embeds `VITE_` variables into the frontend build. This setting is a public service URL; API credentials belong in the backend or dataset-generation environment.

Restart the development server after changing environment variables.

### Run the desktop application

```bash
npm run tauri:dev
```

Tauri starts the configured Vite development server automatically.

### Build the desktop application

```bash
npm run tauri:build
```

This builds the frontend and creates desktop bundles according to `src-tauri/tauri.conf.json`.

### Available commands

| Command | Purpose |
| --- | --- |
| `npm run tauri:dev` | Run the application inside the Tauri desktop runtime. |
| `npm run tauri:build` | Build and bundle the desktop application. |
| `npm run dev` | Start the frontend-only Vite development server. |
| `npm run build` | Build frontend assets into `dist/`. |
| `npm run preview` | Preview the built frontend assets. |
| `npm run lint` | Run ESLint. |

Frontend-only development can be useful for interface work. Native filesystem access and the Tauri HTTP reporting client require the desktop runtime.

The existing GitHub Actions workflow builds and deploys the web frontend to SiteGround. Desktop packaging uses the Tauri build command.

### Checking interface changes

Use `npm run dev` for browser viewport checks and `npm run tauri:dev` for native window behavior.

Check both hero layouts at these suggested CSS viewport sizes:

| Viewport | Main checks |
| --- | --- |
| 1280 x 720 | Compact draft controls, two-row bans, hover labels, and dialog scrolling. |
| 1920 x 1080 | Standard desktop layout, recommendations, and floating pool breakdown. |
| 2560 x 1440 | Panel proportions, card spacing, and tooltip placement. |
| 3840 x 2160 | Large-viewport spacing and both hero layouts. |

In [Chrome DevTools](https://developer.chrome.com/docs/devtools/device-mode), select **Desktop** as the device type when resizing the emulated viewport. This retains mouse input for dragging and right-click bans. Touch emulation changes the input events.

Include partial and completed drafts, pool editing and filtering, score hovers, and the guide and report dialog. Resize with the pool breakdown open to check its floating-panel/modal transition.

Check report validation with empty fields. Mock `submitIssueReport` for request success and failure tests.

## Usage

1. Select whether clicks should add heroes to the allied or enemy team, or drag heroes directly into the desired team.
2. Right-click an available hero to ban it.
3. Type a hero name or alias to highlight matching heroes.
4. Use **EDIT POOL** to add or remove heroes from your personal pool, then leave editing mode to resume drafting.
5. Enable **Hero Pool** filtering once your pool contains at least three heroes.
6. Apply the **Carry** or **Support** filter when appropriate.
7. Hover over recommendations to inspect their score breakdowns.
8. Fill both teams to display the full-draft comparison.

Press **F2** while the application is focused to switch the click-pick destination. It also works while hero search is focused.
Press **F3** or click the **eye icon** to open the current draft scores. Press **F3**, **Escape**, or the close button to dismiss the overview. F3 is a focused shortcut and respects other modal dialogs and editable fields.
Scores include current picks only and exclude recommendation composition bonuses.
Manual team switching is disabled when either team is full; the selector automatically chooses the team with space.
Modal dialogs and other editable fields keep their keyboard input.
Click a drafted hero to remove it.
**CLEAR BANS** removes bans, while **CLEAR ALL** resets the current draft and bans without deleting your saved hero pool.

The interface is designed for desktop mouse and keyboard use.

## Project structure

| Location | Responsibility |
| --- | --- |
| `src/pages/HeroList.jsx` | Main application state, data loading, search, draft actions, and recommendation updates. |
| `src/components/` | Draft controls, hero cards, team drop zones, analysis panels, and the reporting form. |
| `src/index.css` and `tailwind.config.js` | Shared colors, spacing, typography, panels, buttons, and footer styling. |
| `src/components/HeroPoolBreakdown.jsx` | Full pool scores and adaptive floating-panel/modal presentation. |
| `src/components/HoverTooltip.jsx` | Hero score breakdown positioning within the viewport. |
| `src/components/ReportIssueButton.jsx` | Report dialog, field validation, and submission state. |
| `src/utils/synergy.js` | Recommendation scoring, personal-pool analysis, and the heuristic win-percentage calculation. |
| `src/utils/predictRoles.js` | Enemy position assignment. |
| `src/tauriDataset.js` | Local dataset initialisation, manifest checks, and downloaded data updates. |
| `src/issueReporting/` | Client requests to the reporting backend. |
| `public/` | Bundled hero, matchup, and position data. |
| `src-tauri/` | Rust application entry points, desktop configuration, permissions, and icons. |

## Bug reports and contributions

The built-in reporting form submits reports to the backend maintained in [d2dt-dataset](https://github.com/SimplyPhantomDev/d2dt-dataset).

External pull requests and code contributions are not currently accepted. See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution policy.

For project enquiries or licensing discussions, contact **phantomdevprojects@gmail.com**.

## Author

Tomi Niemelä - [SimplyPhantomDev](https://github.com/SimplyPhantomDev)

## License

Copyright © 2026 Tomi Niemelä. All rights reserved.

This is a proprietary project. Its source code is publicly visible for review.

No part of this application, its source code, assets, or underlying logic may be copied, modified, distributed, or used without explicit written permission from the author.
