export type AppPage='Overview'|'Subjects'|'Bookmarks'|'Progress'|'Plans'|'For Schools'|'Account'|'School'|'Platform'|'Join School';
export type Curriculum='Nigerian'|'British';

export type SeoSubject={
  id:string;
  name:string;
  topics:string[];
};

export const SITE_ORIGIN='https://learnbridge-app.com';

const pagePaths:Record<AppPage,string>={
  Overview:'/',
  Subjects:'/subjects',
  Bookmarks:'/bookmarks',
  Progress:'/progress',
  Plans:'/plans',
  'For Schools':'/schools',
  Account:'/account',
  School:'/school',
  Platform:'/platform',
  'Join School':'/join-school',
};

const pathPages:Record<string,AppPage>={
  '/':'Overview',
  '/nigerian-curriculum':'Overview',
  '/british-curriculum':'Overview',
  '/subjects':'Subjects',
  '/bookmarks':'Bookmarks',
  '/progress':'Progress',
  '/plans':'Plans',
  '/schools':'For Schools',
  '/account':'Account',
  '/school':'School',
  '/platform':'Platform',
  '/join-school':'Join School',
};

const privatePages=new Set<AppPage>(['Bookmarks','Progress','Account','School','Platform','Join School']);

function cleanPath(pathname:string) {
  const withoutTrailing=pathname.toLowerCase().replace(/\/+$/,'');
  return withoutTrailing||'/';
}

function pathSegments() {
  return cleanPath(window.location.pathname).split('/').filter(Boolean);
}

export function pageFromLocation():AppPage {
  const parameters=new URLSearchParams(window.location.search);
  const fragment=new URLSearchParams(window.location.hash.replace(/^#/,''));
  if(fragment.get('password-reset'))return 'Plans';
  if(parameters.get('join'))return 'Join School';
  if(parameters.get('payment')==='consumer')return 'Account';
  if(parameters.get('payment')==='callback')return 'School';
  const segments=pathSegments();
  if(segments[0]==='class'||segments[0]==='subject'||segments[0]==='sample')return 'Subjects';
  return pathPages[cleanPath(window.location.pathname)]||'Overview';
}

export function curriculumFromLocation(fallback:Curriculum):Curriculum {
  const path=cleanPath(window.location.pathname);
  const segments=pathSegments();
  if(path==='/nigerian-curriculum'||segments[0]==='class'&&segments[1]?.startsWith('nigerian-'))return 'Nigerian';
  if(path==='/british-curriculum'||segments[0]==='class'&&segments[1]?.startsWith('british-'))return 'British';
  return fallback;
}

export function yearFromLocation(fallback:number) {
  const segments=pathSegments();
  if(segments[0]!=='class')return fallback;
  const match=segments[1]?.match(/-year-(7|8|9|10|11|12)$/);
  return match?Number(match[1]):fallback;
}

export function subjectFromLocation() {
  const segments=pathSegments();
  return segments[0]==='subject'||segments[0]==='sample'?segments[1]||'':'';
}

export function sampleFromLocation() {
  return pathSegments()[0]==='sample';
}

export function pathForPage(page:string,curriculum:Curriculum):string {
  if(page==='Overview') {
    const current=cleanPath(window.location.pathname);
    if(current==='/nigerian-curriculum'||current==='/british-curriculum')return current;
    return curriculumPath(curriculum);
  }
  return pagePaths[page as AppPage]||pagePaths.Overview;
}

export function curriculumPath(curriculum:Curriculum) {
  return curriculum==='British'?'/british-curriculum':'/nigerian-curriculum';
}

export function classPath(curriculum:Curriculum,year:number) {
  return `/class/${curriculum.toLowerCase()}-year-${year}`;
}

export function subjectPath(subjectId:string) {
  return `/subject/${encodeURIComponent(subjectId)}`;
}

export function samplePath(subjectId:string) {
  return `/sample/${encodeURIComponent(subjectId)}`;
}

type PageMetadata={title:string;description:string;path:string;index:boolean;kind:'page'|'collection'|'resource'|'sample'};

function metadata(page:AppPage,curriculum:Curriculum,year:number,subject?:SeoSubject):PageMetadata {
  const path=cleanPath(window.location.pathname);
  if(subject&&path.startsWith('/sample/'))return {
    title:`Free ${subject.name} Sample Lesson | LearnBridge`,
    description:`Read a free ${subject.name} sample lesson, then explore structured topic plans, examples, practice and full LearnBridge lesson notes.`,
    path:samplePath(subject.id),index:true,kind:'sample',
  };
  if(subject&&path.startsWith('/subject/'))return {
    title:`${subject.name} Topics and Lesson Notes | LearnBridge`,
    description:`Explore ${subject.name} topics, class plans, worked examples, practice questions and structured secondary lesson notes on LearnBridge.`,
    path:subjectPath(subject.id),index:true,kind:'resource',
  };
  if(path.startsWith('/class/'))return {
    title:`Year ${year} ${curriculum} Subjects and Lesson Notes | LearnBridge`,
    description:`Browse Year ${year} ${curriculum} curriculum subjects, topic plans, worked examples, practice questions and structured lesson notes.`,
    path:classPath(curriculum,year),index:true,kind:'collection',
  };
  if(page==='Overview'&&path==='/nigerian-curriculum')return {
    title:'Nigerian Curriculum Lesson Notes for JSS & SS | LearnBridge',
    description:'Explore Nigerian junior and senior secondary subjects, class topic plans, worked examples and structured lesson notes for JSS 1-3 and SS 1-3.',
    path:'/nigerian-curriculum',index:true,kind:'collection',
  };
  if(page==='Overview'&&path==='/british-curriculum')return {
    title:'British Curriculum Study Support | LearnBridge',
    description:'Explore structured study support for England Key Stage 3 and 4, GCSE, Cambridge IGCSE and post-16 AS and A-level pathways.',
    path:'/british-curriculum',index:true,kind:'collection',
  };
  const values:Record<AppPage,PageMetadata>={
    Overview:{title:'LearnBridge | Nigerian & British Secondary Learning',description:'Explore secondary school subjects, topic plans and lesson notes for Nigerian JSS and SS plus British KS3, GCSE, IGCSE and post-16 pathways.',path:'/',index:true,kind:'page'},
    Subjects:{title:'Secondary School Subjects and Lesson Notes | LearnBridge',description:`Browse ${curriculum} secondary school subjects, class topic plans, worked examples, practice questions and structured lesson notes.`,path:'/subjects',index:true,kind:'collection'},
    Plans:{title:'LearnBridge Plans for Students and Families',description:'Compare LearnBridge individual, family and school access options for structured secondary lesson notes and learning support.',path:'/plans',index:true,kind:'page'},
    'For Schools':{title:'LearnBridge for Schools | 30-Day Learning Platform Pilot',description:'Request a supervised 30-day LearnBridge pilot for up to 25 learners, with teacher access and custom termly or annual school licensing.',path:'/schools',index:true,kind:'page'},
    Bookmarks:{title:'Saved Lessons | LearnBridge',description:'Your privately saved LearnBridge lesson notes.',path:'/bookmarks',index:false,kind:'page'},
    Progress:{title:'Learning Progress | LearnBridge',description:'Your private LearnBridge lesson and checkpoint progress.',path:'/progress',index:false,kind:'page'},
    Account:{title:'Account Dashboard | LearnBridge',description:'Secure LearnBridge subscription and family account dashboard.',path:'/account',index:false,kind:'page'},
    School:{title:'School Dashboard | LearnBridge',description:'Secure LearnBridge school licence and learner-management dashboard.',path:'/school',index:false,kind:'page'},
    Platform:{title:'Platform Administration | LearnBridge',description:'Secure LearnBridge platform administration.',path:'/platform',index:false,kind:'page'},
    'Join School':{title:'Join LearnBridge',description:'Accept a private LearnBridge school or family invitation.',path:'/join-school',index:false,kind:'page'},
  };
  return values[page];
}

function upsertMeta(selector:string,attributes:Record<string,string>,content:string) {
  let element=document.head.querySelector<HTMLMetaElement>(selector);
  if(!element){element=document.createElement('meta');Object.entries(attributes).forEach(([name,value])=>element!.setAttribute(name,value));document.head.appendChild(element);}
  element.setAttribute('content',content);
}

export function applySeo(page:AppPage,curriculum:Curriculum,year:number,subject?:SeoSubject) {
  const value=metadata(page,curriculum,year,subject);
  const canonical=SITE_ORIGIN+value.path;
  document.title=value.title;
  upsertMeta('meta[name="description"]',{name:'description'},value.description);
  upsertMeta('meta[name="robots"]',{name:'robots'},value.index?'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1':'noindex, nofollow');
  upsertMeta('meta[property="og:type"]',{property:'og:type'},'website');
  upsertMeta('meta[property="og:title"]',{property:'og:title'},value.title);
  upsertMeta('meta[property="og:description"]',{property:'og:description'},value.description);
  upsertMeta('meta[property="og:url"]',{property:'og:url'},canonical);
  upsertMeta('meta[property="og:image"]',{property:'og:image'},`${SITE_ORIGIN}/learnbridge-social.png`);
  upsertMeta('meta[name="twitter:card"]',{name:'twitter:card'},'summary_large_image');
  upsertMeta('meta[name="twitter:title"]',{name:'twitter:title'},value.title);
  upsertMeta('meta[name="twitter:description"]',{name:'twitter:description'},value.description);
  upsertMeta('meta[name="twitter:image"]',{name:'twitter:image'},`${SITE_ORIGIN}/learnbridge-social.png`);
  let canonicalLink=document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if(!canonicalLink){canonicalLink=document.createElement('link');canonicalLink.rel='canonical';document.head.appendChild(canonicalLink);}
  canonicalLink.href=canonical;
  const graph:Array<Record<string,unknown>>=[
    {'@type':'WebSite','@id':`${SITE_ORIGIN}/#website`,url:`${SITE_ORIGIN}/`,name:'LearnBridge',description:'Nigerian and British secondary learning pathways in one platform',inLanguage:'en'},
    {'@type':'SoftwareApplication','@id':`${SITE_ORIGIN}/#application`,name:'LearnBridge',url:`${SITE_ORIGIN}/`,applicationCategory:'EducationalApplication',operatingSystem:'Web',educationalLevel:'Secondary education',audience:{'@type':'EducationalAudience',educationalRole:['student','teacher','parent']}},
    {'@type':value.kind==='collection'?'CollectionPage':'WebPage','@id':`${canonical}#webpage`,url:canonical,name:value.title,description:value.description,isPartOf:{'@id':`${SITE_ORIGIN}/#website`},inLanguage:'en'},
  ];
  if(subject)graph.push({'@type':'LearningResource','@id':`${canonical}#learning-resource`,name:subject.name,description:value.description,url:canonical,learningResourceType:value.kind==='sample'?'sample lesson':'lesson notes and topic plan',educationalLevel:'Secondary education',isAccessibleForFree:value.kind==='sample',about:subject.topics.slice(0,12)});
  let structured=document.getElementById('learnbridge-structured-data');
  if(!structured){structured=document.createElement('script');structured.id='learnbridge-structured-data';structured.setAttribute('type','application/ld+json');document.head.appendChild(structured);}
  structured.textContent=JSON.stringify({'@context':'https://schema.org','@graph':graph});
}

export function replaceBrowserPath(page:AppPage,curriculum:Curriculum,replace=false) {
  const path=pathForPage(page,curriculum);
  if(cleanPath(window.location.pathname)===cleanPath(path)&&!window.location.search)return;
  window.history[replace?'replaceState':'pushState']({},'',path);
}

export function isPrivatePage(page:AppPage) {
  return privatePages.has(page);
}
