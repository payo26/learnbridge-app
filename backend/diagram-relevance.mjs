import { curatedIllustrationsForLesson } from './diagram-coverage.mjs';
import { plantIllustrationDecision } from './plant-contamination.mjs';

const titleTemplateIds=new Map([
  ['Latitude and longitude on the globe','latitude-longitude'],
  ['A terrestrial food chain','food-chain'],
  ['The water cycle','water-cycle'],
  ['Parts of a compound light microscope','compound-light-microscope'],
  ['Inputs and products of photosynthesis','photosynthesis'],
  ['Structure of a plant cell','cell-structure'],
  ['Structure of an animal cell','cell-structure'],
  ['Plant and animal cell structures','cell-structure'],
  ['Bohr model of atomic structure','atomic-structure'],
  ['A complete series circuit','electric-circuit'],
  ['A typical soil profile','soil-profile'],
  ['The rock cycle','rock-cycle'],
]);

function illustrationElements(illustration) {
  return Array.isArray(illustration?.elements)?illustration.elements:[];
}

export function identifiedDiagramTemplate(illustration) {
  const elements=illustrationElements(illustration);
  const anatomyId=elements.find(element=>typeof element?.anatomyId==='string'&&element.anatomyId)?.anatomyId;
  if(anatomyId)return `anatomy:${anatomyId}`;
  if(elements.some(element=>element?.kind==='specimen'&&element?.specimenId==='flowering-plant'))return 'specimen:flowering-plant';
  return titleTemplateIds.get(String(illustration?.title||'').trim())||null;
}

export function diagramRelevanceDecision({subjectId='',subjectName='',topicTitle='',notes={},requirement,illustration}={}) {
  const identifiedTemplate=identifiedDiagramTemplate(illustration);
  if(!identifiedTemplate)return {known:false,keep:true,identifiedTemplate:null,reason:'unclassified diagram retained for manual review'};

  if(identifiedTemplate==='specimen:flowering-plant'||titleTemplateIds.get(String(illustration?.title||'').trim())==='photosynthesis'
    ||['Structure of a plant cell','Structure of an animal cell','Plant and animal cell structures'].includes(String(illustration?.title||'').trim())) {
    const plantDecision=plantIllustrationDecision({subjectId,subjectName,topicTitle,notes,illustration});
    if(plantDecision.plantDiagram)return {
      known:true,
      keep:plantDecision.keep,
      identifiedTemplate,
      reason:plantDecision.reason,
    };
  }

  const expectedTitles=new Set(curatedIllustrationsForLesson({requirement}).map(item=>String(item?.title||'').trim()));
  if(expectedTitles.has(String(illustration?.title||'').trim()))return {
    known:true,keep:true,identifiedTemplate,reason:`matches required ${requirement?.templateId||'topic'} diagram`,
  };
  if(identifiedTemplate.startsWith('anatomy:')&&requirement?.templateId===identifiedTemplate)return {
    known:true,keep:true,identifiedTemplate,reason:`matches required ${identifiedTemplate} plate`,
  };
  return {
    known:true,
    keep:false,
    identifiedTemplate,
    reason:`${identifiedTemplate} is unrelated to the lesson topic${requirement?.templateId?`; expected ${requirement.templateId}`:''}`,
  };
}

export function filterRelevantIllustrations(context={}) {
  const illustrations=Array.isArray(context.illustrations)?context.illustrations:[];
  const kept=[];
  const removed=[];
  const unclassified=[];
  for(const illustration of illustrations) {
    const decision=diagramRelevanceDecision({...context,illustration});
    if(decision.keep)kept.push(illustration);
    else removed.push({illustration,...decision});
    if(!decision.known)unclassified.push({illustration,...decision});
  }
  return {kept,removed,unclassified};
}
