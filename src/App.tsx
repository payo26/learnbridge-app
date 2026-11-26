import { useEffect, useState } from 'react';
import { ArrowUpRight, BookOpen, Bookmark, CheckCircle2, GraduationCap, Search, ChevronRight, Trophy, BarChart3, Library, Compass, Building2, ShieldCheck, CreditCard } from 'lucide-react';
import subjectData from './subjects.json';
import profileData from './profiles.json';
import './learn.css';
import NotesReader from './NotesReader';
import CommercialPortal from './CommercialPortal';
import { useAuth } from './AuthContext';
import type { NoteRecord } from '../shared/notes-types';

type Lesson = {id:string;title:string;text:string;q:string;choices:string[];answer:number;band:number;minutes:number};
type Subject = {id:string;name:string;icon:string;topics:string[];lessons:Lesson[]};
type Offering = {subjectId:string;group:string;status:string};
type Saved = {year:number;curriculum:string;edition:string;done:string[];scores:Record<string,number>;bookmarks:string[]};
type WorkspaceAudience = 'teacher'|'student';
type NavigationItem = {page:string;label:string;icon:typeof Compass};
const subjects: Subject[] = subjectData;
const profiles: Record<string,Offering[]> = profileData;
const initial:Saved={year:7,curriculum:'Nigerian',edition:'revised',done:[],scores:{},bookmarks:[]};
function initialPage(){
  const parameters=new URLSearchParams(window.location.search);
  const fragment=new URLSearchParams(window.location.hash.replace(/^#/,''));
  if(fragment.get('password-reset'))return 'Plans';
  if(parameters.get('join'))return 'Join School';
  if(parameters.get('payment')==='consumer')return 'Account';
  if(parameters.get('payment')==='callback')return 'School';
  return 'Overview';
}
const administratorWorkspaceRoles=new Set(['school_admin','super_admin']);
function restore(storageKey:string):Saved {
  try {
    const savedValue=localStorage.getItem(storageKey);
    const legacyValue=localStorage.getItem('learnbridge-v1');
    const s=JSON.parse(savedValue||legacyValue||'null');
    if(!s)return initial;
    const keepActivity=Boolean(savedValue);
    return {...initial,year:[7,8,9,10,11,12].includes(s.year)?s.year:7,curriculum:s.curriculum==='British'?'British':'Nigerian',edition:s.edition==='earlier'?'earlier':'revised',done:keepActivity&&Array.isArray(s.done)?s.done.filter((x:unknown)=>typeof x==='string'):[],bookmarks:keepActivity&&Array.isArray(s.bookmarks)?s.bookmarks.filter((x:unknown)=>typeof x==='string'):[],scores:keepActivity&&s.scores&&typeof s.scores==='object'?s.scores:{}};
  } catch { return initial; }
}
function restoreNotes(storageKey:string):Record<string,NoteRecord> {
  try { return JSON.parse(localStorage.getItem(storageKey)||'{}'); } catch { return {}; }
}
const sources={
  nigeria:'https://www.nerdc.gov.ng/content_manager/Press%20Release%20On%20New%20FG%20Curriculum.pdf',
  earlier:'https://www.nerdc.org.ng/SubjectListings.aspx',
  england:'https://www.gov.uk/national-curriculum/key-stage-3-and-4',
  igcse:'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-upper-secondary/cambridge-igcse/subjects/',
  post16:'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-advanced/cambridge-international-as-and-a-levels/subjects/',
  waec:'https://waecnigeria.org/node/102'
};
function App() {
  const {user,logout}=useAuth();
  const adminCanSwitch=Boolean(user&&administratorWorkspaceRoles.has(user.role));
  const [administratorAudience,setAdministratorAudience]=useState<WorkspaceAudience>('teacher');
  const assignedAudience:WorkspaceAudience=user?.role==='teacher'?'teacher':'student';
  const workspaceAudience:WorkspaceAudience=adminCanSwitch?administratorAudience:assignedAudience;
  const teacherWorkspace=workspaceAudience==='teacher';
  const workspaceIdentity=user?.id||'public';
  const savedStorageKey=`learnbridge-workspace-v2:${workspaceAudience}:${workspaceIdentity}`;
  const noteStorageKey=`learnbridge-notes-v2:${workspaceAudience}:${workspaceIdentity}`;
  const [saved,setSaved]=useState<Saved>(()=>restore(savedStorageKey));
  const [noteRecords,setNoteRecords]=useState<Record<string,NoteRecord>>(()=>restoreNotes(noteStorageKey));
  const [page,setPage]=useState(initialPage);
  const [query,setQuery]=useState('');
  const [group,setGroup]=useState('All');
  const [error,setError]=useState('');
  const [active,setActive]=useState<Subject|null>(null);
  const [resumeTopic,setResumeTopic]=useState<string|undefined>(undefined);
  useEffect(()=>{
    if(!adminCanSwitch||!user)return;
    try {
      const savedAudience=localStorage.getItem(`learnbridge-admin-workspace-v1:${user.id}`);
      setAdministratorAudience(savedAudience==='student'?'student':'teacher');
    } catch { setAdministratorAudience('teacher'); }
  },[adminCanSwitch,user?.id]);
  useEffect(()=>{
    setSaved(restore(savedStorageKey));
    setNoteRecords(restoreNotes(noteStorageKey));
    setActive(null);
    setResumeTopic(undefined);
    if(teacherWorkspace)setPage(current=>current==='Progress'?'Overview':current);
  },[savedStorageKey,noteStorageKey,teacherWorkspace]);
  function selectAdministratorWorkspace(audience:WorkspaceAudience) {
    if(!adminCanSwitch||!user)return;
    setAdministratorAudience(audience);
    try { localStorage.setItem(`learnbridge-admin-workspace-v1:${user.id}`,audience); } catch { /* The selection remains active for this visit. */ }
    setPage('Overview');setQuery('');setGroup('All');setActive(null);setResumeTopic(undefined);
  }
  function saveNote(record:NoteRecord) {
    const next={...noteRecords,[record.id]:record};
    setNoteRecords(next);
    try { localStorage.setItem(noteStorageKey,JSON.stringify(next)); } catch { setError('Your browser could not save lesson progress. It remains available during this visit.'); }
  }
  const junior=saved.year<=9;
  const nigeria=saved.curriculum==='Nigerian';
  const key=nigeria ? (saved.edition==='earlier'?'ng-old-':'ng-')+(junior?'junior':'senior') : junior?'uk-junior':saved.year===12?'uk-post16':'uk-senior';
  const offered=profiles[key];
  const entries=offered.map(o=>({offering:o,subject:subjects.find(s=>s.id===o.subjectId)!}));
  const groups=[...new Set(offered.map(o=>o.group))];
  const visible=entries.filter(({subject,offering})=>(group==='All'||offering.group===group)&&(subject.name+' '+subject.topics.join(' ')).toLowerCase().includes(query.toLowerCase()));
  const availableLessons=[...new Map(entries.flatMap(({subject})=>subject.lessons.map(l=>[l.id,{subject,lesson:l}] as const))).values()];
  const done=availableLessons.filter(x=>saved.done.includes(x.lesson.id)).length;
  const attempted=availableLessons.filter(x=>saved.scores[x.lesson.id]!==undefined);
  const average=attempted.length?Math.round(attempted.reduce((n,x)=>n+saved.scores[x.lesson.id],0)/attempted.length):0;
  const stage=nigeria?(junior?'JSS 1-3':'SS 1-3'):junior?'Key Stage 3':saved.year===12?'Post-16 / AS & A-level':'Key Stage 4 / GCSE & IGCSE';
  const sectionName=junior?(nigeria?'Junior secondary':'Lower secondary'):(nigeria?'Senior secondary':'Upper secondary & post-16');
  const reference=nigeria?(saved.edition==='earlier'?sources.earlier:sources.nigeria):saved.year===12?sources.post16:sources.england;
  const currentNotes=Object.values(noteRecords).filter(r=>r.profile===key&&r.year===saved.year&&offered.some(o=>o.subjectId===r.subjectId));
  function resumeNote(r:NoteRecord) { const s=subjects.find(s=>s.id===r.subjectId); if(s){setResumeTopic(r.topic.id);setActive(s);} }
  function update(next:Saved) {
    setSaved(next);
    try {localStorage.setItem(savedStorageKey,JSON.stringify(next));setError('');}
    catch {setError('Your browser could not save changes. Progress remains available during this visit.');}
  }
  function change(next:Saved) {update(next);setQuery('');setGroup('All');setActive(null);setResumeTopic(undefined);}
  function open(s:Subject,_lesson:Lesson|null=null) {
    setResumeTopic(undefined);
    setActive(s);
  }
  function openTopic(s:Subject,_title:string) {
    open(s);
  }
  function bookmark(id:string) {update({...saved,bookmarks:saved.bookmarks.includes(id)?saved.bookmarks.filter(x=>x!==id):[...saved.bookmarks,id]});}
  const commercialPages=['Plans','For Schools','Account','School','Platform','Join School'];
  const commercialPage=commercialPages.includes(page);
  const navigation:NavigationItem[]=teacherWorkspace
    ? [{page:'Overview',label:'Teacher home',icon:Compass},{page:'Subjects',label:'Curriculum & notes',icon:Library},{page:'Bookmarks',label:'Saved teaching notes',icon:Bookmark},{page:'Plans',label:'Plans',icon:CreditCard},{page:'For Schools',label:'For schools',icon:Building2}]
    : [{page:'Overview',label:'Student home',icon:Compass},{page:'Subjects',label:'Subjects & lessons',icon:Library},{page:'Bookmarks',label:'Saved lessons',icon:Bookmark},{page:'Progress',label:'My progress',icon:BarChart3},{page:'Plans',label:'Plans',icon:CreditCard},{page:'For Schools',label:'For schools',icon:Building2}];
  if(user&&(user.school?.accountType==='individual'||user.school?.accountType==='family'))navigation.push({page:'Account',label:'My account',icon:ShieldCheck});
  if(user&&user.school?.accountType==='school'&&['school_admin','teacher','student'].includes(user.role))navigation.push({page:'School',label:user.role==='student'?'My school':'School dashboard',icon:ShieldCheck});
  if(user?.role==='super_admin')navigation.push({page:'Platform',label:'Platform admin',icon:ShieldCheck});
  const currentPageLabel=navigation.find(item=>item.page===page)?.label||page;
  return <div className='shell'>
    <aside className='sidebar'>
      <a className='brand' href='#' onClick={e=>{e.preventDefault();setPage('Overview');}}><span className='brand-icon'><GraduationCap size={25}/></span>LearnBridge<span className='brand-dot'>.</span></a>
      <div className='workspace-label'>{teacherWorkspace?'TEACHER WORKSPACE':'STUDENT LEARNING SPACE'}</div>
      {adminCanSwitch&&<div className='administrator-workspace-switch' role='group' aria-label='Administrator workspace access'><span>Administrator view</span><div><button type='button' aria-pressed={teacherWorkspace} className={teacherWorkspace?'chosen':''} onClick={()=>selectAdministratorWorkspace('teacher')}>Teacher</button><button type='button' aria-pressed={!teacherWorkspace} className={!teacherWorkspace?'chosen':''} onClick={()=>selectAdministratorWorkspace('student')}>Student</button></div></div>}
      <nav>{navigation.map(item=>{const C=item.icon;return <button key={item.page} className={page===item.page?'nav active':'nav'} onClick={()=>{setPage(item.page);setQuery('');setGroup('All');}}><C size={19}/>{item.label}</button>;})}</nav>
      <div className={`side-note ${teacherWorkspace?'teacher-side-note':''}`}><div className='tiny-pill'>{teacherWorkspace?'TEACHING TOOLS':'TWO CURRICULUM PATHWAYS'}</div><h3>{teacherWorkspace?'Plan clearly. Teach confidently.':'Learn locally. Think globally.'}</h3><p>{teacherWorkspace?'Prepare class-specific notes, teaching sequences, activities, assessment prompts and private answer keys.':'Move between Nigerian and British subject pathways while keeping progress in one student learning space.'}</p><div className='flag-tags'><span>NIGERIAN</span><span>BRITISH</span></div></div>
      <div className='device-profile'><span className='avatar'>{user?.displayName?.[0]?.toUpperCase()||(teacherWorkspace?'T':'S')}</span><div><strong>{user?.displayName||(teacherWorkspace?'Teacher workspace':'Student workspace')}</strong><small>{user?user.school?.name||'Platform administrator':'Public student samples'}</small></div>{user&&<button className='signout-link' onClick={()=>void logout()}>Sign out</button>}</div>
    </aside>
    <main><header><div className='breadcrumb'>{teacherWorkspace?'Teacher workspace':'Student workspace'} <ChevronRight size={14}/>{currentPageLabel}</div><div className='header-actions'><span className='header-label'>{saved.curriculum.toUpperCase()} <span>|</span> {stage.toUpperCase()}</span>{!user&&<button className='outline header-login' onClick={()=>setPage('Plans')}>Plans & sign in</button>}</div></header>
    <div className='content'>
      {commercialPage?<CommercialPortal mode={page as 'Plans'|'For Schools'|'Account'|'School'|'Platform'|'Join School'} onNavigate={setPage}/>:<>
      <div className='eyebrow'>{teacherWorkspace?'PLAN. TEACH. ASSESS.':'YOUR CLASS. YOUR CURRICULUM. YOUR JOURNEY.'}</div>
      <h1>{page==='Overview'?(teacherWorkspace?'Your teaching workspace.':'Your next chapter starts here.'):page==='Subjects'?(teacherWorkspace?'Curriculum and lesson notes.':'Subjects for your stage.'):page==='Bookmarks'?(teacherWorkspace?'Your saved teaching notes.':'Your saved discoveries.'):'See how far you have come.'}</h1>
      <p className='subtitle'>{teacherWorkspace?'Prepare class-specific lessons with teaching guidance, learner activities and private answer keys.':'Relevant subjects, clear choices and a place to start learning.'}</p>
      <div className='curriculum-switch' aria-label='Curriculum pathway'>
        <button aria-pressed={nigeria} className={nigeria?'chosen':''} onClick={()=>change({...saved,curriculum:'Nigerian'})}><strong>Nigerian curriculum</strong><small>Revised and transitioning JSS/SS frameworks</small></button>
        <button aria-pressed={!nigeria} className={!nigeria?'chosen':''} onClick={()=>change({...saved,curriculum:'British'})}><strong>British curriculum pathway</strong><small>England KS3/KS4 with Cambridge international options</small></button>
      </div>
      <div className='section-switch' aria-label='Secondary section'>
        <button aria-pressed={junior} className={junior?'chosen':''} onClick={()=>change({...saved,year:junior?saved.year:7})}><strong>{nigeria?'Junior secondary':'Lower secondary'}</strong><small>Years 7-9 - {nigeria?'JSS 1-3':'England KS3'}</small></button>
        <button aria-pressed={!junior} className={!junior?'chosen':''} onClick={()=>change({...saved,year:junior?10:saved.year})}><strong>{nigeria?'Senior secondary':'Upper secondary & post-16'}</strong><small>Years 10-12 - {nigeria?'SS 1-3':'KS4 / GCSE, IGCSE & AS/A-level'}</small></button>
      </div>
      <div className='preferences'>
        <label>Class<select aria-label='Class' value={saved.year} onChange={e=>change({...saved,year:Number(e.target.value)})}>{(junior?[7,8,9]:[10,11,12]).map(y=><option key={y} value={y}>Year {y}{nigeria?' - '+(y<=9?'JSS '+(y-6):'SS '+(y-9)):''}</option>)}</select></label>
        {nigeria&&<label>Subject framework<select aria-label='Subject framework' value={saved.edition} onChange={e=>change({...saved,edition:e.target.value})}><option value='revised'>Revised curriculum</option><option value='earlier'>Earlier curriculum / transitioning cohort</option></select></label>}
        <span className='stage'><span className='status-dot'/>{stage}</span>
      </div>
      <section className='curriculum-note'><strong>{saved.curriculum} - {stage}</strong>
        <p>{nigeria?(saved.edition==='revised'?(junior?'The revised JSS framework has 12 subject requirements, with one Nigerian language, a relevant religious-studies choice and one of six trades. French and Arabic are optional. Alternative choices below are not extra compulsory subjects.':'English Language, General Mathematics, Citizenship and Heritage Studies, Digital Technologies and one trade form the five school-curriculum core requirements. Science, humanities and business subjects are electives; students may combine fields.'): 'Earlier-curriculum subjects are shown for transitioning cohorts. Some junior subjects are components of larger curriculum areas. Confirm the framework used by your school; the revised rollout begins at the start of a three-year cycle.'):(junior?'England KS3 combines English, mathematics and science with foundation subjects, religious education and relationships, sex and health education. Modern Foreign Languages is a subject area; the particular language depends on the school.':saved.year===12?'Year 12 is post-16 study, not a third GCSE year. These are subject choices for AS/A-level pathways, not a compulsory list for every student. Schools also offer vocational qualifications. AS-only, A-level-only, regional and examination-year availability must be checked with the provider.':'England KS4 core subjects are English, mathematics and science; computing, PE and citizenship are foundation subjects. RE and relationships, sex and health education remain required provision. Choose combined science or a separate-science route. Optional subjects include GCSE/IGCSE offerings, which vary by school and exam board.')}</p>
        {nigeria&&!junior&&<p className='exam-note'>School curriculum and examination entry are different. WAEC states that the only examination core subjects for 2026/2027 are English Language and General Mathematics; Citizenship and Heritage Studies and Digital Technologies are not examined until 2028. Confirm your exam-year subject entry with your school.</p>}
        <div className='reference-links'><a href={reference} target='_blank' rel='noreferrer'>Official subject reference</a>{!nigeria&&!junior&&saved.year!==12&&<a href={sources.igcse} target='_blank' rel='noreferrer'>Cambridge IGCSE options</a>}{nigeria&&!junior&&<a href={sources.waec} target='_blank' rel='noreferrer'>WAEC entry guidance</a>}</div>
      </section>
      {error&&<p role='alert' className='notice'>{error}</p>}
      {page==='Overview'&&<>
        <section className={`hero ${teacherWorkspace?'teacher-hero':''}`}><div><span className='hero-tag'>{teacherWorkspace?'CLASSROOM-READY LESSON SUPPORT':junior?'BUILD YOUR FOUNDATIONS':'EXPLORE YOUR NEXT DIRECTION'}</span><h2>{teacherWorkspace?'Plan the lesson.':junior?'A strong start.':'More choice.'}<br/>{teacherWorkspace?'Keep answers private.':junior?'A wider world.':'A clearer direction.'}</h2><p>{teacherWorkspace?<>Open any subject to prepare a class-specific teacher lesson note.<br/>Each note includes a teaching sequence, assessment guidance and answer key.</>:<>Explore {entries.length} subject entries and alternatives for {stage}.<br/>Start with a subject guide or an available lesson.</>}</p><button className='light-button' onClick={()=>setPage('Subjects')}>{teacherWorkspace?'Prepare a lesson':'Explore subjects'} <ArrowUpRight size={18}/></button></div><div className='hero-art' aria-hidden='true'><div className='orbit'/><div className='book-graphic'><BookOpen size={88} strokeWidth={1.2}/></div><div className='float-chip chip-b'>{teacherWorkspace?'Teacher only':junior?'Stay curious':'Find your direction'}</div></div></section>
        <section className='stats'><div><span className='stat-icon lavender'><BookOpen size={22}/></span><div><strong>{entries.length}</strong><span>{teacherWorkspace?'Subjects available to teach':'Subject entries & choices'}</span></div></div><div><span className='stat-icon mint'><CheckCircle2 size={22}/></span><div><strong>{teacherWorkspace?currentNotes.filter(record=>record.read).length:done}{!teacherWorkspace&&<small> / {availableLessons.length}</small>}</strong><span>{teacherWorkspace?'Lesson notes marked prepared':'Archived starter lessons read'}</span></div></div><div><span className='stat-icon peach'><Trophy size={22}/></span><div><strong>{teacherWorkspace?currentNotes.filter(record=>record.bookmarked).length:average}{!teacherWorkspace&&<small>%</small>}</strong><span>{teacherWorkspace?'Saved teaching notes':'Best-score average in this section'}</span></div></div></section>
      </>}
      {(page==='Overview'||page==='Subjects')&&<>
        <div className='section-heading'><div><h2>{sectionName} {teacherWorkspace?'teaching library':'subject library'}</h2><p>{entries.length} subject entries and choices for {saved.curriculum}. {teacherWorkspace?'Open a subject for its class topic plan, teacher lesson notes and private answer keys.':'Open a subject for a detailed class topic plan and student lessons.'}</p></div><label className='search'><Search size={17}/><input aria-label='Search subjects' placeholder='Search subjects or topics' value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
        <label className='group-select'>Subject category<select aria-label='Subject category' value={group} onChange={e=>setGroup(e.target.value)}><option>All</option>{groups.map(g=><option key={g}>{g}</option>)}</select><span>{visible.length} shown</span></label>
        <div className='cards'>{visible.map(({subject:s,offering:o},i)=><article className='subject-card' key={s.id}>
          <div className='card-top'><span className={'subject-icon color-'+i%5}>{s.icon}</span><span className='requirement'>{o.status}</span></div>
          <h3>{s.name}</h3><p>{o.group}</p><div className='card-divider'/>
          <div className='card-topic-heading'>Study areas <span>{s.topics.length}</span></div>
          <ul className='card-topics'>{s.topics.map(t => <li key={t}><button onClick={() => openTopic(s,t)}><span>{t}</span><ChevronRight size={14}/></button></li>)}</ul><button className='primary class-topics-button' onClick={()=>open(s)}>{teacherWorkspace?'Open teacher topic plan':'View student topics & lessons'}</button>
          <div className='card-bottom'><span>{teacherWorkspace?'Teacher plan - delivery guide - answers':'Student lesson - examples - practice'}</span><button aria-label={'Open '+s.name} onClick={()=>open(s)}><ArrowUpRight size={20}/></button></div>
        </article>)}</div>
        {!visible.length&&<div className='empty'><Search/><h3>No matching subjects in this section</h3><p>Try another search, subject category, class or curriculum pathway.</p><button className='primary' onClick={()=>{setQuery('');setGroup('All');}}>Clear filters</button></div>}
      </>}
      {page==='Bookmarks'&&<>
        <div className='section-heading'><div><h2>{teacherWorkspace?'Saved teacher lesson notes':'Saved student lessons'} for your class</h2><p>Switch class or curriculum to view its role-specific saved notes.</p></div></div>
        <div className='saved-list'>{currentNotes.filter(r=>r.bookmarked).map(r=><article key={r.id}><div><small>{subjects.find(s=>s.id===r.subjectId)?.name}</small><h3>{r.topic.title}</h3></div><div><button className='text-button' onClick={()=>saveNote({...r,bookmarked:false})}>Remove</button><button className='primary' onClick={()=>resumeNote(r)}>{teacherWorkspace?'Prepare lesson':'Read lesson'}</button></div></article>)}</div>
        {!currentNotes.some(r=>r.bookmarked)&&<p className='notice-neutral'>No {teacherWorkspace?'teacher lesson notes':'student lessons'} bookmarked for this class yet.</p>}
        {!teacherWorkspace&&<><h3 className='archive-title'>Earlier starter bookmarks</h3>
        {!availableLessons.some(x=>saved.bookmarks.includes(x.lesson.id))?<div className='empty'><Bookmark/><h3>No bookmarks in this section</h3><p>Open a starter lesson and choose Save bookmark.</p><button className='primary' onClick={()=>setPage('Subjects')}>Browse subjects</button></div>:<div className='saved-list'>{availableLessons.filter(x=>saved.bookmarks.includes(x.lesson.id)).map(x=><article key={x.lesson.id}><div><small>{x.subject.name} - starter lesson</small><h3>{x.lesson.title}</h3></div><div><button className='text-button' onClick={()=>bookmark(x.lesson.id)}>Remove</button><button className='primary' onClick={()=>open(x.subject,x.lesson)}>Read lesson</button></div></article>)}</div>}</>}
      </>}
      {!teacherWorkspace&&page==='Progress'&&<>
        <section className='progress-intro'><Trophy size={36}/><div><h2>{currentNotes.filter(r=>r.read).length} full lesson notes read in this class</h2><p>{currentNotes.filter(r=>r.score!==undefined).length} full-lesson checkpoints attempted. New notes are tracked separately from earlier starter records.</p></div></section>
        <div className='saved-list'>{currentNotes.filter(r=>r.read||r.score!==undefined).map(r=><article key={r.id}><div><h3>{r.topic.title}</h3><small>{subjects.find(s=>s.id===r.subjectId)?.name} - {r.read?'Read':'Not yet marked read'}{r.score!==undefined?' - Best score '+r.score+'%':''}</small></div><button className='primary' onClick={()=>resumeNote(r)}>Read notes</button></article>)}</div>
        <p className='notice-neutral'>Earlier starter archive: {done} of {availableLessons.length} read; {attempted.length} checkpoints attempted. Full lesson notes are available through each subject's class plan.</p>
        <div className='saved-list'>{entries.map(({subject:s})=><article key={s.id}><div><h3>{s.name}</h3><small>{s.lessons.length?s.lessons.filter(l=>saved.done.includes(l.id)).length+' of '+s.lessons.length+' starter lessons read':'Open the class topic plan to read full notes'}</small></div><button className='primary' onClick={()=>open(s)}>Open subject</button></article>)}</div>
      </>}
      <footer><strong>Nigerian and British pathways in separate teacher and student workspaces.</strong><p>Years 7-9 and Years 10-12 are navigation bands, not claims of formal equivalence between JSS/SS, England key stages or Cambridge qualifications. British coverage uses England's national subject areas and Cambridge international options; UK nations, schools and examination boards differ. Detailed plans and notes are original study support and should be checked against the learner's current school scheme, syllabus and teacher guidance. No official past papers are included.</p><nav className='seo-links' aria-label='Legal information'><a href='/terms'>Terms and Conditions</a><a href='/privacy'>Privacy Policy</a><a href='/refunds'>Refund Policy</a></nav><span>Teacher plans and private answer keys are not included in student lesson responses. Browser records are separated by signed-in user and workspace.</span></footer>
      </>}
    </div></main>
    {active&&<NotesReader key={[workspaceAudience,workspaceIdentity,key,saved.year,active.id].join(':')} audience={workspaceAudience} profile={key} year={saved.year} subjectId={active.id} subjectName={active.name} records={noteRecords} onSave={saveNote} initialTopicId={resumeTopic} onRequestAccess={()=>{setActive(null);setPage(user?(user.role==='super_admin'?'Platform':user.school?.accountType==='individual'||user.school?.accountType==='family'?'Account':'School'):'Plans');}} onClose={()=>{setActive(null);setResumeTopic(undefined);}}/>}
  </div>;
}
export default App;

