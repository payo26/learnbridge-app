import mapData from '../shared/map-data.generated.json' with { type:'json' };
import { specimenCatalog, specimenPromptCatalog } from '../shared/specimen-catalog.mjs';
import { anatomyCatalog, anatomyPromptCatalog } from '../shared/anatomy-catalog.mjs';

export const ILLUSTRATION_VERSION = 6;
export const ILLUSTRATION_WIDTH = 960;
export const ILLUSTRATION_HEIGHT = 600;

export const illustrationColours = [
  'none','#ffffff','#f8fafc','#e0f2fe','#dbeafe','#dcfce7','#fef3c7','#fee2e2',
  '#f3e8ff','#fce7f3','#0f172a','#1d4ed8','#15803d','#b45309','#be123c','#7e22ce','#475569',
];

export const illustrationElementSchema = {
  type:'object', additionalProperties:false,
  required:['kind','x','y','x2','y2','width','height','points','label','fill','stroke','strokeWidth','fontSize','mapId','specimenId','anatomyId','regionIds'],
  properties:{
    kind:{type:'string',enum:['circle','ellipse','rect','line','arrow','polygon','polyline','text','callout','map','specimen','anatomy']},
    x:{type:'number',minimum:0,maximum:ILLUSTRATION_WIDTH},
    y:{type:'number',minimum:0,maximum:ILLUSTRATION_HEIGHT},
    x2:{type:'number',minimum:0,maximum:ILLUSTRATION_WIDTH},
    y2:{type:'number',minimum:0,maximum:ILLUSTRATION_HEIGHT},
    width:{type:'number',minimum:0,maximum:900},
    height:{type:'number',minimum:0,maximum:560},
    points:{type:'string',maxLength:500},
    label:{type:'string',maxLength:60},
    fill:{type:'string',enum:illustrationColours},
    stroke:{type:'string',enum:illustrationColours},
    strokeWidth:{type:'number',minimum:1,maximum:6},
    fontSize:{type:'number',minimum:11,maximum:20},
    mapId:{type:'string',enum:['','nigeria','africa','west-africa']},
    specimenId:{type:'string',enum:['',...Object.keys(specimenCatalog)]},
    anatomyId:{type:'string',enum:['',...Object.keys(anatomyCatalog)]},
    regionIds:{type:'string',maxLength:300},
  },
};

export const illustrationSchema = {
  type:'object', additionalProperties:false, required:['necessary','illustrations'], properties:{
    necessary:{type:'boolean'},
    illustrations:{type:'array',minItems:0,maxItems:3,items:{
      type:'object',additionalProperties:false,required:['title','description','elements'],properties:{
        title:{type:'string',minLength:1,maxLength:100},
        description:{type:'string',minLength:1,maxLength:350},
        elements:{type:'array',minItems:1,maxItems:70,items:illustrationElementSchema},
      },
    }},
  },
};

export const illustrationTask = `Decide whether this lesson benefits from a concrete explanatory diagram. If useful, create one to three accurate, publication-quality textbook diagrams on a 960 by 600 canvas. Every diagram must teach a concrete relationship, structure, location, measurement or mechanism. Do not return decorative artwork or a merely illustrative collection of shapes.

COMPOSITION RULES
- Reserve x=0..220 and x=740..960 for external label boxes. Keep the main subject between x=240 and x=720, with a clean margin on every side.
- Use the callout kind for every anatomical, structural, geographic, apparatus or component name. For a callout, x/y must be a precise point inside the feature being identified; never put x/y on empty space or on the label itself. Put x2 at 170 for a left label or 790 for a right label and set y2 close to the target y. The renderer places the box and draws one straight arrowed leader directly to x/y.
- Use at most six callouts on either side and twelve in total. Prefer the nearest side of the illustration. Within each side, keep target points ordered from top to bottom so straight leaders do not cross.
- Use text only for compact internal notation such as a single axis letter, chemical symbol, numerical value, vertex or unit. Every descriptive word or phrase must be a callout, even if it is short.
- Leave all labels off the illustrated parts themselves unless the text is an intentional internal marking. Never simulate a callout with a separate line plus text.
- Never draw a manual label leader, bent connector or elbow connector. The renderer owns all leader lines. Draw base shapes first, then internal notation, then callouts. Use consistent scale, balanced spacing, accurate proportions and a restrained colour palette with strong contrast.

SUBJECT RULES
- Mathematics: exact shapes, constructions, number lines, coordinate axes, graphs and measurements. Mark vertices, scales and dimensions using accepted conventions.
- Biology and basic science: recognisable specimens, cells, organs and systems in a clean textbook view, with leaders ending on the exact named structures. Never substitute a flowchart for anatomy.
- Chemistry: correctly proportioned laboratory apparatus, atomic models, molecular structures and particle arrangements. Use accepted chemical symbols, realistic apparatus layout and sensible particle counts.
- Physics: conventional circuit symbols, ray paths, vectors, waves and apparatus. Connections must join the correct terminals; rays and vectors must have meaningful directions.
- Geography and agricultural science: real boundary maps, accurately layered profiles, recognisable landforms, soil sections, specimens, tools and systems with concrete features labelled.
- English and languages: illustrate only when a visual genuinely improves understanding. Prefer one spacious annotated sentence, speech feature or concrete language example. Put every multiword grammatical label in an external callout. Do not build decorative flowcharts, crowded word clouds or overlapping text boxes.
- Other subjects: use a concrete subject-specific technical diagram. Do not use a generic flowchart, mindmap or decorative boxes unless the lesson itself explicitly teaches a process or hierarchy.

REAL HUMAN ANATOMY RULES
- For a lesson about a human organ system, use the anatomy kind and one of the bundled medical plates below. Never construct a digestive, respiratory, circulatory, skeletal, nervous, urinary, endocrine, lymphatic, muscular or reproductive system from generic circles, polygons or decorative shapes.
- Available anatomyId values and exact anatomical regions are: ${JSON.stringify(anatomyPromptCatalog)}
- An anatomy plate uses x/y as its top-left and width/height as its display area. Use x=220, y=20, width=520 and height=560 for portrait plates so fine anatomical detail and embedded labels remain readable. For female-reproductive-system use x=220, y=115, width=520 and height=370.
- Put empty mapId, empty specimenId and empty regionIds on the anatomy element itself. To label an unlabelled plate, create a callout with the same anatomyId and exactly one valid region ID in regionIds. Use x=0 and y=0; the renderer resolves the exact anatomical target and draws one straight leader to it.
- Plates marked prelabelled already contain publication-quality labels and leader lines. For those plates, return the anatomy element without additional callouts unless a lesson needs to emphasise no more than two specific structures.
- Never place text over an organ. Never approximate anatomy, trace a body system with generic primitives, or substitute a process flowchart for a medical plate.

BIOLOGICAL SPECIMEN RULES
- For a lesson about the external parts of a whole plant, goat or other mammal, bird, or fish, use the specimen kind instead of constructing the organism from generic primitives. These are detailed, recognisable textbook illustrations—not decorative boxes or approximate silhouettes.
- Available specimenId values and exact label regions are: ${JSON.stringify(specimenPromptCatalog)}
- A specimen uses x/y as its top-left and width/height as its display area. Use x=240, y=35, width=480 and height=530 for flowering-plant. Use x=230, y=105, width=500 and height=390 for goat-external, bird-external or fish-external.
- Put an empty mapId, empty anatomyId and empty regionIds on the specimen element itself. To label a specimen structure, create a callout with the same specimenId and exactly one valid region ID in regionIds. Use x=0 and y=0 for such callouts; the renderer resolves the exact anatomical target and draws the straight leader.
- For plant or animal cells, internal organs, tissues and systems not present in the specimen catalog, continue to draw an accurate biological cross-section with the allowed primitives and precise callouts.
- Never replace a requested plant or animal structure with a generic flowchart, hierarchy, rounded boxes or an unrelated geometric analogy.

REAL MAP RULES
- When a lesson needs a political or regional map, use the map kind. Never approximate Nigeria, Africa or West Africa with a polygon, ellipse or decorative shape.
- Available mapId values are nigeria, africa and west-africa. These render bundled real geographic boundary paths, not AI-drawn outlines.
- A map uses x/y as its top-left and width/height as its display area. Use x=240, y=45, width=480 and height=510 unless the lesson needs a smaller map. Put its mapId in mapId and a comma-separated list of exact region IDs to highlight in regionIds.
- To label a map region, create a callout with the same mapId and exactly one region ID in regionIds. The renderer calculates the geographic target automatically, so use 0 for callout x/y. Continue using x2=170 or x2=790 for the label side.
- For non-map elements use an empty mapId. For elements that are not anatomy, specimen or map callouts, use an empty regionIds. Never invent an ID or region ID; use only entries from the supplied catalogs.

DATA RULES
- For every element populate every field, including anatomyId. Use 0 or an empty string for fields irrelevant to that kind.
- A circle uses x/y as centre and width as diameter. An ellipse uses x/y as centre and width/height as diameters. A rectangle uses x/y as its top-left and x2 as corner radius.
- Polygon and polyline points contain numbers, commas and spaces only.
- Include at least two meaningful labels in every illustration. Keep label wording concise, correctly spelled and appropriate for the class level.
- If no accurate explanatory illustration is genuinely useful, set necessary to false and return an empty illustrations array.`;

export const mapCatalog = Object.fromEntries(Object.entries(mapData.maps).map(([id,map])=>[
  id,
  { label:map.label, regions:map.locations.map(location=>({ id:location.id,name:location.name })) },
]));

function finite(value, minimum, maximum) {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function points(value, minimumPairs) {
  if (typeof value !== 'string' || value.length > 500 || !/^[-0-9.,\s]*$/.test(value)) return null;
  const numbers = value.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (numbers.length < minimumPairs * 2 || numbers.length % 2) return null;
  if (!numbers.every((number,index) => finite(number, 10, index % 2 ? 590 : 950))) return null;
  return numbers;
}

function wrapTextLabel(value, maximumCharacters) {
  const words=value.trim().split(/\s+/).filter(Boolean);
  const lines=[];
  for (const word of words) {
    if (word.length > maximumCharacters) {
      for (let index=0;index<word.length;index+=maximumCharacters) lines.push(word.slice(index,index+maximumCharacters));
      continue;
    }
    const current=lines[lines.length-1] || '';
    if (!current) lines[lines.length ? lines.length-1 : 0]=word;
    else if (`${current} ${word}`.length <= maximumCharacters) lines[lines.length-1]=`${current} ${word}`;
    else lines.push(word);
  }
  return (lines.length ? lines : ['']).slice(0,3);
}

function textBox(element) {
  const maximumCharacters=element.width>0
    ? Math.max(6,Math.min(30,Math.floor(element.width/(element.fontSize*.58))))
    : 24;
  const lines=wrapTextLabel(element.label,maximumCharacters);
  const longest=Math.max(...lines.map(line=>line.length),1);
  const phrase=lines.length>1 || element.label.trim().length>12 || /\s/.test(element.label.trim());
  const width=phrase
    ? Math.min(210,Math.max(68,longest*element.fontSize*.61+28))
    : Math.max(20,longest*element.fontSize*.58+8);
  const height=phrase
    ? Math.max(36,lines.length*element.fontSize*1.2+16)
    : element.fontSize*1.35;
  return { left:element.x-width/2, right:element.x+width/2, top:element.y-height/2, bottom:element.y+height/2 };
}

function overlaps(first, second) {
  const gap = 5;
  return first.left < second.right + gap && first.right + gap > second.left
    && first.top < second.bottom + gap && first.bottom + gap > second.top;
}

function internalSymbolLabel(value) {
  const label=String(value || '').trim();
  if (!label || label.length > 12 || /\s/.test(label)) return false;
  if (/^[epn][⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+$/i.test(label)) return true;
  if (/^[A-Za-z]$/.test(label)) return true;
  if (/^(?:[A-Z][a-z]?\d{0,3}[+-]?|pH)$/.test(label)) return true;
  if (/^\d+(?:\.\d+)?(?:°[CFK]?|%|[A-Za-z]{0,2})?$/.test(label)) return true;
  return /^[+\-−=<>×÷/%°]+$/.test(label);
}

function validElement(element) {
  const kinds = new Set(['circle','ellipse','rect','line','arrow','polygon','polyline','text','callout','map','specimen','anatomy']);
  const colours = new Set(illustrationColours);
  if (!element || !kinds.has(element.kind)) return false;
  if (!finite(element.x,0,ILLUSTRATION_WIDTH) || !finite(element.y,0,ILLUSTRATION_HEIGHT)
    || !finite(element.x2,0,ILLUSTRATION_WIDTH) || !finite(element.y2,0,ILLUSTRATION_HEIGHT)
    || !finite(element.width,0,900) || !finite(element.height,0,560)
    || typeof element.points !== 'string' || element.points.length > 500 || !/^[-0-9.,\s]*$/.test(element.points)
    || typeof element.label !== 'string' || element.label.length > 60
    || !colours.has(element.fill) || !colours.has(element.stroke)
    || !finite(element.strokeWidth,1,6) || !finite(element.fontSize,11,20)
    || typeof element.mapId !== 'string' || typeof element.specimenId !== 'string' || typeof element.anatomyId !== 'string' || typeof element.regionIds !== 'string'
    || !/^[a-z0-9,-]*$/.test(element.regionIds) || element.regionIds.length > 300) return false;

  const map=mapData.maps[element.mapId];
  const specimen=specimenCatalog[element.specimenId];
  const anatomy=anatomyCatalog[element.anatomyId];
  const regionIds=element.regionIds ? element.regionIds.split(',').filter(Boolean) : [];
  const validRegions=Boolean(map)&&regionIds.every(id=>map.locations.some(location=>location.id===id));
  const validSpecimenRegions=Boolean(specimen)&&regionIds.every(id=>specimen.regions.some(region=>region.id===id));
  const validAnatomyRegions=Boolean(anatomy)&&regionIds.every(id=>anatomy.regions.some(region=>region.id===id));
  if (element.kind === 'map') return !element.specimenId && !element.anatomyId && Boolean(map) && validRegions && element.x >= 220 && element.y >= 20
    && element.width >= 260 && element.height >= 220 && element.x+element.width <= 740 && element.y+element.height <= 580;
  if (element.kind === 'specimen') return !element.mapId && !element.anatomyId && !element.regionIds && Boolean(specimen) && element.x >= 220 && element.y >= 20
    && element.width >= 260 && element.height >= 220 && element.x+element.width <= 740 && element.y+element.height <= 580;
  if (element.kind === 'anatomy') return !element.mapId && !element.specimenId && !element.regionIds && Boolean(anatomy) && element.x >= 220 && element.y >= 20
    && element.width >= 260 && element.height >= 220 && element.x+element.width <= 740 && element.y+element.height <= 580;

  if (element.kind !== 'callout' && (element.mapId || element.specimenId || element.anatomyId || element.regionIds)) return false;

  if (element.kind === 'circle') {
    const radius = element.width / 2;
    return radius >= 3 && element.x-radius >= 10 && element.x+radius <= 950 && element.y-radius >= 10 && element.y+radius <= 590;
  }
  if (element.kind === 'ellipse') {
    return element.width >= 6 && element.height >= 6 && element.x-element.width/2 >= 10 && element.x+element.width/2 <= 950
      && element.y-element.height/2 >= 10 && element.y+element.height/2 <= 590;
  }
  if (element.kind === 'rect') return element.width >= 4 && element.height >= 4 && element.x >= 10 && element.y >= 10
    && element.x+element.width <= 950 && element.y+element.height <= 590;
  if (element.kind === 'line' || element.kind === 'arrow') return element.x >= 10 && element.x <= 950 && element.y >= 10 && element.y <= 590
    && element.x2 >= 10 && element.x2 <= 950 && element.y2 >= 10 && element.y2 <= 590
    && Math.hypot(element.x2-element.x,element.y2-element.y) >= 4;
  if (element.kind === 'polygon') return Boolean(points(element.points,3));
  if (element.kind === 'polyline') return Boolean(points(element.points,2));
  if (element.kind === 'text') return internalSymbolLabel(element.label)
    && element.x >= 25 && element.x <= 935 && element.y >= 25 && element.y <= 575;
  if (element.kind === 'callout') return element.label.trim().length >= 2 && element.label.trim().length <= 55
    && ((!element.mapId && !element.specimenId && !element.anatomyId && !element.regionIds && element.x >= 220 && element.x <= 740 && element.y >= 35 && element.y <= 565)
      || (Boolean(element.mapId) && !element.specimenId && !element.anatomyId && regionIds.length === 1 && validRegions)
      || (!element.mapId && Boolean(element.specimenId) && !element.anatomyId && regionIds.length === 1 && validSpecimenRegions)
      || (!element.mapId && !element.specimenId && Boolean(element.anatomyId) && regionIds.length === 1 && validAnatomyRegions))
    && ((element.x2 >= 20 && element.x2 <= 210) || (element.x2 >= 750 && element.x2 <= 940))
    && element.y2 >= 25 && element.y2 <= 575;
  return false;
}

function validIllustration(illustration) {
  if (!illustration || typeof illustration.title !== 'string' || !illustration.title.trim() || illustration.title.length > 100
    || typeof illustration.description !== 'string' || !illustration.description.trim() || illustration.description.length > 350
    || !Array.isArray(illustration.elements) || illustration.elements.length < 1 || illustration.elements.length > 70
    || !illustration.elements.every(validElement)) return false;

  const callouts = illustration.elements.filter(element => element.kind === 'callout');
  const text = illustration.elements.filter(element => element.kind === 'text');
  const drawingElements = illustration.elements.filter(element => !['text','callout'].includes(element.kind));
  const maps=illustration.elements.filter(element=>element.kind==='map');
  const specimens=illustration.elements.filter(element=>element.kind==='specimen');
  const anatomies=illustration.elements.filter(element=>element.kind==='anatomy');
  const templateCount=maps.length+specimens.length+anatomies.length;
  const anatomyPlate=anatomies[0] ? anatomyCatalog[anatomies[0].anatomyId] : null;
  if (maps.length > 1 || specimens.length > 1 || anatomies.length > 1 || templateCount > 1
    || (templateCount ? drawingElements.length < 1 : drawingElements.length < 3)
    || callouts.some(element=>element.mapId && !maps.some(map=>map.mapId===element.mapId))
    || callouts.some(element=>element.specimenId && !specimens.some(specimen=>specimen.specimenId===element.specimenId))
    || callouts.some(element=>element.anatomyId && !anatomies.some(anatomy=>anatomy.anatomyId===element.anatomyId))
    || callouts.length > 12 || callouts.filter(element => element.x2 < 480).length > 6
    || callouts.filter(element => element.x2 >= 480).length > 6
    || (!anatomyPlate?.prelabelled && callouts.length + text.length < 2)) return false;

  const labels = [...callouts,...text].map(element => element.label.trim().toLocaleLowerCase());
  if (new Set(labels).size !== labels.length) return false;
  for (let index=0;index<text.length;index++) {
    const box = textBox(text[index]);
    if (box.left < 10 || box.right > 950 || box.top < 10 || box.bottom > 590) return false;
    for (let other=index+1;other<text.length;other++) if (overlaps(box,textBox(text[other]))) return false;
  }
  return true;
}

export function validIllustrations(value) {
  return Array.isArray(value) && value.length > 0 && value.length <= 3 && value.every(validIllustration);
}
