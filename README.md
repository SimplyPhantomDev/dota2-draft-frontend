# Dota 2 Drafting Tool

The Dota 2 Drafting Tool helps players make smarter pick decisions using real-time hero synergy, ban tracking, and win probability calculations. Built with React and animated using Framer Motion, this intuitive interface is optimized for both competitive analysis and casual drafting.

---

## Features

- **Real-time synergy suggestions** based on picked and banned heroes
- **Hero pool system** for personalized recommendations
- **Role filters** (Carry / Support) to fine-tune suggestions
- **Drag-and-drop hero selection** with animated UI
- **Full draft analysis** once both teams are picked
- **Hover-based synergy breakdown** for each hero
- **Custom grid layouts** for different visual styles
- **Interactive tutorial and tooltips** for new users
- **Hero pool persistence** via `localStorage`

---

## Project Structure Overview
src/
├── assets/ # Icons and images
├── utils/ # Synergy calculations, grouping functions, shared components
├── HeroList.jsx # Main frontend logic (large component)
├── App.jsx # Entry point
├── index.html
└── styles.css

---

## How It Works

This tool uses preprocessed hero synergy data to compute:
- **Best synergistic picks** from the remaining hero pool
- **Role-specific suggestions** depending on your filter
- **Total team synergy scores** when the draft is full
- **Outcome prediction**, visualized with win probability estimation

The suggestion engine runs on the frontend using a custom algorithm and updates live with each pick or ban.

---

## Tech Stack

| Tool | Purpose |
|------|---------|
|       **React**       | Frontend library |
|   **Framer Motion**   | UI animation and transitions |
|    **Tailwind CSS**   | Styling |
| **JavaScript (ES6)**  | Core logic |
|   **localStorage**    | Hero pool persistence |

## Getting Started

```bash
# Clone the git repository
git clone https://github.com/SimplyPhantomDev/dota2-draft-frontend.git

# Navigate into the project
cd dota2-draft-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Usage Guide
 - Click or drag heroes to either team
 - Right click to ban a hero
 - Toggle between grid layouts in the UI using the grid layout switch in top left
 - Enable Hero Pool Edit Mode to build your personalized pool
 - View full draft synergy stats once both teams have 5 picks
 - Hover over a hero in the full draft view to see their detailed synergy breakdown
 - Use role filters (carry / support) for tailored suggestions

## Planned features

All of the features listed here are either in pre-alpha state or in planning.
Release schedule, priority and order is highly dependent on which features are deemed most important.
- Alias support for search (e.g. "AM" -> "Anti-Mage", "Mortred" -> "Phantom Assassin") [pre-alpha]
- Support for tournament mode (captain's mode draft order where the user only tells the app who has the first pick, and then bans and picks happen automatically) [planned]
- Support for mobile users through different UI design, as well as adapting to touch controls [designing]
- Role-specific hero pick possibilities (allied heroes can be assigned a role during the draft) [planned]

## Author
Tomi Niemelä
Frontend Developer, Computer Science Student

## License
**Copyright © 2025 Tomi Niemelä. All rights reserved.**

This project is proprietary and closed-source.  
No part of this application, its source code, assets, or underlying logic may be copied, modified, distributed, or used without **explicit written permission** from the author.

For inquiries or licensing discussions, contact: phantomdevprojects@gmail.com
