import { curatedIllustrationsForLesson, diagramRequirement } from './diagram-coverage.mjs';

const recognisedPlantTitles=new Set([
  'Inputs and products of photosynthesis',
  'Structure of a plant cell',
  'Plant and animal cell structures',
]);

const wholePlantTopic=/\b(?:photosynthesis|nutrition in (?:green )?plants?|plant nutrition|flowering plants?|external (?:parts|features|structure) of (?:a )?(?:flowering )?plants?|parts of (?:a )?(?:flowering )?plants?|plant morphology|root and shoot systems?|transport in plants?|transpiration)\b/i;

export function containsFloweringPlantSpecimen(illustration) {
  return Array.isArray(illustration?.elements)
    && illustration.elements.some(element=>element?.kind==='specimen'&&element?.specimenId==='flowering-plant');
}

export function isRecognisedPlantIllustration(illustration) {
  return recognisedPlantTitles.has(String(illustration?.title||'').trim())
    || containsFloweringPlantSpecimen(illustration);
}

export function plantIllustrationDecision({subjectId='biology',subjectName='Biology',topicTitle='',notes={},illustration}={}) {
  if(!isRecognisedPlantIllustration(illustration))return {plantDiagram:false,keep:true,reason:'not a recognised recurring plant plate'};

  const requirement=diagramRequirement({subjectId,subjectName,topicTitle,notes});
  const expectedTitles=new Set(curatedIllustrationsForLesson({requirement}).map(item=>item.title));
  if(expectedTitles.has(illustration.title))return {plantDiagram:true,keep:true,reason:`expected ${requirement.templateId} template`};

  if(containsFloweringPlantSpecimen(illustration)&&wholePlantTopic.test(String(topicTitle||''))) {
    return {plantDiagram:true,keep:true,reason:'whole-plant specimen is relevant to this topic'};
  }

  return {plantDiagram:true,keep:false,reason:'plant plate is unrelated to the lesson topic'};
}
