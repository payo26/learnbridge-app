import express from 'express';
import cors from 'cors';
import pg from 'pg';
import subjects from '../src/subjects.json' with { type: 'json' };
import profiles from '../src/profiles.json' with { type: 'json' };
import mathPlans from '../shared/math-plans.json' with { type: 'json' };
import fractionsNotes from '../shared/fractions-notes.json' with { type: 'json' };
import { partSchemas, validPart, assemble } from './note-parts.mjs';
import { ILLUSTRATION_VERSION, illustrationSchema, illustrationTask, mapCatalog, validIllustrations } from './illustrations.mjs';
import { specimenPromptCatalog } from '../shared/specimen-catalog.mjs';
import { curatedIllustrationsForLesson, diagramCoverage, diagramCoverageTemplates, diagramRequirement } from './diagram-coverage.mjs';
import { filterRelevantIllustrations } from './diagram-relevance.mjs';
import { normalizeAiBaseURL } from './ai-endpoint.mjs';
import { passwordRecoveryConfigured } from './password-email.mjs';
import {
  createPlatformRouter,
  consumerPlansConfigured,
  ensurePlatformSchema,
  lessonAccess,
  originGuard,
  paymentMode,
  platformErrorHandler,
  requirePreloadAccess,
  sessionMiddleware,
} from './platform.mjs';

const app = express();
const port = Number(process.env.PORT || 3001);
const pool = new pg.Pool({
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.POSTGRES_USER || 'learnbridge',
  password: process.env.POSTGRES_PASSWORD || 'change_this_password',
  database: process.env.POSTGRES_DB || 'learnbridge',
});
app.set('trust proxy', 1);
app.use(cors({ origin: process.env.CORS_ORIGIN || process.env.APP_ORIGIN || true, credentials: true }));
app.use(express.json({
  limit: '1mb',
  verify(req, _res, buffer) { req.rawBody = Buffer.from(buffer); },
}));
app.use('/api', (req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  if (/^\/(?:auth|school|consumer|admin|billing)(?:\/|$)/.test(req.path)) res.set('Cache-Control', 'no-store');
  next();
});
app.use(sessionMiddleware(pool));
app.use(originGuard);
app.use('/api', createPlatformRouter(pool));

function fail(res, status, message) { return res.status(status).json({ error: message }); }
function key(...parts) { return ['lbnotes5', ...parts].join(':'); }
function cleanJson(text) {
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
}
function validateInput(body, requireTopic = false) {
  if (!body || typeof body !== 'object') return null;
  const { profile, year, subjectId, topicId } = body;
  if (typeof profile !== 'string' || !Number.isInteger(year) || typeof subjectId !== 'string') return null;
  if (year < 7 || year > 12 || !profiles[profile]?.some(s => s.subjectId === subjectId)) return null;
  const junior = year <= 9;
  if (profile.includes('junior') !== junior) return null;
  if ((profile === 'uk-post16' && year !== 12) || (profile === 'uk-senior' && year === 12)) return null;
  if (requireTopic && (typeof topicId !== 'string' || !/^t\d{1,2}$/.test(topicId))) return null;
  return { profile, year, subjectId, topicId };
}
function className(input) {
  return input.profile.startsWith('ng')
    ? input.year <= 9 ? `JSS ${input.year - 6}` : `SS ${input.year - 9}`
    : `Year ${input.year}`;
}
function curriculumName(input) {
  return ({
    'ng-junior':'Nigeria revised junior secondary framework',
    'ng-senior':'Nigeria revised senior secondary framework',
    'ng-old-junior':'Nigeria earlier junior secondary framework for transitioning cohorts',
    'ng-old-senior':'Nigeria earlier senior secondary framework for transitioning cohorts',
    'uk-junior':'England Key Stage 3',
    'uk-senior':'England Key Stage 4 with GCSE and Cambridge IGCSE subject pathways',
    'uk-post16':'Post-16 study with Cambridge International AS & A Level subject pathways',
  })[input.profile] || input.profile;
}
async function cacheGet(cacheKey) {
  const result = await pool.query('SELECT value FROM content_cache WHERE cache_key=$1', [cacheKey]);
  return result.rows[0]?.value;
}
async function cachePut(cacheKey, value) {
  await pool.query(`INSERT INTO content_cache(cache_key,value,updated_at)
    VALUES($1,$2,NOW()) ON CONFLICT(cache_key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`,
    [cacheKey, value]);
}
async function sanitizeSavedIllustrations({noteKey,saved,input,subject,topic}) {
  const notes=saved?.notes||{};
  const requirement=diagramRequirement({subjectId:input.subjectId,subjectName:subject?.name||input.subjectId,topicTitle:topic?.title||'',notes});
  const filtered=filterRelevantIllustrations({
    subjectId:input.subjectId,
    subjectName:subject?.name||input.subjectId,
    topicTitle:topic?.title||'',
    notes,
    requirement,
    illustrations:notes.illustrations,
  });
  if(!filtered.removed.length)return {saved,requirement,filtered,repaired:false};
  const repairedNotes={...notes,illustrations:filtered.kept};
  if(filtered.kept.length)repairedNotes.illustrationStatus='generated';
  else if(requirement.required) {
    delete repairedNotes.illustrationStatus;
    delete repairedNotes.illustrationVersion;
  } else {
    repairedNotes.illustrationStatus='not-needed';
    repairedNotes.illustrationVersion=ILLUSTRATION_VERSION;
  }
  const repaired={...saved,notes:repairedNotes};
  await cachePut(noteKey,repaired);
  return {saved:repaired,requirement,filtered,repaired:true};
}
async function generateJson({ system, prompt, schema, maxTokens = 3000 }) {
  const azure = Boolean(process.env.AZURE_OPENAI_ENDPOINT);
  const apiKey = azure ? process.env.AZURE_OPENAI_API_KEY : process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error(azure
      ? 'Azure AI is not configured. Add AZURE_OPENAI_API_KEY to the .env file and restart the API.'
      : 'AI generation is not configured. Add OPENAI_API_KEY to the .env file and restart the API.');
    error.status = 503;
    throw error;
  }
  const configuredBaseURL = azure
    ? process.env.AZURE_OPENAI_ENDPOINT
    : process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const baseURL = normalizeAiBaseURL(configuredBaseURL, azure);
  const model = azure ? process.env.AZURE_OPENAI_DEPLOYMENT : process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  if (!model) {
    const error = new Error('Add AZURE_OPENAI_DEPLOYMENT to the .env file and restart the API.');
    error.status = 503;
    throw error;
  }
  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      ...(azure ? { 'api-key': apiKey } : { 'Authorization': `Bearer ${apiKey}` }),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      temperature: 0.15,
      max_tokens: maxTokens,
      response_format: { type: 'json_schema', json_schema: { name: 'learnbridge_content', strict: true, schema } },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `AI request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return cleanJson(payload.choices?.[0]?.message?.content || '');
}
const planSchema = {
  type: 'object', additionalProperties: false, required: ['topics'], properties: {
    topics: { type: 'array', minItems: 30, maxItems: 36, items: {
      type: 'object', additionalProperties: false, required: ['title','term','objectives'], properties: {
        title: { type: 'string' }, term: { type: 'integer', minimum: 1, maximum: 3 },
        objectives: { type: 'array', minItems: 2, maxItems: 3, items: { type: 'string' } }
      }
    }}
  }
};
const MATH_WRITING_RULES = String.raw`Write every mathematical expression accurately and completely. Put inline mathematics inside \( and \). Use \frac{numerator}{denominator} for fractions, never a slash. Repeat every required variable explicitly; do not omit a variable from any term. Keep the complete equation inside one pair of math delimiters so fractions, operators and brackets are typeset together. Use \left( and \right) around expressions containing stacked fractions. For simultaneous equations, put each equation on its own row under one left brace using \begin{cases} ... \\ ... \end{cases}; use this layout in worked examples, practice questions, model answers and checkpoint questions. Never run two simultaneous equations together on one line and never return literal \n text as visible notation. Write every matrix as a rectangular array with ampersands separating columns and \\ separating rows. Use \begin{bmatrix} ... \end{bmatrix} for square brackets, \begin{pmatrix} ... \end{pmatrix} for round brackets and \begin{vmatrix} ... \end{vmatrix} for determinants. Apply true matrix layout in worked examples, practice questions, model answers and checkpoint questions; never flatten a matrix into one row or return programming-style nested lists, including row and column vectors. Do not use Markdown headings, ** markers or backticks inside JSON strings. Before returning, verify every number, variable, operator, bracket, matrix row, matrix column and equality. Correct equation model: \( \frac{3}{4}x + \frac{1}{2}x = 1 \). Correct equivalent-fraction model: \( \frac{3}{4} = \frac{3 \times 5}{4 \times 5} = \frac{15}{20} \). Correct simultaneous-equation model: \[ \begin{cases} 2x + y = 7 \\ x - y = 2 \end{cases} \]. Correct matrix model: \[ A = \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix} \]. Correct column-vector model: \[ X = \begin{bmatrix} x \\ y \end{bmatrix} \].`;
const CHEMISTRY_WRITING_RULES = String.raw`Write every chemical formula and equation in standard textbook notation. Put each complete chemical equation inside \( and \). Use _{...} for atom-count subscripts and ^{...} for ionic charges. Keep stoichiometric coefficients on the baseline. Use \rightarrow for an irreversible reaction and \leftrightharpoons for a reversible reaction. Add state symbols (s), (l), (g) and (aq) where relevant. Balance every equation and verify every formula, coefficient, charge and state. Never expose a raw underscore outside the math delimiters. Correct model: \( 2H_{2}(g) + O_{2}(g) \rightarrow 2H_{2}O(l) \).`;
function illustrationLessonSummary(notes) {
  return {
    objectives:notes.objectives,
    sections:notes.sections?.map(section => ({ heading:section.heading, paragraphs:section.paragraphs })),
    examples:notes.examples,
    summary:notes.summary,
  };
}
async function getPlan(input, allowGeneration = true) {
  if (input.profile.startsWith('ng') && input.year <= 9 && ['mathematics','general-mathematics'].includes(input.subjectId)) {
    return { provenance: 'Saved editorial study plan; suggested sequence, not a certified syllabus',
      topics: mathPlans[String(input.year)].map((title,index) => ({ id:`t${index+1}`, title, term:Math.floor(index/10)+1,
        objectives:[`Explain the main ideas in ${title}.`,`Apply ${title} to a suitable example.`] })) };
  }
  const cacheKey = key('plan', input.profile, input.year, input.subjectId);
  const cached = await cacheGet(cacheKey);
  if (cached?.topics?.length) return { ...cached, provenance:'Suggested study plan; review against your school scheme of work' };
  if (!allowGeneration) {
    const error = new Error('This public topic plan is being prepared. Try another subject sample or check again later.');
    error.status = 404;
    throw error;
  }
  const subject = subjects.find(s => s.id === input.subjectId);
  const generated = await generateJson({
    system: 'You are an experienced secondary school teacher. Return accurate original JSON only. Do not claim official curriculum completeness.',
    prompt: JSON.stringify({ task:'Create a class-specific annual study plan with 30 to 36 distinct topics across three terms. Give each topic two measurable objectives. Align coverage with the named framework while keeping the plan original and suitable for school study support. Do not claim that it is an official or certified syllabus.', curriculum:curriculumName(input), class:className(input), subject:subject.name, studyAreas:subject.topics }),
    schema: planSchema, maxTokens: 5000,
  });
  const plan = { provenance:'Suggested study plan; review against your school scheme of work',
    topics:generated.topics.map((topic,index) => ({ ...topic, id:`t${index+1}` })) };
  await cachePut(cacheKey, plan);
  return plan;
}
function sendServiceError(res, error) {
  console.error(error);
  if (error.status === 404) return fail(res, 404, error.message);
  if (error.status === 429 || /quota|rate.?limit/i.test(error.message || '')) return fail(res, 429, 'The AI service has reached its usage limit. Try later or add saved lesson notes.');
  if (error.status === 503 || /not configured/i.test(error.message || '')) return fail(res, 503, error.message);
  return fail(res, 503, 'Lesson content is temporarily unavailable. Please retry.');
}
app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status:'ok', version:'8.0.13', seoStaticPages:210, seoIndexablePages:204, mathematicsRenderer:'native-mathml-4', chemistryRenderer:'native-mathml-1', diagramStandard:'audited-textbook-diagram-coverage', diagramCoverageAudit:true, diagramRelevanceAudit:true, curatedDiagramTemplates:diagramCoverageTemplates.length, anatomyPlateCount:10, azureApiRoute:'openai-v1', passwordRecoveryConfigured:passwordRecoveryConfigured(), curricula:['Nigerian','British'], britishFrameworks:['England KS3','England KS4 and GCSE','Cambridge IGCSE','Cambridge International AS & A Level'], illustrationVersion:ILLUSTRATION_VERSION, illustrationRendererVersion:6, database:'connected', aiConfigured:Boolean(process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY), aiProvider:process.env.AZURE_OPENAI_ENDPOINT ? 'azure-openai' : 'openai', schoolLicensing:true, consumerSubscriptions:true, paymentsConfigured:paymentMode() !== 'not-configured', consumerPlansConfigured:consumerPlansConfigured(), paymentMode:paymentMode() }); }
  catch { fail(res, 503, 'Database unavailable'); }
});
app.post('/api/class-plan', async (req, res) => {
  const input = validateInput(req.body);
  if (!input) return fail(res, 400, 'Choose a valid class and subject for this curriculum.');
  const access = lessonAccess(req, { ...input, topicId:'t2' });
  try { res.json(await getPlan(input, access.canGenerate)); } catch (error) { sendServiceError(res, error); }
});
app.post('/api/lesson-notes', async (req, res) => {
  const input = validateInput(req.body, true);
  if (!input) return fail(res, 400, 'Choose a valid topic.');
  const access = lessonAccess(req, input);
  if (!access.allowed) return res.status(403).json({
    error:'This lesson requires an active subscription, school pilot or paid licence. Sign in or choose a LearnBridge package.',
    code:'LICENSE_REQUIRED',
  });
  try {
    const plan = await getPlan(input, access.canGenerate);
    const topic = plan.topics.find(t => t.id === input.topicId);
    if (!topic) return fail(res, 400, 'This topic does not belong to the selected class plan.');
    if (input.profile.startsWith('ng') && input.year === 7 && ['mathematics','general-mathematics'].includes(input.subjectId) && input.topicId === 't3') {
      return res.json({ notes:fractionsNotes, provenance:'Built-in editorial lesson notes', complete:true });
    }
    const noteKey = key('note', input.profile, input.year, input.subjectId, input.topicId);
    let saved = await cacheGet(noteKey);
    if (saved?.notes?.sections?.length && saved.notes.quiz?.length) {
      const subject=subjects.find(candidate=>candidate.id===input.subjectId);
      const sanitized=await sanitizeSavedIllustrations({noteKey,saved,input,subject,topic});
      saved=sanitized.saved;
      return res.json({ ...saved, provenance:'', complete:true });
    }
    const part = req.body.part === undefined ? 0 : Number(req.body.part);
    if (!Number.isInteger(part) || part < 0 || part > 3) return fail(res, 400, 'Choose a valid lesson section.');
    const partKey = key(`part${part}`, input.profile, input.year, input.subjectId, input.topicId);
    let content = await cacheGet(partKey);
    if (!validPart(content, part)) {
      if (!access.canGenerate) return fail(res, 404, 'This public sample is being prepared. Try another sample or check again later.');
      const subject = subjects.find(s => s.id === input.subjectId);
      const tasks = [
        'Write objectives, key terms and two teaching sections introducing the topic. Each section needs two substantial explanatory paragraphs.',
        'Write three teaching sections about methods, applications and common misconceptions. Each needs two substantial explanatory paragraphs.',
        'Give two worked examples with complete steps, then four to six lesson summary points. Check calculations.',
        'Give exactly five practice questions with answers and explanations, and exactly three multiple-choice questions with three choices, a zero-based answer index and explanation.'
      ];
      content = await generateJson({ system:`Write accurate, original, age-appropriate teaching material in the requested JSON shape. Return JSON only. ${MATH_WRITING_RULES} ${CHEMISTRY_WRITING_RULES}`,
        prompt:JSON.stringify({ task:tasks[part], subject:subject.name, curriculum:curriculumName(input), class:className(input), topic:topic.title, objectives:topic.objectives }),
        schema:partSchemas[part], maxTokens:2800 });
      if (!validPart(content, part)) throw new Error('Generated lesson section was incomplete.');
      await cachePut(partKey, content);
    }
    const provenance = '';
    if (part === 3) {
      const parts = await Promise.all([0,1,2,3].map(n => n === part ? content : cacheGet(key(`part${n}`, input.profile, input.year, input.subjectId, input.topicId))));
      if (parts.every((value,index) => validPart(value,index))) {
        const notes = assemble(parts);
        await cachePut(noteKey, { notes, provenance });
        return res.json({ notes, provenance, complete:true });
      }
    }
    res.json({ part, content, provenance, complete:false });
  } catch (error) { sendServiceError(res, error); }
});
app.get('/api/saved-lessons', requirePreloadAccess, async (_req, res) => {
  try {
    const result=await pool.query("SELECT cache_key FROM content_cache WHERE cache_key LIKE 'lbnotes5:note:%' AND value->'notes'->'sections' IS NOT NULL ORDER BY cache_key");
    const lessons=result.rows.map(row=>{
      const [, , profile, year, subjectId, topicId]=row.cache_key.split(':');
      return { profile, year:Number(year), subjectId, topicId };
    }).filter(item=>item.profile&&Number.isInteger(item.year)&&item.subjectId&&item.topicId);
    res.json({ lessons });
  } catch(error) { sendServiceError(res,error); }
});
app.get('/api/diagram-audit', requirePreloadAccess, async (_req, res) => {
  try {
    const result=await pool.query("SELECT cache_key,value FROM content_cache WHERE cache_key LIKE 'lbnotes5:note:%' AND value->'notes'->'sections' IS NOT NULL ORDER BY cache_key");
    const planCache=new Map();
    const lessons=[];
    for(const row of result.rows) {
      const [, , profile, yearValue, subjectId, topicId]=row.cache_key.split(':');
      const year=Number(yearValue);
      if(!profile||!Number.isInteger(year)||!subjectId||!topicId)continue;
      const input={profile,year,subjectId,topicId};
      const planKey=[profile,year,subjectId].join(':');
      if(!planCache.has(planKey)) {
        try { planCache.set(planKey,await getPlan(input,false)); }
        catch { planCache.set(planKey,null); }
      }
      const topic=planCache.get(planKey)?.topics?.find(candidate=>candidate.id===topicId);
      const subject=subjects.find(candidate=>candidate.id===subjectId);
      const notes=row.value?.notes||{};
      const requirement=diagramRequirement({subjectId,subjectName:subject?.name||subjectId,topicTitle:topic?.title||'',notes});
      const coverage=diagramCoverage({illustrations:notes.illustrations,illustrationVersion:notes.illustrationVersion,requirement,currentVersion:ILLUSTRATION_VERSION});
      const relevance=filterRelevantIllustrations({subjectId,subjectName:subject?.name||subjectId,topicTitle:topic?.title||'',notes,requirement,illustrations:notes.illustrations});
      lessons.push({
        ...input,
        subjectName:subject?.name||subjectId,
        topicTitle:topic?.title||`Saved topic ${topicId}`,
        required:requirement.required,
        reason:requirement.reason,
        templateId:requirement.templateId,
        coverageStatus:coverage.status,
        misplacedDiagramCount:relevance.removed.length,
        misplacedDiagrams:relevance.removed.map(item=>({title:item.illustration?.title||'',identifiedTemplate:item.identifiedTemplate,reason:item.reason})),
        unclassifiedDiagramCount:relevance.unclassified.length,
        illustrationCount:coverage.count,
        illustrationVersion:notes.illustrationVersion||null,
        currentVersion:coverage.current,
      });
    }
    const summary=lessons.reduce((totals,lesson)=>{
      totals.total++;
      totals[lesson.coverageStatus]=(totals[lesson.coverageStatus]||0)+1;
      if(lesson.required)totals.required++;
      if(lesson.misplacedDiagramCount)totals.lessonsWithMisplacedDiagrams++;
      totals.misplacedDiagrams+=lesson.misplacedDiagramCount;
      return totals;
    },{total:0,required:0,covered:0,missing:0,'optional-covered':0,'not-required':0,lessonsWithMisplacedDiagrams:0,misplacedDiagrams:0});
    res.json({ illustrationVersion:ILLUSTRATION_VERSION,summary,lessons });
  } catch(error) { sendServiceError(res,error); }
});
app.post(['/api/lesson-illustrations','/api/lesson-diagrams'], async (req, res) => {
  const input = validateInput(req.body, true);
  if (!input) return fail(res, 400, 'Choose a valid topic.');
  const access = lessonAccess(req, input);
  if (!access.allowed) return res.status(403).json({
    error:'This lesson requires an active subscription, school pilot or paid licence. Sign in or choose a LearnBridge package.',
    code:'LICENSE_REQUIRED',
  });
  try {
    const plan = await getPlan(input, access.canGenerate);
    const topic = plan.topics.find(t => t.id === input.topicId);
    if (!topic) return fail(res, 400, 'This topic does not belong to the selected class plan.');
    const noteKey = key('note', input.profile, input.year, input.subjectId, input.topicId);
    let saved = await cacheGet(noteKey);
    if (!saved?.notes && input.profile.startsWith('ng') && input.year === 7 && ['mathematics','general-mathematics'].includes(input.subjectId) && input.topicId === 't3') {
      saved = { notes:fractionsNotes, provenance:'Built-in editorial lesson notes' };
    }
    if (!saved?.notes?.sections?.length) return fail(res, 404, 'Generate and save the full lesson before adding illustrations.');
    const subject = subjects.find(s => s.id === input.subjectId);
    const sanitized=await sanitizeSavedIllustrations({noteKey,saved,input,subject,topic});
    saved=sanitized.saved;
    const requirement=sanitized.requirement;
    const coverage=diagramCoverage({illustrations:saved.notes.illustrations,illustrationVersion:saved.notes.illustrationVersion,requirement,currentVersion:ILLUSTRATION_VERSION});
    const forceRegeneration = req.body?.force === true && access.preloader === true;
    if (!forceRegeneration && saved.notes.illustrationVersion === ILLUSTRATION_VERSION && saved.notes.illustrationStatus && Array.isArray(saved.notes.illustrations)
      && coverage.status!=='missing' && (saved.notes.illustrations.length > 0 || !requirement.required)) {
      return res.json({ illustrations:saved.notes.illustrations, illustrationStatus:saved.notes.illustrationStatus, illustrationVersion:ILLUSTRATION_VERSION, required:requirement.required, cached:true });
    }
    if (!forceRegeneration && Array.isArray(saved.notes.illustrations) && saved.notes.illustrations.length && coverage.status!=='missing') {
      const notes={...saved.notes,illustrationVersion:ILLUSTRATION_VERSION,illustrationStatus:'generated'};
      await cachePut(noteKey,{...saved,notes});
      return res.json({illustrations:notes.illustrations,illustrationStatus:notes.illustrationStatus,illustrationVersion:ILLUSTRATION_VERSION,required:requirement.required,cached:true,upgraded:true});
    }
    if (!forceRegeneration && !requirement.required && saved.notes.illustrationStatus==='not-needed') {
      const notes={...saved.notes,illustrations:[],illustrationVersion:ILLUSTRATION_VERSION,illustrationStatus:'not-needed'};
      await cachePut(noteKey,{...saved,notes});
      return res.json({illustrations:[],illustrationStatus:'not-needed',illustrationVersion:ILLUSTRATION_VERSION,required:false,cached:true,upgraded:true});
    }
    const curated=curatedIllustrationsForLesson({subjectId:input.subjectId,subjectName:subject?.name||input.subjectId,topicTitle:topic.title,notes:saved.notes,requirement});
    if(curated.length) {
      const notes={...saved.notes,illustrations:curated,illustrationStatus:'generated',illustrationVersion:ILLUSTRATION_VERSION};
      await cachePut(noteKey,{...saved,notes});
      return res.json({illustrations:curated,illustrationStatus:'generated',illustrationVersion:ILLUSTRATION_VERSION,required:true,cached:false,source:'curated-template'});
    }
    if (!access.canGenerate) return fail(res, 404, 'An illustration is not yet available for this public sample.');
    const responseSchema=requirement.required
      ? {...illustrationSchema,properties:{...illustrationSchema.properties,necessary:{type:'boolean',const:true}}}
      : illustrationSchema;
    const generated = await generateJson({
      system:'You are an expert secondary-school textbook diagram editor. Return accurate JSON only. Produce subject-accurate, correctly proportioned, publication-quality technical diagrams—not cartoons, decorative artwork, generic boxes or visual placeholders. Use the supplied real maps and biological specimen templates whenever applicable.',
      prompt:JSON.stringify({
        task:requirement.required?`${illustrationTask}\nCOVERAGE AUDIT: This lesson requires at least one accurate explanatory diagram. Return necessary=true and illustrate the concept identified in the coverage reason.`:illustrationTask,
        coverageRequirement:requirement,
        mapCatalog,
        specimenCatalog:specimenPromptCatalog,
        subject:subject.name, curriculum:curriculumName(input), class:className(input), topic:topic.title,
        lesson:illustrationLessonSummary(saved.notes),
      }),
      schema:responseSchema, maxTokens:7500,
    });
    if(requirement.required&&!generated.necessary) {
      const error=new Error('The diagram coverage audit requires an illustration for this lesson. Retry to create it.');
      error.status=503;
      throw error;
    }
    if (generated.necessary && !validIllustrations(generated.illustrations)) {
      const error = new Error('The generated illustration did not pass the label-spacing and layout-quality checks. Retry to create a cleaner version.');
      error.status = 503;
      throw error;
    }
    if (generated.necessary) {
      const relevance=filterRelevantIllustrations({subjectId:input.subjectId,subjectName:subject?.name||input.subjectId,topicTitle:topic.title,notes:saved.notes,requirement,illustrations:generated.illustrations});
      if(relevance.removed.length) {
        const error=new Error('The generated illustration does not match this lesson topic. Retry to create the correct topic-specific diagram.');
        error.status=503;
        throw error;
      }
    }
    const illustrations = generated.necessary ? generated.illustrations : [];
    const notes = { ...saved.notes, illustrations, illustrationStatus:illustrations.length ? 'generated' : 'not-needed', illustrationVersion:ILLUSTRATION_VERSION };
    await cachePut(noteKey, { ...saved, notes });
    res.json({ illustrations, illustrationStatus:notes.illustrationStatus, illustrationVersion:ILLUSTRATION_VERSION, required:requirement.required, cached:false });
  } catch (error) { sendServiceError(res, error); }
});
app.use((_req, res) => fail(res, 404, 'Route not found.'));
app.use(platformErrorHandler);

await ensurePlatformSchema(pool);
app.listen(port, '0.0.0.0', () => console.log(`LearnBridge API listening on ${port}`));
