import test from 'node:test';
import assert from 'node:assert/strict';
import { briefLessonText, buildTeacherGuide, canSelectLessonAudience, conciseStudentMathematicsNotes, isMathematicsSubject, lessonAudience, lessonPayloadForAudience, studentLessonNotes } from '../backend/lesson-audience.mjs';

const notes={
  objectives:['Describe cell division.','Compare mitosis stages.','Apply the ideas to growth.'],
  keyTerms:[{term:'Mitosis',definition:'Cell division.'}],
  sections:[{heading:'Introduction',paragraphs:['One','Two']}],
  examples:[{title:'A growing root',steps:['One','Two','Three']}],
  summary:['One'],
  exercises:[{question:'What is mitosis?',answer:'Cell division.',explanation:'It produces new cells.'}],
  quiz:[{question:'Which process?',choices:['Mitosis','Digestion','Respiration'],answer:0,explanation:'Mitosis makes new cells.'}],
};

const longMathematicsNotes={
  ...notes,
  objectives:['One','Two','Three','Four','Five','Six'],
  keyTerms:Array.from({length:8},(_,index)=>({term:`Term ${index+1}`,definition:'Definition'})),
  sections:Array.from({length:6},(_,index)=>({heading:`Section ${index+1}`,paragraphs:[`Essential paragraph ${index+1}. This is an extended explanation that should not appear in the brief student note.`,`Additional detailed paragraph ${index+1}.`]})),
  examples:Array.from({length:3},(_,index)=>({title:`Example ${index+1}`,steps:Array.from({length:8},(__,step)=>`Step ${step+1}`)})),
  summary:['One','Two','Three','Four','Five','Six','Seven'],
};

test('teachers and students remain restricted to their assigned lesson audiences',()=>{
  assert.equal(lessonAudience({role:'teacher'}),'teacher');
  assert.equal(lessonAudience({role:'teacher'},'student'),'teacher');
  assert.equal(lessonAudience({role:'student'}),'student');
  assert.equal(lessonAudience({role:'student'},'teacher'),'student');
  assert.equal(lessonAudience({role:'account_owner'}),'student');
  assert.equal(lessonAudience(null),'student');
});

test('school and platform administrators can select either lesson audience',()=>{
  assert.equal(canSelectLessonAudience({role:'school_admin'}),true);
  assert.equal(canSelectLessonAudience({role:'super_admin'}),true);
  assert.equal(canSelectLessonAudience({role:'teacher'}),false);
  assert.equal(lessonAudience({role:'school_admin'}),'teacher');
  assert.equal(lessonAudience({role:'school_admin'},'student'),'student');
  assert.equal(lessonAudience({role:'super_admin'},'teacher'),'teacher');
  assert.equal(lessonAudience({role:'super_admin'},'student'),'student');
});

test('student lesson payload excludes teacher model answers without mutating cached notes',()=>{
  const student=studentLessonNotes(notes);
  assert.equal(student.exercises[0].answer,'');
  assert.equal(student.exercises[0].explanation,'');
  assert.equal(student.quiz[0].answer,-1);
  assert.equal(student.quiz[0].explanation,'');
  assert.equal(notes.exercises[0].answer,'Cell division.');
  assert.equal(notes.quiz[0].answer,0);
});

test('student mathematics notes are concise while retaining core learning activities',()=>{
  assert.equal(isMathematicsSubject({subjectId:'general-mathematics'}),true);
  assert.equal(isMathematicsSubject({subjectName:'Further Mathematics'}),true);
  assert.equal(isMathematicsSubject({subjectName:'Biology'}),false);
  const concise=conciseStudentMathematicsNotes(longMathematicsNotes);
  assert.equal(concise.objectives.length,3);
  assert.equal(concise.keyTerms.length,4);
  assert.equal(concise.sections.length,3);
  assert.ok(concise.sections.every(section=>section.paragraphs.length===1));
  assert.ok(concise.sections.every(section=>!section.paragraphs[0].includes('extended explanation')));
  assert.equal(concise.examples.length,2);
  assert.ok(concise.examples.every(example=>example.steps.length===4));
  assert.equal(concise.examples[0].steps.at(-1),'Step 8');
  assert.equal(concise.summary.length,4);
  assert.equal(concise.exercises.length,longMathematicsNotes.exercises.length);
  assert.equal(concise.quiz.length,longMathematicsNotes.quiz.length);
  assert.equal(concise.exercises[0].answer,'');
});

test('brief lesson text removes extended explanation without breaking inline mathematics',()=>{
  assert.equal(briefLessonText('Use the common denominator first. Then add the numerators. Finally simplify.'),'Use the common denominator first.');
  const shortened=briefLessonText(`Multiply \\( \\frac{3 \\times 5}{4 \\times 5} \\) to form an equivalent fraction and then continue with a deliberately long explanation ${'word '.repeat(70)}`,{maximumCharacters:120});
  assert.ok(shortened.length<225);
  assert.equal((shortened.match(/\\\(/gu)||[]).length,(shortened.match(/\\\)/gu)||[]).length);
});

test('audience projection shortens mathematics only for student view',()=>{
  const student=lessonPayloadForAudience({auth:{role:'student'},notes:longMathematicsNotes,topic:{title:'Fractions'},subjectId:'mathematics',subjectName:'Mathematics',classLabel:'Year 10'});
  const teacher=lessonPayloadForAudience({auth:{role:'teacher'},notes:longMathematicsNotes,topic:{title:'Fractions'},subjectId:'mathematics',subjectName:'Mathematics',classLabel:'Year 10'});
  const biology=lessonPayloadForAudience({auth:{role:'student'},notes:longMathematicsNotes,topic:{title:'Cells'},subjectId:'biology',subjectName:'Biology',classLabel:'Year 10'});
  assert.equal(student.conciseMathematics,true);
  assert.equal(student.notes.sections.length,3);
  assert.equal(teacher.notes.sections.length,6);
  assert.equal(teacher.teacherGuide.answerKey.exercises[0].answer,'Cell division.');
  assert.equal(biology.conciseMathematics,false);
  assert.equal(biology.notes.sections.length,6);
  assert.equal(biology.notes.sections[0].paragraphs.length,2);
});

test('teacher payload contains a classroom lesson plan and private answer key',()=>{
  const payload=lessonPayloadForAudience({auth:{role:'teacher'},notes,topic:{title:'Cell growth and division'},subjectName:'Biology',classLabel:'SS 1'});
  assert.equal(payload.audience,'teacher');
  assert.equal(payload.notes.exercises[0].answer,'Cell division.');
  assert.equal(payload.teacherGuide.lessonTitle,'Cell growth and division');
  assert.equal(payload.teacherGuide.sequence.length,5);
  assert.equal(payload.teacherGuide.answerKey.exercises[0].answer,'Cell division.');
  assert.equal(payload.teacherGuide.answerKey.checkpoint[0].correctChoice,'Mitosis');
});

test('administrator student view receives no private teacher answers',()=>{
  const payload=lessonPayloadForAudience({auth:{role:'school_admin'},requestedAudience:'student',notes,topic:{title:'Cell growth and division'},subjectName:'Biology',classLabel:'SS 1'});
  assert.equal(payload.audience,'student');
  assert.equal(payload.notes.exercises[0].answer,'');
  assert.equal(payload.notes.quiz[0].answer,-1);
  assert.equal(payload.teacherGuide,undefined);
});

test('teacher guide provides safe defaults for older saved lessons',()=>{
  const guide=buildTeacherGuide({notes:{},topic:{title:'Introduction'},subjectName:'Science',classLabel:'Year 7'});
  assert.equal(guide.recommendedDurationMinutes,50);
  assert.equal(guide.sequence.length,5);
  assert.ok(guide.preparation.length>=3);
});
