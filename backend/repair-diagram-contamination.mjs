import pg from 'pg';
import subjects from '../src/subjects.json' with { type:'json' };
import { ILLUSTRATION_VERSION } from './illustrations.mjs';
import { diagramRequirement } from './diagram-coverage.mjs';
import { filterRelevantIllustrations } from './diagram-relevance.mjs';

const apply=process.argv.includes('--apply');
const pool=new pg.Pool({
  host:process.env.DB_HOST||'db',
  port:Number(process.env.DB_PORT||5432),
  user:process.env.POSTGRES_USER||'learnbridge',
  password:process.env.POSTGRES_PASSWORD||'change_this_password',
  database:process.env.POSTGRES_DB||'learnbridge',
});

function parseNoteKey(cacheKey) {
  const match=/^lbnotes5:note:([^:]+):(\d+):([^:]+):(t\d{1,2})$/.exec(cacheKey);
  if(!match)return null;
  return {profile:match[1],year:Number(match[2]),subjectId:match[3],topicId:match[4]};
}

try {
  const result=await pool.query("SELECT cache_key,value FROM content_cache WHERE cache_key LIKE 'lbnotes5:note:%' AND value->'notes'->'illustrations' IS NOT NULL ORDER BY cache_key");
  const planCache=new Map();
  const affected=[];
  const unresolved=[];
  let diagramsScanned=0;

  for(const row of result.rows) {
    const input=parseNoteKey(row.cache_key);
    if(!input)continue;
    const planKey=`lbnotes5:plan:${input.profile}:${input.year}:${input.subjectId}`;
    if(!planCache.has(planKey)) {
      const planResult=await pool.query('SELECT value FROM content_cache WHERE cache_key=$1',[planKey]);
      planCache.set(planKey,planResult.rows[0]?.value||null);
    }
    const topic=planCache.get(planKey)?.topics?.find(candidate=>candidate?.id===input.topicId);
    const topicTitle=String(topic?.title||'').trim();
    const notes=row.value?.notes||{};
    const illustrations=Array.isArray(notes.illustrations)?notes.illustrations:[];
    diagramsScanned+=illustrations.length;
    if(!topicTitle) {
      unresolved.push({...input,cacheKey:row.cache_key,illustrationCount:illustrations.length});
      continue;
    }
    const subjectName=subjects.find(subject=>subject.id===input.subjectId)?.name||input.subjectId;
    const requirement=diagramRequirement({subjectId:input.subjectId,subjectName,topicTitle,notes});
    const filtered=filterRelevantIllustrations({subjectId:input.subjectId,subjectName,topicTitle,notes,requirement,illustrations});
    if(!filtered.removed.length)continue;
    affected.push({...input,cacheKey:row.cache_key,topicTitle,requirement,removed:filtered.removed,remaining:filtered.kept.length});

    if(apply) {
      const repairedNotes={...notes,illustrations:filtered.kept};
      if(filtered.kept.length)repairedNotes.illustrationStatus='generated';
      else if(requirement.required) {
        delete repairedNotes.illustrationStatus;
        delete repairedNotes.illustrationVersion;
      } else {
        repairedNotes.illustrationStatus='not-needed';
        repairedNotes.illustrationVersion=ILLUSTRATION_VERSION;
      }
      await pool.query('UPDATE content_cache SET value=$2,updated_at=NOW() WHERE cache_key=$1',[row.cache_key,{...row.value,notes:repairedNotes}]);
    }
  }

  console.log(`${apply?'Repair':'Preview'}: all saved LearnBridge lessons`);
  console.log(`Lessons with diagrams scanned: ${result.rows.length}`);
  console.log(`Diagrams scanned: ${diagramsScanned}`);
  console.log(`Lessons with misplaced known diagrams: ${affected.length}`);
  for(const item of affected)for(const removed of item.removed) {
    console.log(`  ${item.profile} Year ${item.year} | ${item.subjectId} | ${item.topicId} ${item.topicTitle} | REMOVE “${removed.illustration?.title||removed.identifiedTemplate}” — ${removed.reason}`);
  }
  if(unresolved.length) {
    console.log(`Lessons skipped because their saved plan/title was unavailable: ${unresolved.length}`);
    for(const item of unresolved)console.log(`  REVIEW ${item.cacheKey} (${item.illustrationCount} diagram(s))`);
  }
  if(!apply&&affected.length)console.log('No database rows were changed. Re-run with --apply after reviewing the list.');
  if(apply)console.log(`Repaired lessons: ${affected.length}`);
} finally {
  await pool.end();
}
