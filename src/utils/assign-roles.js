import fs from 'fs';
import readline from 'readline';

const HEROES_PATH = './public/heroes.json';
const OUTPUT_PATH = './public/hero-roles.json';

// Load the hero list
const heroes = JSON.parse(fs.readFileSync(HEROES_PATH, 'utf8'));
const roleData = fs.existsSync(OUTPUT_PATH)
  ? JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'))
  : {};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const roles = {};

let index = 0;

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (input) => {
      const trimmed = input.trim();
      if (trimmed === '!exit') {
        console.log("\n Exiting without saving.");
        rl.close();
        process.exit(0);
      }
      resolve(trimmed);
    });
  });
}

function findHeroByInput(input) {
  const id = parseInt(input);
  if (!isNaN(id)) {
    const hero = heroList.find(h => h.HeroId === id);
    return hero ? { hero, id } : null;
  }

  const match = heroList.find(h => h.name.toLowerCase() === input.toLowerCase());
  return match ? { hero: match, id: match.HeroId } : null;
}

function normalizeRoles(input, allowMultiple = true) {
    if (!input) return [];

    const parts = input.toLowerCase().split(',').map(r => r.trim()).filter(Boolean);
    if (!allowMultiple && parts.length !== 1) throw new Error("Fallback role must be a single role.");
    return allowMultiple ? parts : parts[0];
}

async function updateHero() {
  const input = await ask("Enter Hero name or ID to update: ");
  const result = findHeroByInput(input);

  if (!result) {
    console.log("Hero not found.");
    rl.close();
    return;
  }

  const { hero, id } = result;
  console.log(`\n🔍 Found Hero: ${hero.name} (ID: ${id})`);

  const current = roleData[id] || { primary: [], secondary: [], fallback: null };
  console.log(`Current roles:
  Primary: ${current.primary.join(', ') || 'None'}
  Secondary: ${current.secondary.join(', ') || 'None'}
  Fallback: ${current.fallback || 'None'}`);

  try {
    const primaryInput = await ask("  New Primary roles (comma-separated): ");
    if (!primaryInput.trim()) throw new Error("Primary role is required.");
    const secondaryInput = await ask("  New Secondary roles (comma-separated): ");
    const fallbackInput = await ask("  New Fallback role (single): ");

    roleData[id] = {
      primary: normalizeRoles(primaryInput),
      secondary: secondaryInput ? normalizeRoles(secondaryInput) : [],
      fallback: fallbackInput ? normalizeRoles(fallbackInput, false) : null,
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(roleData, null, 2));
    console.log(`\n Hero ${hero.name} updated and saved.`);
  } catch (err) {
    console.error("Error:", err.message);
  }

  rl.close();
}


async function assignRoles() {
    while (index < heroes.length) {
        const hero = heroes[index];
        console.log(`\nHero ${index + 1}/${heroes.length}: ${hero.name} (ID: ${hero.HeroId})`);

        try {
            const primaryInput = await ask("  Primary roles (comma-separated, required): ");
            if (!primaryInput.trim()) {
                throw new Error("Primary role is required.");
            }
            const secondaryInput = await ask(" Secondary roles (comma-separated or none): ");
            const fallbackInput = await ask(" Fallback role (single or none): ")

            roles[hero.HeroId] = {
                primary: normalizeRoles(primaryInput),
                secondary: secondaryInput ? normalizeRoles(secondaryInput) : [],
                fallback: fallbackInput
                ? normalizeRoles(fallbackInput, false)
                : null,
            };

            index++;
        } catch (err) {
            console.error("Invalid input:", err.message);
        }
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(roles, null, 2));
    console.log(`\n Role data written to ${OUTPUT_PATH}`);
    rl.close();
}

(async () => {
  const mode = await ask("Choose mode: [f]ull entry or [u]pdate existing hero? ");
  if (mode.toLowerCase() === 'u') {
    await updateHero();
  } else {
    await assignRoles();
  }
})();