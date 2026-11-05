import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectEnv } from './load-env.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await loadProjectEnv(root);
const profiles = JSON.parse(await readFile(path.join(root, 'src/profiles.json'), 'utf8'));
const subjects = JSON.parse(await readFile(path.join(root, 'src/subjects.json'), 'utf8'));
const subjectNames = new Map(subjects.map(subject => [subject.id, subject.name]));
const checkpointPath = path.join(root, '.learnbridge-preload-progress.json');
const yearMap = {
  'ng-junior': [7, 8, 9], 'ng-senior': [10, 11, 12],
  'ng-old-junior': [7, 8, 9], 'ng-old-senior': [10, 11, 12],
  'uk-junior': [7, 8, 9], 'uk-senior': [10, 11], 'uk-post16': [12],
};
const britishCore = {
  'uk-junior': new Set(['english', 'mathematics', 'science']),
  'uk-senior': new Set(['english-language', 'english-literature', 'mathematics', 'combined-science']),
};
const presets = new Set(['british-core', 'british-samples']);

function options(argv) {
  const result = { baseUrl: 'http://localhost:8080', delayMs: 1500, retries: 5, maxLessons: Infinity, preloadToken: process.env.PRELOAD_TOKEN || '' };
  for (let index = 0; index < argv.length; index++) {
    const value = argv[index];
    if (value === '--all') result.all = true;
    else if (value === '--yes') result.yes = true;
    else if (value === '--samples') result.samples = true;
    else if (value === '--dry-run') result.dryRun = true;
    else if (value === '--profile') result.profile = argv[++index];
    else if (value === '--preset') result.preset = argv[++index];
    else if (value === '--year') result.year = Number(argv[++index]);
    else if (value === '--subject') result.subject = argv[++index];
    else if (value === '--subjects') result.subjects = argv[++index].split(',').map(item => item.trim()).filter(Boolean);
    else if (value === '--base-url') result.baseUrl = argv[++index];
    else if (value === '--delay-ms') result.delayMs = Number(argv[++index]);
    else if (value === '--retries') result.retries = Number(argv[++index]);
    else if (value === '--max-lessons') result.maxLessons = Number(argv[++index]);
    else if (value === '--preload-token') result.preloadToken = argv[++index];
    else throw new Error(`Unknown option: ${value}`);
  }
  return result;
}
function sleep(milliseconds) { return new Promise(resolve => setTimeout(resolve, milliseconds)); }
async function loadCheckpoint() {
  try { return JSON.parse(await readFile(checkpointPath, 'utf8')); }
  catch { return { completed: [], failures: {} }; }
}
async function saveCheckpoint(checkpoint) {
  const temporary = checkpointPath + '.tmp';
  await writeFile(temporary, JSON.stringify(checkpoint, null, 2));
  await rename(temporary, checkpointPath);
}
async function post(baseUrl, route, body, retries, preloadToken) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(baseUrl.replace(/\/$/, '') + route, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(preloadToken ? { 'x-preload-token': preloadToken } : {}) },
        body: JSON.stringify(body), signal: AbortSignal.timeout(180000),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) return payload;
      const error = new Error(payload.error || `HTTP ${response.status}`);
      error.status = response.status;
      if (response.status < 500 && response.status !== 429) throw error;
      lastError = error;
    } catch (error) { lastError = error; }
    if (attempt < retries) {
      const wait = Math.min(60000, 2000 * 2 ** attempt);
      console.log(`  Retry ${attempt + 1}/${retries} in ${Math.round(wait / 1000)}s: ${lastError.message}`);
      await sleep(wait);
    }
  }
  throw lastError;
}
function usage() {
  console.log(`Usage:
  npm run preload -- --profile ng-junior --year 7 --subject mathematics
  npm run preload -- --profile uk-junior --year 7 --subjects english,mathematics,science
  npm run preload:british-core -- --max-lessons 5
  npm run preload:british-core -- --yes
  npm run preload:british-samples -- --yes
  npm run preload -- --profile ng-junior --year 7
  npm run preload -- --all --yes --samples
  npm run preload -- --all --yes

Options: --preset british-core|british-samples --samples --dry-run --subject ID --subjects ID,ID --max-lessons N --delay-ms N --retries N --base-url URL --preload-token TOKEN`);
}

const config = options(process.argv.slice(2));
if (!config.all && !config.profile && !config.preset) { usage(); process.exit(1); }
if (config.preset && !presets.has(config.preset)) throw new Error(`Unknown preset: ${config.preset}`);
if (config.preset === 'british-samples') config.samples = true;
if ((config.all || config.preset) && !config.yes && !config.dryRun && !Number.isFinite(config.maxLessons)) {
  console.error('This selection can generate many lessons. Re-run with --yes after reviewing Azure quota and cost, or use --max-lessons N for a controlled batch.');
  process.exit(1);
}
if (config.profile && !profiles[config.profile]) throw new Error(`Unknown profile: ${config.profile}`);
if (config.year && config.profile && !yearMap[config.profile]?.includes(config.year)) throw new Error('The selected year does not belong to that profile.');
const requestedSubjects = new Set([...(config.subject ? [config.subject] : []), ...(config.subjects || [])]);

const targets = [];
for (const [profile, offerings] of Object.entries(profiles)) {
  if (config.profile && profile !== config.profile) continue;
  if (!config.all && !config.preset && profile !== config.profile) continue;
  if (config.preset === 'british-samples' && !profile.startsWith('uk-')) continue;
  if (config.preset === 'british-core' && !britishCore[profile]) continue;
  for (const year of yearMap[profile]) {
    if (config.year && year !== config.year) continue;
    for (const { subjectId } of offerings) {
      if (requestedSubjects.size && !requestedSubjects.has(subjectId)) continue;
      if (config.preset === 'british-core' && !britishCore[profile].has(subjectId)) continue;
      targets.push({ profile, year, subjectId });
    }
  }
}
if (!targets.length) throw new Error('No matching profile, year and subject combinations were found.');
if (config.preset) console.log(`Preset: ${config.preset}`);
console.log(`Plans selected: ${targets.length}`);
console.log(config.samples?`Estimated public sample lessons: ${targets.length}`:`Estimated lessons: ${targets.length * 30}-${targets.length * 36}`);
console.log('Each uncached lesson can require four Azure AI requests. Cached plans and lessons return without regeneration.');
if (config.dryRun) process.exit(0);

const health = await fetch(config.baseUrl.replace(/\/$/, '') + '/api/health').then(async response => ({ ok:response.ok, body:await response.text() })).catch(error => ({ ok:false, body:error.message }));
if (!health.ok) throw new Error(`LearnBridge API is unavailable: ${health.body}`);
console.log(`API health: ${health.body}`);
const checkpoint = await loadCheckpoint();
const completed = new Set(checkpoint.completed);
let generated = 0;
let skipped = 0;
let failures = 0;

outer: for (const target of targets) {
  const label = `${target.profile} Year ${target.year} ${subjectNames.get(target.subjectId) || target.subjectId}`;
  console.log(`\nPlan: ${label}`);
  let plan;
  try { plan = await post(config.baseUrl, '/api/class-plan', target, config.retries, config.preloadToken); }
  catch (error) { console.error(`  Plan failed: ${error.message}`); failures++; continue; }
  for (const topic of plan.topics || []) {
    if (config.samples && topic.id !== 't1') continue;
    const itemKey = [target.profile, target.year, target.subjectId, topic.id].join(':');
    if (completed.has(itemKey)) { skipped++; continue; }
    if (generated >= config.maxLessons) break outer;
    console.log(`  [${topic.id}] ${topic.title}`);
    try {
      let complete = false;
      for (let part = 0; part < 4; part++) {
        const result = await post(config.baseUrl, '/api/lesson-notes', { ...target, topicId:topic.id, part }, config.retries, config.preloadToken);
        if (result.complete && result.notes) { complete = true; break; }
        await sleep(config.delayMs);
      }
      if (!complete) throw new Error('The API did not return a complete lesson after four sections.');
      completed.add(itemKey);
      checkpoint.completed = [...completed];
      delete checkpoint.failures[itemKey];
      await saveCheckpoint(checkpoint);
      generated++;
    } catch (error) {
      console.error(`    Failed: ${error.message}`);
      checkpoint.failures[itemKey] = { message:error.message, at:new Date().toISOString() };
      await saveCheckpoint(checkpoint);
      failures++;
    }
    await sleep(config.delayMs);
  }
}
console.log(`\nFinished. Completed now: ${generated}; skipped from checkpoint: ${skipped}; failures: ${failures}.`);
console.log(`Checkpoint: ${checkpointPath}`);
if (failures) process.exitCode = 2;
