import fs from 'fs';
import readline from 'readline';

const HEROES_PATH = '../../public/heroes.json';

// Load the hero list
const heroList = JSON.parse(fs.readFileSync(HEROES_PATH, 'utf8'));

const rl =readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let index = 0;

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, (input) => {
            const trimmed = input.trim();
            if (trimmed === '!exit') {
                console.log("\n👋 Exiting without saving.");
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
        return hero ? {hero, id } : null;
    }

    const match = heroList.find(h => h.name.toLowerCase() === input.toLowerCase());
    return match ? {hero: match, id: match.HeroId } : null;
}

function parseAliases(input) {
    return input
        .split(',')
        .map(a => a.trim())
        .filter(Boolean);
}

async function updateHero() {
    const input = await ask("Enter Hero Name or ID to update: ");
    const result = findHeroByInput(input);

    if (!result) {
        console.log("Hero not found.")
        rl.close();
        return;
    }

    const { hero } = result;
    console.log(`\n Found Hero: ${hero.name} (ID: ${hero.HeroId})`);

    const current = hero.aliases || [];
    console.log(`Current aliases: ${current.length ? current.join(', ') : 'None'}`);

    const aliasInput = await ask(" New aliases (comma separated or leave blank to remove): ");
    const aliases = parseAliases(aliasInput);
    hero.aliases = aliases.length > 0 ? aliases : undefined;

    fs.writeFileSync(HEROES_PATH, JSON.stringify(heroList, null, 2));
    console.log(`\n Aliases for ${hero.name} updated.`);
    rl.close();
}

async function assignAliases() {
  while (index < heroList.length) {
    const hero = heroList[index];
    console.log(`\nHero ${index + 1}/${heroList.length}: ${hero.name} (ID: ${hero.HeroId})`);

    try {
      const aliasInput = await ask("  Aliases (comma-separated or leave blank): ");
      const aliases = parseAliases(aliasInput);
      hero.aliases = aliases.length > 0 ? aliases : undefined;

      index++;
    } catch (err) {
      console.error("Invalid input:", err.message);
    }
  }

  fs.writeFileSync(HEROES_PATH, JSON.stringify(heroList, null, 2));
  console.log(`\n✅ All alias data written to ${HEROES_PATH}`);
  rl.close();
}

(async () => {
  const mode = await ask("Choose mode: [f]ull entry or [u]pdate existing hero? ");
  if (mode.toLowerCase() === 'u') {
    await updateHero();
  } else {
    await assignAliases();
  }
})();