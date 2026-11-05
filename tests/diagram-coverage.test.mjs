import test from 'node:test';
import assert from 'node:assert/strict';
import {
  curatedDiagramPreviews,
  curatedIllustrationsForLesson,
  diagramCoverage,
  diagramCoverageTemplates,
  diagramRequirement,
} from '../backend/diagram-coverage.mjs';
import { validIllustrations } from '../backend/illustrations.mjs';

function requirement(topicTitle,subjectId='geography',notes={}) {
  return diagramRequirement({topicTitle,subjectId,subjectName:subjectId,notes});
}

test('detects and supplies the two reported missing diagram topics', () => {
  const latitude=requirement('Latitude and longitude');
  assert.equal(latitude.required,true);
  assert.equal(latitude.templateId,'latitude-longitude');
  assert.equal(curatedIllustrationsForLesson({requirement:latitude}).length,1);

  const foodChain=requirement('Food chains and trophic levels','biology');
  assert.equal(foodChain.required,true);
  assert.equal(foodChain.templateId,'food-chain');
  assert.equal(curatedIllustrationsForLesson({requirement:foodChain}).length,1);
});

test('detects diagrams from saved lesson content even when the title is generic', () => {
  const result=requirement('Lesson 4','physics',{
    objectives:['Draw and label a complete series circuit.'],
    sections:[{heading:'Circuit symbols',paragraphs:['Connect a cell, switch and lamp.']}],
  });
  assert.equal(result.required,true);
  assert.equal(result.templateId,'electric-circuit');
});

test('topic title outranks unrelated concepts mentioned in the lesson body', () => {
  const result=requirement('Cell Structure','biology',{
    objectives:['Identify and label the parts of a plant cell.'],
    sections:[{heading:'Photosynthesis',paragraphs:['Chloroplasts contain chlorophyll for photosynthesis.']}],
  });
  assert.equal(result.required,true);
  assert.equal(result.templateId,'cell-structure');
  assert.equal(result.variant,'plant');
  const [diagram]=curatedIllustrationsForLesson({requirement:result});
  assert.equal(diagram.title,'Structure of a plant cell');
  assert.ok(diagram.elements.some(element=>element.label==='Chloroplast'));
  assert.ok(diagram.elements.some(element=>element.label==='Large permanent vacuole'));
  assert.ok(!diagram.elements.some(element=>element.kind==='specimen'));
  assert.equal(validIllustrations([diagram]),true);
});

test('cell comparison objectives retain the plant-and-animal comparison plate', () => {
  const result=requirement('Cell Structure','biology',{objectives:['Compare plant and animal cells.']});
  assert.equal(result.variant,'comparison');
  const [diagram]=curatedIllustrationsForLesson({requirement:result});
  assert.equal(diagram.title,'Plant and animal cell structures');
  assert.equal(validIllustrations([diagram]),true);
});

test('microscopy topic outranks cell concepts in the lesson body', () => {
  const result=requirement('Microscopy and Cell Observation','biology',{
    objectives:['Use a compound microscope to observe plant and animal cells.'],
    sections:[{heading:'Cell structures',paragraphs:['Identify the nucleus, cytoplasm and chloroplasts in prepared specimens.']}],
  });
  assert.equal(result.required,true);
  assert.equal(result.templateId,'compound-light-microscope');
  const [diagram]=curatedIllustrationsForLesson({requirement:result});
  assert.equal(diagram.title,'Parts of a compound light microscope');
  assert.ok(diagram.elements.some(element=>element.label==='Objective lens'));
  assert.ok(diagram.elements.some(element=>element.label==='Stage'));
  assert.equal(validIllustrations([diagram]),true);
});

test('a microscope mentioned inside a later lesson does not reuse the microscopy template', () => {
  const result=requirement('Movement of substances across cell membranes','biology',{
    objectives:['Explain diffusion and osmosis.'],
    sections:[{heading:'Practical observation',paragraphs:['A microscope may be used to observe changes in prepared cells.']}],
  });
  assert.notEqual(result.templateId,'compound-light-microscope');
});

test('plant vocabulary mentioned inside later lessons does not reuse a plant template', () => {
  const photosynthesisMention=requirement('Movement of substances across cell membranes','biology',{
    objectives:['Explain diffusion and osmosis.'],
    sections:[{heading:'Application',paragraphs:['Water absorbed by a plant is later used during photosynthesis.']}],
  });
  assert.notEqual(photosynthesisMention.templateId,'photosynthesis');

  const plantCellMention=requirement('Levels of organisation','biology',{
    objectives:['Relate cells, tissues, organs and systems.'],
    sections:[{heading:'Examples',paragraphs:['Plant cells and animal cells combine to form tissues in their respective organisms.']}],
  });
  assert.notEqual(plantCellMention.templateId,'cell-structure');
});

test('actual photosynthesis and plant-cell topics still receive their correct plates', () => {
  assert.equal(requirement('Photosynthesis in green plants','biology').templateId,'photosynthesis');
  assert.equal(requirement('Nutrition in green plants','biology').templateId,'photosynthesis');
  const plantCell=requirement('Structure of a plant cell','biology');
  assert.equal(plantCell.templateId,'cell-structure');
  assert.equal(plantCell.variant,'plant');
});

test('does not force a decorative diagram into a non-visual lesson', () => {
  const result=requirement('Listening for main ideas','english',{
    objectives:['Identify the speaker’s main point.'],
    summary:['Listen carefully and distinguish a main idea from details.'],
  });
  assert.equal(result.required,false);
  assert.equal(result.templateId,null);
});

test('coverage distinguishes missing, covered and not-required lessons', () => {
  const required={required:true,templateId:null,reason:'diagram needed'};
  assert.equal(diagramCoverage({illustrations:[],illustrationVersion:5,requirement:required,currentVersion:6}).status,'missing');
  assert.equal(diagramCoverage({illustrations:[{title:'diagram'}],illustrationVersion:5,requirement:required,currentVersion:6}).status,'covered');
  assert.equal(diagramCoverage({illustrations:[],illustrationVersion:6,requirement:{required:false},currentVersion:6}).status,'not-required');
});

test('coverage rejects an unrelated saved diagram when a curated topic template is required', () => {
  const required={required:true,templateId:'cell-structure',variant:'plant',reason:'cell diagram needed'};
  const wrong=[{title:'Inputs and products of photosynthesis'}];
  const correct=curatedIllustrationsForLesson({requirement:required});
  assert.equal(diagramCoverage({illustrations:wrong,illustrationVersion:6,requirement:required,currentVersion:6}).status,'missing');
  assert.equal(diagramCoverage({illustrations:correct,illustrationVersion:6,requirement:required,currentVersion:6}).status,'covered');
});

test('curated catalogue is complete and every diagram stays inside the canvas', () => {
  assert.equal(diagramCoverageTemplates.length,20);
  const diagrams=curatedDiagramPreviews();
  assert.equal(diagrams.length,10);
  for(const diagram of diagrams) {
    assert.ok(diagram.title.length>0);
    assert.ok(diagram.description.length>0);
    assert.ok(diagram.elements.length>=2);
    for(const element of diagram.elements) {
      for(const key of ['kind','x','y','x2','y2','width','height','points','label','fill','stroke','strokeWidth','fontSize','mapId','specimenId','anatomyId','regionIds']) {
        assert.ok(Object.hasOwn(element,key),`${diagram.title}: missing ${key}`);
      }
      assert.ok(element.x>=0&&element.x<=960,`${diagram.title}: x out of bounds`);
      assert.ok(element.y>=0&&element.y<=600,`${diagram.title}: y out of bounds`);
    }
    assert.equal(validIllustrations([diagram]),true,`${diagram.title}: failed textbook diagram validation`);
  }
});

test('human-system topics use a bundled anatomy plate', () => {
  const result=requirement('The human digestive system','biology');
  const [diagram]=curatedIllustrationsForLesson({requirement:result});
  assert.equal(result.templateId,'anatomy:digestive-system');
  assert.ok(diagram.elements.some(element=>element.kind==='anatomy'&&element.anatomyId==='digestive-system'));
});
