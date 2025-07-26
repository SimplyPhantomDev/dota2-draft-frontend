# Dota 2 Drafting Tool

The Dota 2 Drafting Tool helps players make smarter pick decisions using real-time hero synergy, ban tracking, and win probability calculations. Built with React and animated using Framer Motion, this intuitive interface is optimized for both competitive analysis and casual drafting.

---

## Features

- **Real-time synergy suggestions** based on picked and banned heroes
- **Hero pool system** for personalized recommendations
- **Full hero pool breakdown** with synergy scores
- **Enemy role prediction** based on smart role assignment logic
- **Role filters** (Carry / Support) to fine-tune suggestions
- **Drag-and-drop hero selection** with animated UI
- **Full draft analysis** once both teams are picked
- **Automatic team selection** when one team is full
- **Hover-based synergy breakdown** for drafted and suggested heroes
- **Cursor-anchored info boxes** for synergy details
- **Custom grid layouts** for different visual styles
- **Interactive tutorial and tooltips** for new users
- **Hero pool persistence** via `localStorage`

---

## Project Structure Overview
```text
public/
├──heroes.json # All hero data
├──hero-roles.json # All hero-specific role data
└──synergyMatrix.json # All matchup information related to all heroes
src/
├── assets/ # Icons and images
├── utils/ # Synergy calculations, grouping functions, shared components
├── components/ # Sidebar, DraftPanel, TeamDropZone and other UI parts
├── pages/ # Main frontend logic (connects everything)
├── App.css # Tailwind specific styling and animation handling
├── App.jsx # Entry point
├── index.css
└── main.jsx
index.html
```

---

## How It Works

This tool uses preprocessed hero synergy data to compute:
- **Best synergistic picks** from the remaining hero pool
- **Role-specific suggestions** depending on your filter
- **Win probability** based on full draft composition
- **Predicted enemy positions** using role conflict resolution
- **Transparent full breakdown** of hero pool performance

All calculations happen live in the browser using custom algorithms.

---

## Tech Stack

| Tool | Purpose |
|------|---------|
|       **React**       | Frontend library |
|   **Framer Motion**   | UI animation and transitions |
|    **Tailwind CSS**   | Styling framework |
| **JavaScript (ES6)**  | Core logic and behavior |
|   **localStorage**    | Hero pool memory |

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
 - Select heroes by clicking or dragging
 - Right click to ban a hero
 - Toggle between visual layouts with the layout switch
 - Use Hero Pool Edit Mode to personalize suggestions
 - Hover over a hero to view synergy breakdown
 - Role prediction is shown for enemy heroes once picked
 - View a full hero pool synergy report via the question mark button
 - Suggestions stop once your team is full
 - If one team is full, the app automatically picks the other team for you

## Planned features

These features are still under active planning or development:
- Alias support for search (e.g. "AM" -> "Anti-Mage", "Mortred" -> "Phantom Assassin") [pre-alpha]
- Captains Mode draft simulator [planned]
- Touch controls and mobile layout [designing]

## Author
Tomi Niemelä
Frontend Developer, Computer Science Student

## License
**Copyright © 2025 Tomi Niemelä. All rights reserved.**

This project is proprietary and closed-source.  
No part of this application, its source code, assets, or underlying logic may be copied, modified, distributed, or used without **explicit written permission** from the author.

For inquiries or licensing discussions, contact: phantomdevprojects@gmail.com
