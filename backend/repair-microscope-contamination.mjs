import pg from 'pg';

function option(name,fallback) {
  const index=process.argv.indexOf(name);
  return index>=0?process.argv[index+1]:fallback;
}

const apply=process.argv.includes('--apply');
const profile=option('--profile','ng-senior');
const year=Number(option('--year','10'));
const subjectId=option('--subject','biology');
const keepTopic=option('--keep-topic','t3');

if(!/^[a-z0-9-]+$/.test(profile)||!Number.isInteger(year)||year<7||year>12
  ||!/^[a-z0-9-]+$/.test(subjectId)||!/^t\d{1,2}$/.test(keepTopic)) {
  throw new Error('Use valid --profile, --year, --subject and --keep-topic values.');
}

const pool=new pg.Pool({
  host:process.env.DB_HOST||'db',
  port:Number(process.env.DB_PORT||5432),
  user:process.env.POSTGRES_USER||'learnbridge',
  password:process.env.POSTGRES_PASSWORD||'change_this_password',
  database:process.env.POSTGRES_DB||'learnbridge',
});

const microscopeTitle='Parts of a compound light microscope';
const prefix=`lbnotes5:note:${profile}:${year}:${subjectId}:`;

try {
  const result=await pool.query(
    `SELECT cache_key,value FROM content_cache
     WHERE cache_key LIKE $1 AND value->'notes'->'illustrations' IS NOT NULL
     ORDER BY cache_key`,
    [`${prefix}%`],
  );
  const affected=[];
  for(const row of result.rows) {
    const topicId=row.cache_key.slice(prefix.length);
    if(topicId===keepTopic)continue;
    const notes=row.value?.notes||{};
    const illustrations=Array.isArray(notes.illustrations)?notes.illustrations:[];
    const remaining=illustrations.filter(item=>item?.title!==microscopeTitle);
    const removed=illustrations.length-remaining.length;
    if(!removed)continue;
    affected.push({cacheKey:row.cache_key,topicId,removed,remaining:remaining.length});
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

  console.log(`${apply?'Repair':'Preview'} scope: ${profile} Year ${year} ${subjectId}`);
  console.log(`Protected microscopy topic: ${keepTopic}`);
  if(!affected.length)console.log('No copied microscope diagrams were found outside the microscopy lesson.');
  for(const item of affected)console.log(`  ${item.topicId}: remove ${item.removed}; retain ${item.remaining} other diagram(s)`);
  console.log(`${apply?'Repaired':'Affected'} lessons: ${affected.length}`);
  if(!apply&&affected.length)console.log('No database rows were changed. Re-run with --apply after reviewing this list.');
} finally {
  await pool.end();
}
