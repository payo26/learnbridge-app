import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectEnv } from './load-env.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await loadProjectEnv(root);
const checkpointPath=path.join(root,'.learnbridge-illustration-v6-progress.json');

function options(argv) {
  const result={baseUrl:'http://localhost:8080',delayMs:1500,retries:5,maxLessons:Infinity,preloadToken:process.env.PRELOAD_TOKEN||''};
  for(let index=0;index<argv.length;index++) {
    const value=argv[index];
    if(value==='--all')result.all=true;
    else if(value==='--yes')result.yes=true;
    else if(value==='--force')result.force=true;
    else if(value==='--dry-run')result.dryRun=true;
    else if(value==='--profile')result.profile=argv[++index];
    else if(value==='--year')result.year=Number(argv[++index]);
    else if(value==='--subject')result.subject=argv[++index];
    else if(value==='--topic')result.topic=argv[++index];
    else if(value==='--base-url')result.baseUrl=argv[++index];
    else if(value==='--delay-ms')result.delayMs=Number(argv[++index]);
    else if(value==='--retries')result.retries=Number(argv[++index]);
    else if(value==='--max-lessons')result.maxLessons=Number(argv[++index]);
    else if(value==='--preload-token')result.preloadToken=argv[++index];
    else throw new Error(`Unknown option: ${value}`);
  }
  return result;
}
function sleep(milliseconds){return new Promise(resolve=>setTimeout(resolve,milliseconds));}
async function loadJson(file,fallback){try{return JSON.parse(await readFile(file,'utf8'));}catch{return fallback;}}
async function saveCheckpoint(checkpoint){const temporary=checkpointPath+'.tmp';await writeFile(temporary,JSON.stringify(checkpoint,null,2));await rename(temporary,checkpointPath);}
async function post(baseUrl,body,retries,preloadToken){
  let lastError;
  for(let attempt=0;attempt<=retries;attempt++){
    try{
      const response=await fetch(baseUrl.replace(/\/$/,'')+'/api/lesson-illustrations',{
        method:'POST',headers:{'Content-Type':'application/json',...(preloadToken?{'x-preload-token':preloadToken}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(180000),
      });
      const payload=await response.json().catch(()=>({}));
      if(response.ok)return payload;
      const error=new Error(payload.error||`HTTP ${response.status}`);error.status=response.status;
      if(response.status<500&&response.status!==429)throw error;
      lastError=error;
    }catch(error){lastError=error;}
    if(attempt<retries){const wait=Math.min(60000,2000*2**attempt);console.log(`  Retry ${attempt+1}/${retries} in ${Math.round(wait/1000)}s: ${lastError.message}`);await sleep(wait);}
  }
  throw lastError;
}

const config=options(process.argv.slice(2));
if(!config.all&&!config.profile){
  console.log(`Usage:
  npm run audit-diagrams -- --base-url http://localhost:8080
  npm run backfill-illustrations -- --profile ng-senior --year 10 --subject geography
  npm run backfill-illustrations -- --profile ng-senior --year 10 --subject biology --max-lessons 10
  npm run backfill-illustrations -- --all --yes

Only complete lessons already saved in PostgreSQL are scanned. The default processes required diagrams that are missing. Curated templates do not use Azure; other topics can require one Azure request.
Options: --force --topic ID --dry-run --max-lessons N --delay-ms N --retries N --base-url URL --preload-token TOKEN`);
  process.exit(1);
}
if(config.all&&!config.yes&&!config.dryRun){console.error('A full coverage backfill can make Azure AI requests for saved lessons without curated templates. Re-run with --all --yes after reviewing quota and cost.');process.exit(1);}

const baseUrl=config.baseUrl.replace(/\/$/,'');
const health=await fetch(baseUrl+'/api/health').then(async response=>({ok:response.ok,body:await response.text()})).catch(error=>({ok:false,body:error.message}));
if(!health.ok)throw new Error(`LearnBridge API is unavailable: ${health.body}`);
console.log(`API health: ${health.body}`);
const auditResponse=await fetch(baseUrl+'/api/diagram-audit',{headers:config.preloadToken?{'x-preload-token':config.preloadToken}:{}});
const audit=await auditResponse.json().catch(()=>({}));
if(!auditResponse.ok)throw new Error(audit.error||`Could not audit saved lessons (HTTP ${auditResponse.status}).`);

const candidates=(audit.lessons||[]).map(item=>({...item,itemKey:[item.profile,item.year,item.subjectId,item.topicId].join(':')}))
  .filter(item=>(config.all||item.profile===config.profile)
    &&(!config.year||item.year===config.year)
    &&(!config.subject||item.subjectId===config.subject)
    &&(!config.topic||item.topicId===config.topic)
    &&item.required
    &&(config.force||item.coverageStatus==='missing'));
if(!candidates.length){console.log('No saved lessons matching this selection are missing a required diagram.');process.exit(0);}
console.log(`Missing diagram lessons selected: ${candidates.length}`);
console.log('Curated templates are added without Azure. Other selected lessons can require one Azure AI diagram request.');
if(config.dryRun){for(const item of candidates)console.log(`  ${item.profile} Year ${item.year} | ${item.subjectName} | ${item.topicId} ${item.topicTitle} | ${item.templateId||'AI textbook diagram'}`);process.exit(0);}

const checkpoint=await loadJson(checkpointPath,{completed:[],failures:{}});
const completed=new Set(checkpoint.completed||[]);
let processed=0,skipped=0,failures=0,withDiagrams=0;
for(const item of candidates){
  if(!config.force&&completed.has(item.itemKey)){skipped++;continue;}
  if(processed>=config.maxLessons)break;
  console.log(`[${item.profile} Year ${item.year} ${item.subjectId} ${item.topicId}] ${item.topicTitle}`);
  console.log(`  Reason: ${item.reason}`);
  try{
    const result=await post(baseUrl,{profile:item.profile,year:item.year,subjectId:item.subjectId,topicId:item.topicId,force:true},config.retries,config.preloadToken);
    const count=Array.isArray(result.illustrations)?result.illustrations.length:0;
    if(!count)throw new Error('The coverage backfill completed without the required diagram.');
    console.log(`  Added ${count} textbook diagram${count===1?'':'s'}${result.source==='curated-template'?' from a verified built-in template':''}.`);
    withDiagrams+=count;
    completed.add(item.itemKey);checkpoint.completed=[...completed];delete checkpoint.failures[item.itemKey];await saveCheckpoint(checkpoint);processed++;
  }catch(error){console.error(`  Failed: ${error.message}`);checkpoint.failures[item.itemKey]={message:error.message,at:new Date().toISOString()};await saveCheckpoint(checkpoint);failures++;}
  await sleep(config.delayMs);
}
console.log(`\nFinished. Lessons processed: ${processed}; diagrams added: ${withDiagrams}; skipped from checkpoint: ${skipped}; failures: ${failures}.`);
console.log(`Checkpoint: ${checkpointPath}`);
if(failures)process.exitCode=2;
