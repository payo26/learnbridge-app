import test from 'node:test';
import assert from 'node:assert/strict';
import { curatedIllustrationsForLesson, diagramRequirement } from '../backend/diagram-coverage.mjs';
import { diagramRelevanceDecision, filterRelevantIllustrations, identifiedDiagramTemplate } from '../backend/diagram-relevance.mjs';

function context(topicTitle,notes={}) {
  const requirement=diagramRequirement({subjectId:'biology',subjectName:'Biology',topicTitle,notes});
  return {subjectId:'biology',subjectName:'Biology',topicTitle,notes,requirement};
}

test('cell growth and division does not select a digestive-system plate from a paragraph mention',()=>{
  const notes={
    objectives:['Explain cell growth, mitosis and cytokinesis.'],
    sections:[{heading:'Cell division',paragraphs:['Rapid division supports tissues, including the lining of the digestive system.']}],
  };
  const result=context('Cell growth and division',notes);
  assert.equal(result.requirement.required,true);
  assert.equal(result.requirement.templateId,null);
});

test('removes a digestive-system plate from cell growth and division',()=>{
  const digestiveRequirement=diagramRequirement({subjectId:'biology',subjectName:'Biology',topicTitle:'The human digestive system',notes:{}});
  const [digestive]=curatedIllustrationsForLesson({requirement:digestiveRequirement});
  const lesson=context('Cell growth and division',{objectives:['Describe mitosis.']});
  const decision=diagramRelevanceDecision({...lesson,illustration:digestive});
  assert.equal(identifiedDiagramTemplate(digestive),'anatomy:digestive-system');
  assert.equal(decision.keep,false);
});

test('keeps the digestive-system plate in its correct lesson',()=>{
  const lesson=context('The human digestive system');
  const [digestive]=curatedIllustrationsForLesson({requirement:lesson.requirement});
  assert.equal(diagramRelevanceDecision({...lesson,illustration:digestive}).keep,true);
});

test('filters several known misplaced templates while retaining an unclassified topic diagram',()=>{
  const digestiveLesson=context('The human digestive system');
  const [digestive]=curatedIllustrationsForLesson({requirement:digestiveLesson.requirement});
  const microscopeLesson=context('Microscopy and Cell Observation');
  const [microscope]=curatedIllustrationsForLesson({requirement:microscopeLesson.requirement});
  const lesson=context('Cell growth and division',{objectives:['Describe mitosis.']});
  const mitosis={title:'Stages of mitosis',description:'A topic-specific diagram.',elements:[]};
  const filtered=filterRelevantIllustrations({...lesson,illustrations:[digestive,microscope,mitosis]});
  assert.deepEqual(filtered.kept,[mitosis]);
  assert.equal(filtered.removed.length,2);
  assert.equal(filtered.unclassified.length,1);
});
