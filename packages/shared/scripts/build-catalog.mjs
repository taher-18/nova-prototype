// Builds src/exercises/exercises.data.json from free-exercise-db + our curated list.
//
// Source dataset: https://github.com/yuhonas/free-exercise-db (Unlicense / public domain)
// Usage: node scripts/build-catalog.mjs [path/to/exercises.json]
// Without a path the combined dataset is downloaded from GitHub.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATASET_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

async function loadDataset(path) {
  if (path) return JSON.parse(await readFile(path, 'utf8'));
  const res = await fetch(DATASET_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return res.json();
}

const dataset = await loadDataset(process.argv[2]);
const byId = new Map(dataset.map((e) => [e.id, e]));
const curated = JSON.parse(await readFile(join(root, 'data/curated-exercises.json'), 'utf8'));

const out = curated.exercises.map((c) => {
  const src = byId.get(c.id);
  if (!src) throw new Error(`Exercise "${c.id}" not found in dataset`);
  return {
    id: c.id,
    nameEn: src.name,
    nameAr: c.nameAr,
    equipment: c.equipment,
    pattern: c.pattern,
    tracking: c.tracking ?? 'reps',
    level: src.level,
    mechanic: src.mechanic ?? null,
    force: src.force ?? null,
    category: src.category,
    primaryMuscles: src.primaryMuscles,
    secondaryMuscles: src.secondaryMuscles,
    instructionsEn: src.instructions,
    instructionsAr: c.stepsAr ?? [],
  };
});

await writeFile(
  join(root, 'src/exercises/exercises.data.json'),
  JSON.stringify(out, null, 2) + '\n',
);
console.log(`Wrote ${out.length} exercises`);
