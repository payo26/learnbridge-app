import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const origin='https://learnbridge-app.com';
const [source,subjects,profiles]=await Promise.all([
  readFile(path.join(dist,'index.html'),'utf8'),
  readFile(path.join(root,'src','subjects.json'),'utf8').then(JSON.parse),
  readFile(path.join(root,'src','profiles.json'),'utf8').then(JSON.parse),
]);

const years=[7,8,9,10,11,12];
const curricula=['Nigerian','British'];
const publicNavigation=`<nav aria-label="Public pages"><a href="/">Home</a><a href="/nigerian-curriculum">Nigerian curriculum</a><a href="/british-curriculum">British curriculum</a><a href="/subjects">Subjects</a><a href="/plans">Plans</a><a href="/schools">For schools</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/refunds">Refunds</a></nav>`;

const profileKey=(curriculum,year)=>curriculum==='Nigerian'?(year<=9?'ng-junior':'ng-senior'):year<=9?'uk-junior':year===12?'uk-post16':'uk-senior';
const offerings=(curriculum,year)=>profiles[profileKey(curriculum,year)]||[];
const subjectById=new Map(subjects.map(subject=>[subject.id,subject]));
const subjectAvailability=new Map(subjects.map(subject=>[
  subject.id,
  curricula.flatMap(curriculum=>years.filter(year=>offerings(curriculum,year).some(item=>item.subjectId===subject.id)).map(year=>`${curriculum} Year ${year}`)),
]));
const escapeHtml=value=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

const pages=[
  {
    route:'/',index:true,kind:'page',
    title:'LearnBridge | Nigerian & British Secondary Learning',
    description:'Explore secondary school subjects, topic plans and lesson notes for Nigerian JSS and SS plus British KS3, GCSE, IGCSE and post-16 pathways.',
    heading:'Secondary learning across Nigerian and British curriculum pathways',
    body:'Explore class-specific subjects, structured topic plans, explanatory lesson notes, worked examples, practice questions and knowledge checkpoints for Years 7 to 12.',
    content:'<p><a href="/subjects">Browse secondary school subjects</a> or <a href="/plans">compare access plans</a>.</p>',
  },
  {
    route:'/nigerian-curriculum',index:true,kind:'collection',
    title:'Nigerian Curriculum Lesson Notes for JSS & SS | LearnBridge',
    description:'Explore Nigerian junior and senior secondary subjects, class topic plans, worked examples and structured lesson notes for JSS 1-3 and SS 1-3.',
    heading:'Nigerian secondary curriculum learning support',
    body:'Browse relevant subjects and class-specific learning support for JSS 1 to 3 and SS 1 to 3, including topic plans, explanatory notes, examples, practice and checkpoints.',
    content:`<h2>Choose a class</h2><ul>${years.map(year=>`<li><a href="/class/nigerian-year-${year}">Year ${year} — ${year<=9?`JSS ${year-6}`:`SS ${year-9}`}</a></li>`).join('')}</ul>`,
  },
  {
    route:'/british-curriculum',index:true,kind:'collection',
    title:'British Curriculum Study Support | LearnBridge',
    description:'Explore structured study support for England Key Stage 3 and 4, GCSE, Cambridge IGCSE and post-16 AS and A-level pathways.',
    heading:'British curriculum pathway study support',
    body:'Explore secondary study support across England Key Stage 3 and 4, GCSE, Cambridge IGCSE and post-16 AS and A-level subject pathways. Availability varies by school and examination board.',
    content:`<h2>Choose a class</h2><ul>${years.map(year=>`<li><a href="/class/british-year-${year}">Year ${year}</a></li>`).join('')}</ul>`,
  },
  {
    route:'/subjects',index:true,kind:'collection',
    title:'Secondary School Subjects and Lesson Notes | LearnBridge',
    description:'Browse Nigerian and British secondary subjects, class topic plans, worked examples, practice questions and structured lesson notes.',
    heading:'Secondary school subjects and lesson notes',
    body:'Choose Nigerian or British pathways, Years 7 to 12, and the relevant subject area. Each available subject opens a class topic plan with structured lesson notes, worked examples, practice questions and checkpoints.',
    content:`<ul>${subjects.map(subject=>`<li><a href="/subject/${encodeURIComponent(subject.id)}">${escapeHtml(subject.name)}</a></li>`).join('')}</ul>`,
  },
  {route:'/plans',index:true,kind:'page',title:'LearnBridge Plans for Students and Families',description:'Compare LearnBridge individual, family and school access options for structured secondary lesson notes and learning support.',heading:'LearnBridge access plans',body:'Choose individual access for one learner, family access with separate learner profiles, or a school licence. Public Topic 1 samples can be reviewed before subscribing.',content:'<p><a href="/schools">View school licensing and the 30-day pilot</a>.</p>'},
  {route:'/schools',index:true,kind:'page',title:'LearnBridge for Schools | 30-Day Learning Platform Pilot',description:'Request a supervised 30-day LearnBridge pilot for up to 25 learners, with teacher access and custom termly or annual school licensing.',heading:'Structured learning support for schools',body:'Schools can request a supervised 30-day pilot for up to 25 learners. After evaluation, LearnBridge prepares a custom quotation based on learner seats, payable termly or annually.',content:'<p><a href="/plans">Compare all LearnBridge access options</a>.</p>'},
  {route:'/terms',index:true,kind:'page',title:'Terms of Service | LearnBridge',description:'Read the rules for using LearnBridge lessons, subscriptions, family accounts and school licences.',heading:'LearnBridge Terms of Service',body:'These terms explain LearnBridge account eligibility, educational services, subscriptions, school licences, acceptable use and consumer protections.',content:'<p>The complete Terms of Service are displayed on this page. <a href="/privacy">Read the Privacy Notice</a>.</p>'},
  {route:'/privacy',index:true,kind:'page',title:'Privacy Notice | LearnBridge',description:'Learn how LearnBridge collects, uses, protects and shares learner, family and school account information.',heading:'LearnBridge Privacy Notice',body:'This notice explains the account, subscription, learning, support and technical information LearnBridge processes and the rights available to users.',content:'<p>The complete Privacy Notice is displayed on this page. <a href="/terms">Read the Terms of Service</a>.</p>'},
  {route:'/refunds',index:true,kind:'page',title:'Refund and Cancellation Policy | LearnBridge',description:'Learn how LearnBridge handles subscription cancellations, renewal disputes and refund requests.',heading:'LearnBridge Refund and Cancellation Policy',body:'This policy explains cancellation, refund eligibility, school licence requests, payment disputes and statutory consumer rights.',content:'<p>The complete Refund and Cancellation Policy is displayed on this page. <a href="/plans">View LearnBridge plans</a>.</p>'},
  {route:'/bookmarks',index:false,kind:'page',title:'Saved Lessons | LearnBridge',description:'Your privately saved LearnBridge lesson notes.',heading:'Saved lessons',body:'This is a private learner workspace. Sign in through LearnBridge to view your saved lessons.',content:''},
  {route:'/progress',index:false,kind:'page',title:'Learning Progress | LearnBridge',description:'Your private LearnBridge lesson and checkpoint progress.',heading:'Learning progress',body:'This is a private learner workspace. Sign in through LearnBridge to view learning progress.',content:''},
  {route:'/account',index:false,kind:'page',title:'Account Dashboard | LearnBridge',description:'Secure LearnBridge subscription and family account dashboard.',heading:'Account dashboard',body:'Sign in securely to manage a LearnBridge individual or family account.',content:''},
  {route:'/school',index:false,kind:'page',title:'School Dashboard | LearnBridge',description:'Secure LearnBridge school licence and learner-management dashboard.',heading:'School dashboard',body:'Authorised school administrators, teachers and learners can sign in to their secure workspace.',content:''},
  {route:'/platform',index:false,kind:'page',title:'Platform Administration | LearnBridge',description:'Secure LearnBridge platform administration.',heading:'Platform administration',body:'This secure page is restricted to the LearnBridge platform administrator.',content:''},
  {route:'/join-school',index:false,kind:'page',title:'Join LearnBridge',description:'Accept a private LearnBridge school or family invitation.',heading:'Join LearnBridge',body:'Use the complete private invitation link supplied by your school or family account owner.',content:''},
];

for(const curriculum of curricula)for(const year of years) {
  const available=offerings(curriculum,year).map(item=>subjectById.get(item.subjectId)).filter(Boolean);
  const slug=curriculum.toLowerCase();
  pages.push({
    route:`/class/${slug}-year-${year}`,index:true,kind:'collection',curriculum,year,
    title:`Year ${year} ${curriculum} Subjects and Lesson Notes | LearnBridge`,
    description:`Browse Year ${year} ${curriculum} curriculum subjects, topic plans, worked examples, practice questions and structured lesson notes.`,
    heading:`Year ${year} ${curriculum} curriculum subjects`,
    body:`Explore ${available.length} subject entries and choices for the Year ${year} ${curriculum} pathway. Open a subject to view its study areas and available free sample.`,
    content:`<ul>${available.map(subject=>`<li><a href="/subject/${encodeURIComponent(subject.id)}">${escapeHtml(subject.name)}</a></li>`).join('')}</ul>`,
  });
}

for(const subject of subjects) {
  const availability=subjectAvailability.get(subject.id)||[];
  const topics=Array.isArray(subject.topics)?subject.topics:[];
  const firstLesson=Array.isArray(subject.lessons)?subject.lessons[0]:null;
  pages.push({
    route:`/subject/${encodeURIComponent(subject.id)}`,index:true,kind:'resource',subject,
    title:`${subject.name} Topics and Lesson Notes | LearnBridge`,
    description:`Explore ${subject.name} topics, class plans, worked examples, practice questions and structured secondary lesson notes on LearnBridge.`,
    heading:`${subject.name} topics and lesson notes`,
    body:`Browse key ${subject.name} study areas and open LearnBridge to select the relevant curriculum and class. Subject availability depends on the learner's pathway and school offering.`,
    content:`${topics.length?`<h2>Study areas</h2><ul>${topics.map(topic=>`<li>${escapeHtml(topic)}</li>`).join('')}</ul>`:''}${availability.length?`<h2>Available pathways</h2><p>${availability.map(escapeHtml).join(' · ')}</p>`:''}${firstLesson?`<p><a href="/sample/${encodeURIComponent(subject.id)}">Read a free ${escapeHtml(subject.name)} sample lesson</a></p>`:''}`,
  });
  if(firstLesson)pages.push({
    route:`/sample/${encodeURIComponent(subject.id)}`,index:true,kind:'sample',subject,
    title:`Free ${subject.name} Sample Lesson | LearnBridge`,
    description:`Read a free ${subject.name} sample lesson, then explore structured topic plans, examples, practice and full LearnBridge lesson notes.`,
    heading:`Free ${subject.name} sample: ${firstLesson.title}`,
    body:String(firstLesson.text||`Preview a LearnBridge ${subject.name} lesson before choosing an access plan.`),
    content:`${firstLesson.q?`<h2>Try a checkpoint</h2><p>${escapeHtml(firstLesson.q)}</p>`:''}<p><a href="/subject/${encodeURIComponent(subject.id)}">Explore all ${escapeHtml(subject.name)} topics</a></p>`,
  });
}

const replaceMeta=(html,key,value,attribute='name')=>html.replace(new RegExp(`<meta ${attribute}="${key}" content="[^"]*" \/>`),`<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`);

function render(page) {
  const canonical=origin+page.route;
  let html=source.replace(/<title>[\s\S]*?<\/title>/,`<title>${escapeHtml(page.title)}</title>`);
  html=replaceMeta(html,'description',page.description);
  html=replaceMeta(html,'robots',page.index?'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1':'noindex, nofollow');
  html=replaceMeta(html,'og:title',page.title,'property');
  html=replaceMeta(html,'og:description',page.description,'property');
  html=replaceMeta(html,'og:url',canonical,'property');
  html=replaceMeta(html,'twitter:title',page.title);
  html=replaceMeta(html,'twitter:description',page.description);
  html=html.replace(/<link rel="canonical" href="[^"]*" \/>/,`<link rel="canonical" href="${canonical}" />`);
  const graph=[
    {'@type':'WebSite','@id':`${origin}/#website`,url:`${origin}/`,name:'LearnBridge',description:'Nigerian and British secondary learning pathways in one platform',inLanguage:'en'},
    {'@type':'SoftwareApplication','@id':`${origin}/#application`,name:'LearnBridge',url:`${origin}/`,applicationCategory:'EducationalApplication',operatingSystem:'Web',educationalLevel:'Secondary education',audience:{'@type':'EducationalAudience',educationalRole:['student','teacher','parent']}},
    {'@type':page.kind==='collection'?'CollectionPage':'WebPage','@id':`${canonical}#webpage`,url:canonical,name:page.title,description:page.description,isPartOf:{'@id':`${origin}/#website`},inLanguage:'en'},
  ];
  if(page.subject)graph.push({'@type':'LearningResource','@id':`${canonical}#learning-resource`,name:page.subject.name,description:page.description,url:canonical,learningResourceType:page.kind==='sample'?'sample lesson':'lesson notes and topic plan',educationalLevel:'Secondary education',isAccessibleForFree:page.kind==='sample',about:(page.subject.topics||[]).slice(0,12)});
  html=html.replace(/<script id="learnbridge-structured-data" type="application\/ld\+json">[\s\S]*?<\/script>/,`<script id="learnbridge-structured-data" type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c')}</script>`);
  const content=`<main class="seo-fallback"><header><strong>LearnBridge</strong>${publicNavigation}</header><section><h1>${escapeHtml(page.heading)}</h1><p>${escapeHtml(page.body)}</p>${page.content||''}</section></main>`;
  return html.replace(/<!--seo-content-start-->[\s\S]*?<!--seo-content-end-->/,`<!--seo-content-start-->${content}<!--seo-content-end-->`);
}

const seen=new Set();
for(const page of pages) {
  if(seen.has(page.route))throw new Error(`Duplicate SEO route: ${page.route}`);
  seen.add(page.route);
  const target=page.route==='/'?path.join(dist,'index.html'):path.join(dist,`${page.route.slice(1)}.html`);
  await mkdir(path.dirname(target),{recursive:true});
  await writeFile(target,render(page));
}

const notFound={route:'/404',index:false,kind:'page',title:'Page Not Found | LearnBridge',description:'The requested LearnBridge page could not be found.',heading:'Page not found',body:'The address may be incorrect or the page may have moved.',content:'<p><a href="/">Return to LearnBridge</a> or <a href="/subjects">browse subjects</a>.</p>'};
await writeFile(path.join(dist,'404.html'),render(notFound));

const indexable=pages.filter(page=>page.index);
const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable.map(page=>`  <url><loc>${origin}${page.route}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(path.join(dist,'sitemap.xml'),sitemap);

if(pages.length!==210||indexable.length!==204)throw new Error(`Unexpected SEO catalogue size: ${pages.length} pages, ${indexable.length} indexable.`);
console.log(`Generated ${pages.length} static SEO entry pages (${indexable.length} indexable), a sitemap and a real 404 page.`);
