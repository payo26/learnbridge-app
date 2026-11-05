import pg from 'pg';
import subjects from '../src/subjects.json' with { type:'json' };
import { plantIllustrationDecision } from './plant-contamination.mjs';

function option(name,fallback) {
  const index=process.argv.indexOf(name);
  return index>=0?process.argv[index+1]:fallback;
}

const apply=process.argv.includes('--apply');
const profile=option('--profile','ng-senior');
const year=Number(option('--year','10'));
const subjectId=option('--subject','biology');

if(!/^[a-z0-9-]+$/.test(profile)||!Number.isInteger(year)||year<7||year>12||!/^[a-z0-9-]+$/.test(subjectId)) {
  throw new Error('Use valid --profile, --year and --subject values.');
}

const pool=new pg.Pool({
  host:process.env.DB_HOST||'db',
  port:Number(process.env.DB_PORT||5432),
  user:process.env.POSTGRES_USER||'learnbridge',
  password:process.env.POSTGRES_PASSWORD||'change_this_password',
  database:process.env.POSTGRES_DB||'learnbridge',
});

const prefix=`lbnotes5:note:${profile}:${year}:${subjectId}:`;
const planKey=`lbnotes5:plan:${profile}:${year}:${subjectId}`;

try {
  const [planResult,noteResult]=await Promise.all([
    pool.query('SELECT value FROM content_cache WHERE cache_key=$1',[planKey]),
    pool.query(
      `SELECT cache_key,value FROM content_cache
       WHERE cache_key LIKE $1 AND value->'notes'->'illustrations' IS NOT NULL
       ORDER BY cache_key`,
      [`${prefix}%`],
    ),
  ]);
  const topics=Array.isArray(planResult.rows[0]?.value?.topics)?planResult.rows[0].value.topics:[];
  const topicTitles=new Map(topics.map(topic=>[topic.id,topic.title]));
  const subjectName=subjects.find(subject=>subject.id===subjectId)?.name||subjectId;
  const affected=[];
  const protectedLessons=[];

  for(const row of noteResult.rows) {
    const topicId=row.cache_key.slice(prefix.length);
    const topicTitle=topicTitles.get(topicId)||'';
    const notes=row.value?.notes||{};
    const illustrations=Array.isArray(notes.illustrations)?notes.illustrations:[];
    const remaining=[];
    const removed=[];
    const keptPlant=[];

    for(const illustration of illustrations) {
      if(!topicTitle) {
        remaining.push(illustration);
        continue;
      }
      const decision=plantIllustrationDecision({subjectId,subjectName,topicTitle,notes,illustration});
      if(!decision.plantDiagram||decision.keep) {
        remaining.push(illustration);
        if(decision.plantDiagram)keptPlant.push({title:illustration.title,reason:decision.reason});
      } else removed.push({title:illustration.title,reason:decision.reason});
    }

    if(keptPlant.length)protectedLessons.push({topicId,topicTitle,diagrams:keptPlant});
    if(!removed.length)continue;
    affected.push({cacheKey:row.cache_key,topicId,topicTitle,removed,remaining:remaining.length});
    if(apply) {
      const repairedNotes={...notes};
      if(remaining.length) {
        repairedNotes.illustrations=remaining;
        repairedNotes.illustrationStatus='generated';
      } else {
        delete repairedNotes.illustrations;
        delete repairedNotes.illustrationStatus;
        delete repairedNotes.illustrationVersion;
      }
      await pool.query(
        'UPDATE content_cache SET value=$2,updated_at=NOW() WHERE cache_key=$1',
        [row.cache_key,{...row.value,notes:repairedNotes}],
      );
    }
  }

  console.log(`${apply?'Repair':'Preview'} scope: ${profile} Year ${year} ${subjectName}`);
  if(!topics.length)console.log('Warning: the saved topic plan was not found. Review any topic shown as “title unavailable” carefully before applying.');
  if(protectedLessons.length) {
    console.log('Correct plant diagrams protected:');
    for(const lesson of protectedLessons)for(const diagram of lesson.diagrams) {
      console.log(`  KEEP ${lesson.topicId} ${lesson.topicTitle||'(title unavailable)'} — ${diagram.title} (${diagram.reason})`);
    }
  }
  if(!affected.length)console.log('No unrelated recurring plant diagrams were found.');
  else {
    console.log(`${apply?'Removed':'Plant diagrams marked for removal'}:`);
    for(const item of affected)for(const diagram of item.removed) {
      console.log(`  ${item.topicId} ${item.topicTitle||'(title unavailable)'} — ${diagram.title}; retain ${item.remaining} other diagram(s)`);
    }
  }
  console.log(`${apply?'Repaired':'Affected'} lessons: ${affected.length}`);
  if(!apply&&affected.length)console.log('No database rows were changed. Re-run with --apply only after confirming every listed lesson is unrelated to the plant diagram.');
} finally {
  await pool.end();
}
