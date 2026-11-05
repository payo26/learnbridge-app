import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profiles = JSON.parse(await readFile(path.join(root, 'src/profiles.json'), 'utf8'));
const subjects = JSON.parse(await readFile(path.join(root, 'src/subjects.json'), 'utf8'));

const expectedProfiles = {
  'ng-junior': [7, 8, 9],
  'ng-senior': [10, 11, 12],
  'ng-old-junior': [7, 8, 9],
  'ng-old-senior': [10, 11, 12],
  'uk-junior': [7, 8, 9],
  'uk-senior': [10, 11],
  'uk-post16': [12],
};

const requiredBritishSubjects = {
  'uk-junior': [
    'english', 'mathematics', 'science', 'history', 'geography',
    'modern-foreign-languages', 'design-and-technology', 'art-and-design',
    'music', 'physical-education', 'citizenship', 'computing',
    'religious-education', 'relationships-sex-and-health-education',
  ],
  'uk-senior': [
    'english-language', 'english-literature', 'mathematics',
    'combined-science', 'computing', 'physical-education', 'citizenship',
    'religious-education', 'relationships-sex-and-health-education',
  ],
  'uk-post16': [
    'english-language', 'english-literature', 'mathematics',
    'further-mathematics', 'biology', 'chemistry', 'physics', 'history',
    'geography', 'business', 'economics', 'computer-science',
  ],
};

const errors = [];
const subjectById = new Map();

for (const subject of subjects) {
  if (!subject?.id || typeof subject.id !== 'string') {
    errors.push('A subject is missing a string id.');
    continue;
  }
  if (subjectById.has(subject.id)) errors.push(`Duplicate subject definition: ${subject.id}`);
  subjectById.set(subject.id, subject);
  if (!subject.name || typeof subject.name !== 'string') errors.push(`Subject ${subject.id} has no name.`);
  if (!Array.isArray(subject.topics) || subject.topics.length === 0) errors.push(`Subject ${subject.id} has no study areas.`);
  if (Array.isArray(subject.topics) && subject.topics.some(topic => typeof topic !== 'string' || !topic.trim())) {
    errors.push(`Subject ${subject.id} contains an empty or invalid study area.`);
  }
}

for (const profile of Object.keys(expectedProfiles)) {
  const entries = profiles[profile];
  if (!Array.isArray(entries) || entries.length === 0) {
    errors.push(`Profile ${profile} is missing or empty.`);
    continue;
  }
  const seen = new Set();
  for (const entry of entries) {
    if (!entry?.subjectId) {
      errors.push(`Profile ${profile} contains an entry without subjectId.`);
      continue;
    }
    if (seen.has(entry.subjectId)) errors.push(`Profile ${profile} repeats ${entry.subjectId}.`);
    seen.add(entry.subjectId);
    if (!subjectById.has(entry.subjectId)) errors.push(`Profile ${profile} references missing subject ${entry.subjectId}.`);
    if (!entry.group || !entry.status) errors.push(`Profile ${profile} subject ${entry.subjectId} needs group and status labels.`);
  }
}

for (const profile of Object.keys(profiles)) {
  if (!expectedProfiles[profile]) errors.push(`Profile ${profile} has no supported year mapping.`);
}

for (const [profile, ids] of Object.entries(requiredBritishSubjects)) {
  const available = new Set((profiles[profile] || []).map(entry => entry.subjectId));
  for (const id of ids) {
    if (!available.has(id)) errors.push(`British profile ${profile} is missing expected subject ${id}.`);
  }
}

const profileCombinationCount = profile =>
  (profiles[profile]?.length || 0) * expectedProfiles[profile].length;
const sum = values => values.reduce((total, value) => total + value, 0);
const nigerianProfiles = Object.keys(expectedProfiles).filter(profile => profile.startsWith('ng-'));
const britishProfiles = Object.keys(expectedProfiles).filter(profile => profile.startsWith('uk-'));

if (errors.length) {
  console.error('Curriculum validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Curriculum catalogue validation passed.');
console.log(`Subject definitions: ${subjects.length}`);
console.log(`Nigerian profile entries: ${sum(nigerianProfiles.map(profile => profiles[profile].length))}`);
console.log(`Nigerian class-subject combinations: ${sum(nigerianProfiles.map(profileCombinationCount))}`);
console.log(`British profile entries: ${sum(britishProfiles.map(profile => profiles[profile].length))}`);
console.log(`British class-subject combinations: ${sum(britishProfiles.map(profileCombinationCount))}`);
for (const profile of britishProfiles) {
  console.log(`- ${profile}: ${profiles[profile].length} subjects across Years ${expectedProfiles[profile].join(', ')}`);
}
