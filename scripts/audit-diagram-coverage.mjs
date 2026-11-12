import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectEnv } from './load-env.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await loadProjectEnv(root);

function options(argv) {
  const result={baseUrl:'http://localhost:8080',preloadToken:process.env.PRELOAD_TOKEN||''};
  for(let index=0;index<argv.length;index++) {
    const value=argv[index];
    if(value==='--profile')result.profile=argv[++index];
    else if(value==='--year')result.year=Number(argv[++index]);
    else if(value==='--subject')result.subject=argv[++index];
    else if(value==='--status')result.status=argv[++index];
    else if(value==='--base-url')result.baseUrl=argv[++index];
    else if(value==='--preload-token')result.preloadToken=argv[++index];
    else if(value==='--output')result.output=argv[++index];
    else throw new Error(`Unknown option: ${value}`);
  }
  return result;
}

const config=options(process.argv.slice(2));
const baseUrl=config.baseUrl.replace(/\/$/,'');
const headers=config.preloadToken?{'x-preload-token':config.preloadToken}:{};
const health=await fetch(baseUrl+'/api/health').then(async response=>({ok:response.ok,body:await response.text()})).catch(error=>({ok:false,body:error.message}));
if(!health.ok)throw new Error(`LearnBridge API is unavailable: ${health.body}`);
console.log(`API health: ${health.body}`);

const response=await fetch(baseUrl+'/api/diagram-audit',{headers});
const payload=await response.json().catch(()=>({}));
if(!response.ok)throw new Error(payload.error||`Diagram audit failed (HTTP ${response.status}).`);

const lessons=(payload.lessons||[]).filter(item=>(!config.profile||item.profile===config.profile)
  &&(!config.year||item.year===config.year)
  &&(!config.subject||item.subjectId===config.subject)
  &&(!config.status||item.coverageStatus===config.status));
const summary=lessons.reduce((totals,item)=>{
  totals.total++;
  totals[item.coverageStatus]=(totals[item.coverageStatus]||0)+1;
  if(item.required)totals.required++;
  if(item.misplacedDiagramCount)totals.lessonsWithMisplacedDiagrams++;
  totals.misplacedDiagrams+=item.misplacedDiagramCount||0;
  return totals;
},{total:0,required:0,covered:0,missing:0,'optional-covered':0,'not-required':0,lessonsWithMisplacedDiagrams:0,misplacedDiagrams:0});

console.log('\nDiagram coverage audit');
console.log(`  Saved lessons scanned: ${summary.total}`);
console.log(`  Diagram-dependent lessons: ${summary.required}`);
console.log(`  Covered required lessons: ${summary.covered}`);
console.log(`  Missing required diagrams: ${summary.missing}`);
console.log(`  Optional lessons with diagrams: ${summary['optional-covered']}`);
console.log(`  Lessons not requiring diagrams: ${summary['not-required']}`);
console.log(`  Lessons with misplaced known diagrams: ${summary.lessonsWithMisplacedDiagrams}`);
console.log(`  Misplaced known diagrams: ${summary.misplacedDiagrams}`);

const misplaced=lessons.filter(item=>item.misplacedDiagramCount>0);
if(misplaced.length) {
  console.log('\nMisplaced diagrams');
  for(const item of misplaced)for(const diagram of item.misplacedDiagrams||[]) {
    console.log(`  ${item.profile} Year ${item.year} | ${item.subjectName} | ${item.topicId} ${item.topicTitle} | ${diagram.title||diagram.identifiedTemplate} — ${diagram.reason}`);
  }
}

const missing=lessons.filter(item=>item.coverageStatus==='missing');
if(missing.length) {
  console.log('\nLessons requiring diagrams');
  for(const item of missing)console.log(`  ${item.profile} Year ${item.year} | ${item.subjectName} | ${item.topicId} ${item.topicTitle} | ${item.templateId||'AI textbook diagram'}`);
} else console.log('\nNo missing required diagrams were found in the selected saved lessons.');

if(config.output) {
  const outputPath=path.resolve(config.output);
  await writeFile(outputPath,JSON.stringify({generatedAt:new Date().toISOString(),apiVersion:payload.illustrationVersion,summary,lessons},null,2));
  console.log(`\nAudit report: ${outputPath}`);
}
