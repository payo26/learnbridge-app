import test from 'node:test';
import assert from 'node:assert/strict';
import { curatedIllustrationsForLesson, diagramRequirement } from '../backend/diagram-coverage.mjs';
import { plantIllustrationDecision } from '../backend/plant-contamination.mjs';

function illustrationFor(topicTitle,notes={}) {
  const requirement=diagramRequirement({subjectId:'biology',subjectName:'Biology',topicTitle,notes});
  return curatedIllustrationsForLesson({requirement})[0];
}

test('keeps the plant-cell plate in its actual cell-structure lesson',()=>{
  const illustration=illustrationFor('Structure of a plant cell');
  const decision=plantIllustrationDecision({subjectId:'biology',subjectName:'Biology',topicTitle:'Structure of a plant cell',notes:{},illustration});
  assert.equal(decision.plantDiagram,true);
  assert.equal(decision.keep,true);
});

test('marks a copied plant-cell plate as contamination in a later lesson',()=>{
  const illustration=illustrationFor('Structure of a plant cell');
  const notes={objectives:['Explain diffusion and osmosis.'],sections:[{heading:'Diffusion',paragraphs:['Particles move down a concentration gradient.']} ]};
  const decision=plantIllustrationDecision({subjectId:'biology',subjectName:'Biology',topicTitle:'Movement across cell membranes',notes,illustration});
  assert.equal(decision.plantDiagram,true);
  assert.equal(decision.keep,false);
});

test('keeps a flowering-plant specimen only when the topic makes it relevant',()=>{
  const photosynthesis=illustrationFor('Photosynthesis in green plants');
  assert.equal(plantIllustrationDecision({subjectId:'biology',topicTitle:'Photosynthesis in green plants',notes:{},illustration:photosynthesis}).keep,true);
  assert.equal(plantIllustrationDecision({subjectId:'biology',topicTitle:'Respiration in animals',notes:{},illustration:photosynthesis}).keep,false);
});
