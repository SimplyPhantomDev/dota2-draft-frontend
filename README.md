# Dota 2 Drafting Tool

A desktop application for exploring Dota 2 drafts, comparing hero matchups, and finding suitable picks for your team.

Built with React and Tauri, the tool combines hero synergy data, counter-matchup scores, and team-composition rules to generate recommendations as you enter picks and bans. A personal hero pool helps you compare statistically favourable choices with heroes you actually play.

This repository contains the application interface, drafting logic, and desktop wrapper. Dataset generation is maintained separately in [d2dt-dataset](https://github.com/SimplyPhantomDev/d2dt-dataset).

## Features

- **Interactive drafting:** build allied and enemy teams by clicking or dragging heroes into their slots.
- **Ban tracking:** exclude unavailable heroes from recommendations.
- **Live recommendations:** recalculate suggested picks as the draft changes.
- **Personal hero pool:** save your preferred heroes locally and view recommendations from within and outside your pool.
- **Role filters:** narrow suggestions to Carry or Support heroes.
- **Composition adjustments:** prioritise useful traits when your team lacks initiation, disables, or pushing ability.
- **Score breakdowns:** inspect how allied synergy, enemy matchups, and composition bonuses contribute to recommendations.
- **Full-draft analysis:** compare both teams once all ten heroes have been selected.
- **Enemy role estimates:** suggest positions using predefined hero-role priorities.
- **Hero search:** find heroes by name or configured aliases.
- **Alternative layouts:** switch between grouped and single-row attribute layouts.
- **Dataset update checks:** retrieve newer hero and matchup data independently of application releases.
- **In-app bug reporting:** submit a description, reproduction steps, and application context through the built-in reporting form.

## How recommendations work

For each available hero, the recommendation engine combines:

1. Synergy with heroes already selected by the allied team.
2. Matchup scores against heroes selected by the enemy team.
3. Composition bonuses for useful traits missing from the allied draft.

Picked and banned heroes are excluded. The selected role filter is applied before the remaining candidates are ranked.

Composition bonuses encourage an initiator after the second allied pick and disablers or pushers after the third pick when those traits are still missing.

When personal-pool filtering is enabled, the interface displays up to three suggestions from your pool alongside up to ten suggestions from outside it.

### Full-draft analysis

Once both teams contain five heroes, the application calculates individual hero scores and combined team scores using allied synergy and opposing matchups.

The composition bonuses used during recommendations are excluded from this final comparison.

The displayed win percentage is a heuristic transformation of the difference between team scores, bounded between 20% and 80%. It indicates relative draft strength rather than a measured probability of winning. Player skill, execution, item choices, and coordination are outside the calculation.

### Enemy role estimates

Enemy positions are assigned using predefined primary, secondary, and fallback roles. The algorithm attempts to avoid assigning the same position to multiple heroes and displays `?` when it cannot find an available role.

## Data and updates

The application uses three main data files:

| File | Purpose |
| --- | --- |
| `heroes.json` | Hero names, IDs, attributes, role tags, image URLs, and search aliases. |
| `synergyMatrix.json` | Matchup and synergy values used by the recommendation engine. |
| `hero-roles.json` | Position priorities used for enemy-role estimates. |

Hero and matchup data are generated from the STRATZ API in the companion [dataset repository](https://github.com/SimplyPhantomDev/d2dt-dataset).

The desktop application stores local copies of `heroes.json` and `synergyMatrix.json` in its application-data directory. It checks a remote manifest and downloads replacement files when the remote generation timestamp is newer than the local timestamp.

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

**Issue reporting is optional.** Set this variable before building to enable report submissions. The application starts normally without it; attempts to submit a report show "Issue reporting is unavailable with this build."

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

## Usage

1. Select whether clicks should add heroes to the allied or enemy team, or drag heroes directly into the desired team.
2. Right-click an available hero to ban it.
3. Type a hero name or alias to highlight matching heroes.
4. Use **EDIT POOL** to add or remove heroes from your personal pool, then leave editing mode to resume drafting.
5. Enable **Hero Pool** filtering once your pool contains at least three heroes.
6. Apply the **Carry** or **Support** filter when appropriate.
7. Hover over recommendations to inspect their score breakdowns.
8. Fill both teams to display the full-draft comparison.

Click a drafted hero to remove it. **CLEAR BANS** removes bans, while **CLEAR ALL** resets the current draft and bans without deleting your saved hero pool.

The interface is designed for desktop mouse and keyboard use.

## Project structure

| Location | Responsibility |
| --- | --- |
| `src/pages/HeroList.jsx` | Main application state, data loading, search, draft actions, and recommendation updates. |
| `src/components/` | Draft controls, hero cards, team drop zones, analysis panels, and the reporting form. |
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
