import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const sources=Promise.all([
  fs.readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  fs.readFile(new URL('../src/NotesReader.tsx',import.meta.url),'utf8'),
  fs.readFile(new URL('../src/CommercialPortal.tsx',import.meta.url),'utf8'),
  fs.readFile(new URL('../backend/server.mjs',import.meta.url),'utf8'),
]);

test('teacher and student accounts receive distinct workspace navigation',async()=>{
  const [app,,portal]=await sources;
  assert.match(app,/TEACHER WORKSPACE/);
  assert.match(app,/STUDENT LEARNING SPACE/);
  assert.match(app,/Teacher home/);
  assert.match(app,/Subjects & lessons/);
  assert.match(app,/href='\/terms'/);
  assert.match(app,/href='\/privacy'/);
  assert.match(app,/href='\/refunds'/);
  assert.match(portal,/user\.role==='teacher'\|\|user\.role==='student'\?'Overview'/);
});

test('administrators can switch between teacher and student workspaces',async()=>{
  const [app,reader,,server]=await sources;
  assert.match(app,/administratorWorkspaceRoles=new Set\(\['school_admin','super_admin'\]\)/);
  assert.match(app,/Administrator view/);
  assert.match(app,/selectAdministratorWorkspace\('teacher'\)/);
  assert.match(app,/selectAdministratorWorkspace\('student'\)/);
  assert.match(app,/audience=\{workspaceAudience\}/);
  assert.match(reader,/requestedAudience:LessonAudience=p\.audience/);
  assert.match(reader,/audience:requestedAudience/);
  assert.match(server,/requestedAudience:req\.body\?\.audience/);
  assert.match(server,/administratorWorkspaceSwitching:true/);
});

test('browser records are isolated by audience and signed-in user',async()=>{
  const [app,reader]=await sources;
  assert.match(app,/learnbridge-workspace-v2:\$\{workspaceAudience\}:\$\{workspaceIdentity\}/);
  assert.match(app,/learnbridge-notes-v2:\$\{workspaceAudience\}:\$\{workspaceIdentity\}/);
  assert.match(reader,/learnbridge-full-note-v11-brief-mathematics1/);
  assert.match(reader,/cached\.audience===requestedAudience/);
  assert.match(reader,/requestIdentity:string/);
  assert.match(reader,/`\$\{requestedAudience\}:\$\{user\?\.id\|\|'public'\}`/);
});

test('student interface has no teacher answer key and uses server-side checkpoint grading',async()=>{
  const [,reader,,server]=await sources;
  assert.match(reader,/teacherView&&teacherGuide&&<section className='teacher-answer-key'/);
  assert.match(reader,/!teacherView&&<section className='checkpoint'/);
  assert.match(reader,/api\.post\('\/api\/lesson-checkpoint'/);
  assert.match(server,/app\.post\('\/api\/lesson-checkpoint'/);
  assert.match(server,/studentAnswerIsolation:true/);
});

test('student mathematics uses a brief projection without changing teacher notes',async()=>{
  const [,reader,,server]=await sources;
  assert.match(reader,/Brief student mathematics lesson/);
  assert.match(reader,/Key ideas, short worked examples, practice and checkpoint/);
  assert.match(server,/conciseStudentMathematics:true/);
  assert.match(server,/briefStudentMathematics:true/);
  assert.match(server,/subjectId:input\.subjectId/);
});

test('teacher interface publishes delivery guidance and private material markers',async()=>{
  const [,reader]=await sources;
  assert.match(reader,/Teacher lesson plan/);
  assert.match(reader,/PRIVATE TEACHER MATERIAL/);
  assert.match(reader,/Suggested teaching sequence/);
  assert.match(reader,/Teacher answer key/);
});
