const BASE_ELEMENT=Object.freeze({
  x:0,y:0,x2:0,y2:0,width:0,height:0,points:'',label:'',fill:'none',stroke:'#475569',strokeWidth:2,fontSize:14,
  mapId:'',specimenId:'',anatomyId:'',regionIds:'',
});

function element(kind,overrides={}) { return { ...BASE_ELEMENT,kind,...overrides }; }
function circle(x,y,diameter,fill,stroke='#475569',strokeWidth=2) { return element('circle',{x,y,width:diameter,fill,stroke,strokeWidth}); }
function ellipse(x,y,width,height,fill='none',stroke='#475569',strokeWidth=2) { return element('ellipse',{x,y,width,height,fill,stroke,strokeWidth}); }
function rect(x,y,width,height,fill,stroke='#475569',radius=10) { return element('rect',{x,y,x2:radius,width,height,fill,stroke}); }
function line(x,y,x2,y2,stroke='#475569',strokeWidth=2) { return element('line',{x,y,x2,y2,stroke,strokeWidth}); }
function arrow(x,y,x2,y2,stroke='#475569',strokeWidth=2) { return element('arrow',{x,y,x2,y2,stroke,strokeWidth}); }
function polygon(points,fill,stroke='#475569',strokeWidth=2) { return element('polygon',{points,fill,stroke,strokeWidth}); }
function polyline(points,stroke='#475569',strokeWidth=2) { return element('polyline',{points,stroke,strokeWidth}); }
function text(label,x,y,width=120,fontSize=14,fill='#0f172a') { return element('text',{label,x,y,width,fontSize,fill,stroke:'#475569'}); }
function callout(label,x,y,side='left',extra={}) { return element('callout',{label,x,y,x2:side==='left'?170:790,y2:y,fill:'#ffffff',...extra}); }
function specimen(specimenId,x,y,width,height) { return element('specimen',{specimenId,x,y,width,height}); }
function anatomy(anatomyId,x=220,y=20,width=520,height=560) { return element('anatomy',{anatomyId,x,y,width,height}); }
function anatomyCallout(anatomyId,regionIds,label,side) { return callout(label,0,0,side,{anatomyId,regionIds}); }

function latitudeLongitude() {
  return [{
    title:'Latitude and longitude on the globe',
    description:'Parallels measure position north or south of the Equator, while meridians measure position east or west of the Prime Meridian.',
    elements:[
      circle(480,300,360,'#e0f2fe','#1d4ed8',3),
      ellipse(480,300,360,72,'none','#1d4ed8',3),
      ellipse(480,230,325,58,'none','#1d4ed8',1.6),
      ellipse(480,370,325,58,'none','#1d4ed8',1.6),
      ellipse(480,300,88,360,'none','#be123c',3),
      ellipse(480,300,220,360,'none','#7e22ce',1.6),
      line(480,105,480,495,'#475569',1.5),
      text('0°',668,306,40,14,'#1d4ed8'),
      callout('North Pole',480,120,'left'),
      callout('South Pole',480,480,'right'),
      callout('Equator (0° latitude)',650,300,'right'),
      callout('Prime Meridian (0° longitude)',480,200,'left'),
      callout('Parallels of latitude',620,230,'right'),
      callout('Meridians of longitude',420,300,'left'),
    ],
  }];
}

function foodChain() {
  const elements=[
    circle(270,130,62,'#fef3c7','#b45309',2.5),
    line(270,85,270,63,'#b45309'),line(270,175,270,197,'#b45309'),line(225,130,203,130,'#b45309'),line(315,130,337,130,'#b45309'),
    line(238,98,222,82,'#b45309'),line(302,98,318,82,'#b45309'),line(238,162,222,178,'#b45309'),line(302,162,318,178,'#b45309'),
    polygon('322,263 337,195 349,263','#15803d','#15803d'),polygon('338,263 357,170 369,263','#15803d','#15803d'),polygon('357,263 382,198 390,263','#dcfce7','#15803d'),
    ellipse(440,310,57,23,'#dcfce7','#15803d',2),ellipse(415,307,29,20,'#dcfce7','#15803d',2),ellipse(467,303,31,16,'#fef3c7','#15803d',1.5),
    line(422,318,401,346,'#15803d',2.5),line(435,320,423,351,'#15803d',2.5),line(451,319,466,348,'#15803d',2.5),line(463,312,486,334,'#15803d',2.5),line(406,301,392,287,'#15803d',1.5),line(413,300,403,280,'#15803d',1.5),
    ellipse(530,400,70,45,'#dcfce7','#15803d',2.5),circle(506,382,35,'#dcfce7','#15803d',2),circle(500,377,7,'#0f172a','#0f172a',1),
    polyline('501,415 483,430 470,425','#15803d',4),polyline('546,415 566,435 581,430','#15803d',4),polyline('517,416 505,439 490,443','#15803d',4),
    polyline('595,310 610,291 628,313 647,290 666,310','#15803d',6),circle(674,310,19,'#dcfce7','#15803d',2),circle(680,306,7,'#0f172a','#0f172a',1),polygon('684,310 698,314 684,318','#fef3c7','#b45309',1.5),
    ellipse(702,210,54,28,'#f8fafc','#475569',2),circle(726,200,24,'#f8fafc','#475569',2),polygon('735,199 750,204 735,208','#fef3c7','#b45309',1.5),circle(731,196,7,'#0f172a','#0f172a',1),
    polygon('701,208 662,167 694,179 709,147 719,199','#dbeafe','#475569',2),polygon('708,212 740,167 732,198 761,186 725,223','#dbeafe','#475569',2),polygon('686,218 666,236 695,227','#e0f2fe','#475569',1.5),
    arrow(294,158,333,194,'#475569',2.5),arrow(382,260,413,292,'#475569',2.5),arrow(469,329,505,373,'#475569',2.5),arrow(558,382,603,329,'#475569',2.5),arrow(671,289,692,230,'#475569',2.5),
    callout('Sunlight',270,130,'left'),callout('Grass — producer',356,220,'left'),callout('Grasshopper — primary consumer',440,310,'left'),
    callout('Hawk — apex consumer',702,210,'right'),callout('Snake — tertiary consumer',635,310,'right'),callout('Frog — secondary consumer',530,400,'right'),
    arrow(340,520,620,520,'#1d4ed8',3),callout('Direction of energy transfer',480,520,'right'),
  ];
  return [{
    title:'A terrestrial food chain',
    description:'Arrows point from the food or energy source to the organism receiving that energy. Each transfer leaves less energy available to the next trophic level.',
    elements,
  }];
}

function waterCycle() {
  return [{
    title:'The water cycle',
    description:'Water circulates continuously through evaporation, condensation, precipitation, surface run-off and collection.',
    elements:[
      circle(700,125,90,'#fef3c7','#b45309',2.5),
      circle(400,130,80,'#f8fafc','#475569'),circle(455,110,95,'#f8fafc','#475569'),circle(510,135,80,'#f8fafc','#475569'),rect(365,135,190,50,'#f8fafc','#475569',22),
      polygon('180,430 360,180 520,430','#dbeafe','#475569',2),polygon('290,278 360,180 420,278','#ffffff','#475569',1.5),
      rect(120,430,720,100,'#e0f2fe','#1d4ed8',0),
      arrow(700,440,700,225,'#1d4ed8',3),arrow(650,250,535,165,'#1d4ed8',3),arrow(455,180,455,350,'#1d4ed8',3),arrow(470,410,610,470,'#1d4ed8',3),
      callout('Evaporation',700,330,'right'),callout('Condensation',600,190,'right'),callout('Precipitation',455,275,'left'),
      callout('Surface run-off',550,420,'right'),callout('Collection',700,500,'right'),
    ],
  }];
}

function photosynthesis() {
  return [{
    title:'Inputs and products of photosynthesis',
    description:'Green leaves use light energy to combine carbon dioxide and water, producing glucose and releasing oxygen.',
    elements:[
      specimen('flowering-plant',330,45,300,500),circle(725,110,75,'#fef3c7','#b45309',2.5),
      arrow(690,135,590,205,'#b45309',3),arrow(230,240,355,240,'#1d4ed8',3),arrow(250,470,380,450,'#1d4ed8',3),arrow(600,230,735,230,'#15803d',3),arrow(590,320,735,350,'#7e22ce',3),
      callout('Light energy',640,170,'right'),callout('Carbon dioxide',300,240,'left'),callout('Water',320,455,'left'),
      callout('Oxygen released',680,230,'right'),callout('Glucose formed',670,335,'right'),
    ],
  }];
}

function cellComparison() {
  return [{
    title:'Plant and animal cell structures',
    description:'Both cells have a membrane, cytoplasm and nucleus; the plant cell also has a cell wall, chloroplasts and a large permanent vacuole.',
    elements:[
      rect(255,125,260,330,'#dcfce7','#15803d',28),rect(270,140,230,300,'#f8fafc','#15803d',24),ellipse(385,290,150,210,'#e0f2fe','#1d4ed8',2),
      circle(330,235,75,'#f3e8ff','#7e22ce',2),ellipse(455,210,48,26,'#dcfce7','#15803d',2),ellipse(455,370,48,26,'#dcfce7','#15803d',2),
      ellipse(650,290,220,300,'#fce7f3','#be123c',3),circle(620,255,72,'#f3e8ff','#7e22ce',2),ellipse(700,350,50,26,'#fef3c7','#b45309',2),
      callout('Plant cell',385,140,'left'),callout('Animal cell',650,150,'right'),
      callout('Cell wall',270,170,'left'),callout('Large vacuole',385,320,'left'),callout('Chloroplast',455,210,'left'),
      callout('Cell membrane',740,290,'right'),callout('Nucleus',620,255,'right'),callout('Cytoplasm',700,390,'right'),
    ],
  }];
}

function plantCell() {
  return [{
    title:'Structure of a plant cell',
    description:'A labelled plant cell showing the cellulose cell wall, cell membrane, cytoplasm, nucleus, chloroplasts and large permanent vacuole.',
    elements:[
      rect(300,90,360,420,'#dcfce7','#15803d',26),
      rect(315,105,330,390,'#f8fafc','#15803d',22),
      ellipse(485,315,210,250,'#e0f2fe','#1d4ed8',2.5),
      circle(395,245,82,'#f3e8ff','#7e22ce',2.5),
      ellipse(555,185,58,30,'#dcfce7','#15803d',2),
      ellipse(575,405,58,30,'#dcfce7','#15803d',2),
      ellipse(405,420,60,32,'#fef3c7','#b45309',2),
      callout('Cell wall',300,145,'left'),
      callout('Cell membrane',315,205,'left'),
      callout('Nucleus',395,245,'left'),
      callout('Chloroplast',555,185,'right'),
      callout('Large permanent vacuole',485,315,'right'),
      callout('Cytoplasm',620,355,'right'),
      callout('Mitochondrion',405,420,'right'),
    ],
  }];
}

function animalCell() {
  return [{
    title:'Structure of an animal cell',
    description:'A labelled animal cell showing the cell membrane, cytoplasm, nucleus, mitochondria, ribosomes and small vacuoles.',
    elements:[
      ellipse(485,300,390,350,'#fce7f3','#be123c',3),
      circle(420,260,92,'#f3e8ff','#7e22ce',2.5),
      ellipse(555,210,68,34,'#fef3c7','#b45309',2),
      ellipse(575,385,68,34,'#fef3c7','#b45309',2),
      circle(390,390,42,'#dbeafe','#1d4ed8',2),
      circle(525,315,12,'#475569','#475569',1),
      circle(555,330,12,'#475569','#475569',1),
      callout('Cell membrane',300,300,'left'),
      callout('Nucleus',420,260,'left'),
      callout('Small vacuole',390,390,'left'),
      callout('Mitochondrion',555,210,'right'),
      callout('Ribosomes',540,322,'right'),
      callout('Cytoplasm',610,365,'right'),
    ],
  }];
}

function compoundLightMicroscope() {
  return [{
    title:'Parts of a compound light microscope',
    description:'A side-view compound light microscope with its optical, focusing and supporting components labelled directly.',
    elements:[
      ellipse(415,65,90,30,'#f8fafc','#0f172a',2.5),
      polygon('400,75 450,75 500,205 452,220','#dbeafe','#475569',2.5),
      ellipse(475,225,108,30,'#f3e8ff','#7e22ce',2.5),
      rect(442,238,20,62,'#f8fafc','#475569',4),
      rect(470,238,20,78,'#f8fafc','#475569',4),
      rect(498,238,20,52,'#f8fafc','#475569',4),
      rect(330,325,310,28,'#dbeafe','#0f172a',4),
      rect(405,315,120,10,'#f8fafc','#475569',1),
      line(375,318,405,318,'#475569',3),
      line(525,318,555,318,'#475569',3),
      ellipse(475,378,105,34,'#f8fafc','#475569',2.5),
      circle(475,438,72,'#fef3c7','#b45309',2.5),
      polyline('515,100 585,125 635,190 655,275 640,365 595,455','#475569',6),
      line(595,455,555,535,'#475569',6),
      circle(603,205,62,'#dbeafe','#1d4ed8',2.5),
      circle(625,250,38,'#f8fafc','#1d4ed8',2.5),
      polygon('330,510 610,510 690,560 280,560','#dbeafe','#0f172a',3),
      callout('Eyepiece lens',415,65,'left'),
      callout('Body tube',455,145,'left'),
      callout('Revolving nosepiece',475,225,'left'),
      callout('Objective lens',480,282,'left'),
      callout('Stage clips and slide',420,318,'left'),
      callout('Built-in light source',475,438,'left'),
      callout('Coarse-focus knob',603,205,'right'),
      callout('Fine-focus knob',625,250,'right'),
      callout('Arm',646,300,'right'),
      callout('Stage',600,339,'right'),
      callout('Condenser',475,378,'right'),
      callout('Base',570,535,'right'),
    ],
  }];
}

function atomicStructure() {
  return [{
    title:'Bohr model of atomic structure',
    description:'Protons and neutrons occupy the nucleus, while electrons occupy energy levels surrounding it.',
    elements:[
      circle(480,300,95,'#fee2e2','#be123c',2.5),circle(462,290,28,'#fef3c7','#b45309'),circle(495,310,28,'#dbeafe','#1d4ed8'),
      circle(480,300,260,'none','#475569',2),circle(480,300,410,'none','#475569',2),
      circle(480,170,18,'#1d4ed8','#0f172a'),circle(480,430,18,'#1d4ed8','#0f172a'),circle(685,300,18,'#1d4ed8','#0f172a'),circle(275,300,18,'#1d4ed8','#0f172a'),
      text('p⁺',462,295,30,13),text('n⁰',495,315,30,13),text('e⁻',480,173,30,12,'#ffffff'),
      callout('Nucleus',480,300,'left'),callout('Proton',462,290,'left'),callout('Neutron',495,310,'right'),callout('Electron',685,300,'right'),callout('Electron shell',610,420,'right'),
    ],
  }];
}

function simpleCircuit() {
  return [{
    title:'A complete series circuit',
    description:'Current flows only when the switch is closed and all components form one continuous conducting path.',
    elements:[
      line(280,170,680,170,'#0f172a',3),line(680,170,680,430,'#0f172a',3),line(680,430,280,430,'#0f172a',3),line(280,430,280,170,'#0f172a',3),
      line(430,410,430,450,'#0f172a',3),line(455,395,455,465,'#0f172a',5),
      circle(680,300,90,'#fef3c7','#b45309',3),line(650,270,710,330,'#b45309',2),line(710,270,650,330,'#b45309',2),
      circle(385,170,10,'#0f172a','#0f172a'),circle(465,170,10,'#0f172a','#0f172a'),line(390,165,455,130,'#0f172a',3),
      polyline('320,430 335,410 350,450 365,410 380,450 395,410 410,430','#7e22ce',3),
      arrow(520,170,600,170,'#1d4ed8',2.5),
      callout('Cell',445,430,'left'),callout('Switch',420,150,'left'),callout('Lamp',680,300,'right'),callout('Resistor',365,430,'right'),callout('Conventional current',560,170,'right'),
    ],
  }];
}

function soilProfile() {
  return [{
    title:'A typical soil profile',
    description:'A soil profile is a vertical section showing distinct horizons formed by organic activity, leaching, accumulation and weathering.',
    elements:[
      rect(340,70,280,60,'#0f172a','#0f172a',0),rect(340,130,280,100,'#b45309','#475569',0),rect(340,230,280,120,'#fef3c7','#475569',0),
      rect(340,350,280,100,'#fee2e2','#475569',0),rect(340,450,280,90,'#dbeafe','#475569',0),
      callout('O horizon: organic litter',340,100,'left'),callout('A horizon: topsoil',340,180,'left'),callout('B horizon: subsoil',620,285,'right'),
      callout('C horizon: weathered parent material',620,400,'right'),callout('R horizon: bedrock',620,495,'right'),
    ],
  }];
}

function rockCycle() {
  return [{
    title:'The rock cycle',
    description:'Geological processes continually transform igneous, sedimentary and metamorphic rocks into one another.',
    elements:[
      rect(380,70,200,70,'#fee2e2','#be123c',14),rect(210,360,210,70,'#fef3c7','#b45309',14),rect(540,360,210,70,'#f3e8ff','#7e22ce',14),
      callout('Igneous rock',480,106,'right'),callout('Sedimentary rock',315,396,'left'),callout('Metamorphic rock',645,396,'right'),
      arrow(420,145,340,345,'#475569',3),arrow(435,395,525,395,'#475569',3),arrow(610,345,535,145,'#475569',3),
      arrow(535,145,610,345,'#475569',2),arrow(525,420,435,420,'#475569',2),arrow(340,345,420,145,'#475569',2),
      callout('Weathering, erosion and deposition',380,245,'left'),callout('Heat and pressure',480,395,'right'),callout('Melting then cooling',570,245,'right'),
    ],
  }];
}

const CURATED=[
  { id:'latitude-longitude',pattern:/\b(?:latitude|longitude|parallels? of latitude|meridians?|prime meridian|geographic coordinates?)\b/i,build:latitudeLongitude },
  { id:'food-chain',pattern:/\b(?:food chains?|food webs?|trophic levels?|producer(?:s)? and consumer(?:s)?)\b/i,build:foodChain },
  { id:'water-cycle',pattern:/\b(?:water cycle|hydrolog(?:ic|ical) cycle)\b/i,build:waterCycle },
  { id:'compound-light-microscope',topicOnly:true,pattern:/\b(?:microscopy|microscopes?|compound light microscope|microscopic observation|cell observation)\b/i,build:compoundLightMicroscope },
  // These biology plates are tied to the lesson topic.  Their vocabulary is
  // routinely mentioned in later Biology notes, so matching the full lesson
  // body would incorrectly copy the plant or cell plate into those lessons.
  { id:'photosynthesis',topicOnly:true,pattern:/\b(?:photosynthesis|light-dependent reaction|chlorophyll and light|nutrition in (?:green )?plants?|plant nutrition)\b/i,build:photosynthesis },
  { id:'cell-structure',topicOnly:true,pattern:/\b(?:plant and animal cells?|plant cell|animal cell|cell structure|cell organelles?)\b/i,build:cellComparison },
  { id:'atomic-structure',pattern:/\b(?:atomic structure|bohr model|electron shells?|electronic configuration)\b/i,build:atomicStructure },
  { id:'electric-circuit',pattern:/\b(?:simple electric circuit|series circuit|parallel circuit|circuit diagrams?)\b/i,build:simpleCircuit },
  { id:'soil-profile',pattern:/\b(?:soil profiles?|soil horizons?)\b/i,build:soilProfile },
  { id:'rock-cycle',pattern:/\b(?:rock cycle|igneous.*sedimentary.*metamorphic|types of rocks?)\b/i,build:rockCycle },
];

const ANATOMY=[
  { pattern:/\b(?:digestive system|alimentary canal|human digestion)\b/i,id:'digestive-system',labels:[['oesophagus','Oesophagus','left'],['stomach','Stomach','right'],['small-intestine','Small intestine','left'],['large-intestine','Large intestine','right'],['rectum','Rectum','left']] },
  { pattern:/\b(?:respiratory system|breathing mechanism|human respiration)\b/i,id:'respiratory-system',labels:[['nasal-cavity','Nasal cavity','left'],['trachea','Trachea','right'],['bronchi','Primary bronchi','left'],['left-lung','Left lung','right'],['diaphragm','Diaphragm','left']] },
  { pattern:/\b(?:circulatory system|blood circulation|cardiovascular system|heart and blood vessels)\b/i,id:'circulatory-system',labels:[['heart','Heart','left'],['aorta','Aorta','right'],['arteries','Arteries','left'],['veins','Veins','right']] },
  { pattern:/\b(?:skeletal system|human skeleton|bones and joints)\b/i,id:'skeletal-system',labels:[['skull','Skull','left'],['rib-cage','Rib cage','right'],['vertebral-column','Vertebral column','left'],['pelvis','Pelvis','right'],['femur','Femur','left']] },
  { pattern:/\b(?:nervous system|brain and spinal cord|central nervous system)\b/i,id:'nervous-system',labels:[['cerebrum','Cerebrum','left'],['cerebellum','Cerebellum','right'],['brainstem','Brainstem','left'],['spinal-cord','Spinal cord','right']] },
  { pattern:/\b(?:urinary system|human excretory system|kidneys? and excretion)\b/i,id:'urinary-system',labels:[] },
  { pattern:/\b(?:endocrine system|endocrine glands?|hormonal control)\b/i,id:'endocrine-system',labels:[] },
  { pattern:/\b(?:lymphatic system|lymph nodes?|body defence and lymph)\b/i,id:'lymphatic-system',labels:[['cervical-nodes','Cervical nodes','left'],['axillary-nodes','Axillary nodes','right'],['thoracic-duct','Thoracic duct','left'],['inguinal-nodes','Inguinal nodes','right']] },
  { pattern:/\b(?:muscular system|skeletal muscles?|major muscles)\b/i,id:'muscular-system',labels:[] },
  { pattern:/\b(?:female reproductive system|female reproductive organs?|menstrual cycle anatomy)\b/i,id:'female-reproductive-system',labels:[['ovary','Ovary','left'],['fallopian-tube','Fallopian tube','right'],['uterus','Uterus','left'],['cervix','Cervix','right'],['vagina','Vagina','left']] },
];

const VISUAL_KEYWORDS=/\b(?:map|scale drawing|contour|bearing|grid reference|relief|drainage|river profile|weather instrument|climate graph|plate tectonics?|volcano|fold(?:ing)?|fault(?:ing)?|erosion|landform|ecosystem|energy pyramid|ecological pyramid|carbon cycle|nitrogen cycle|flower structure|seed structure|germination|transpiration|osmosis|mitosis|meiosis|genetics? cross|punnett square|molecule|chemical bond|ionic bond|covalent bond|electrolysis|distillation|filtration|chromatography|titration|laboratory apparatus|reaction profile|periodic table|ray diagram|lens|mirror|waves?|magnetic field|transformer|lever|pulley|forces?|motion graph|velocity-time graph|distance-time graph|vector diagram|geometry|construction|triangle|quadrilateral|circle theorem|coordinate graph|transformation|venn diagram|probability tree|number line|solid shapes?|orthographic|isometric|projection|network topology|logic gates?|flowchart|computer architecture|demand curve|supply curve|market equilibrium|break-even|production possibility|organizational chart|life cycle|plant parts?|animal anatomy|fish anatomy|bird anatomy|livestock anatomy|farm tools?|irrigation system|crop rotation)\b/i;

function compactText(notes) {
  return [
    ...(notes?.objectives||[]),
    ...(notes?.keyTerms||[]).flatMap(item=>[item.term,item.definition]),
    ...(notes?.sections||[]).flatMap(section=>[section.heading,...(section.paragraphs||[])]),
    ...(notes?.summary||[]),
  ].filter(Boolean).join(' ').replace(/\s+/g,' ').slice(0,30000);
}

function cellVariant(topicTitle,notes) {
  const focus=[
    topicTitle,
    ...(notes?.objectives||[]),
    ...(notes?.keyTerms||[]).map(item=>item?.term),
    ...(notes?.sections||[]).map(section=>section?.heading),
  ].filter(Boolean).join(' ');
  if(/\b(?:plant and animal|animal and plant) cells?\b/i.test(focus))return 'comparison';
  const plant=/\bplant cells?\b|\bcell wall\b|\bchloroplasts?\b|\blarge permanent vacuole\b/i.test(focus);
  const animal=/\banimal cells?\b|\bcentrioles?\b|\blysosomes?\b/i.test(focus);
  if(plant&&!animal)return 'plant';
  if(animal&&!plant)return 'animal';
  return 'comparison';
}

function anatomyTemplate(rule) {
  const reproductive=rule.id==='female-reproductive-system';
  const base=anatomy(rule.id,reproductive?220:220,reproductive?115:20,520,reproductive?370:560);
  return [{
    title:`${rule.id.split('-').map(word=>word[0].toUpperCase()+word.slice(1)).join(' ')}`,
    description:'A medically recognisable anatomy plate with labels connected directly to the named structures.',
    elements:[base,...rule.labels.map(([region,label,side])=>anatomyCallout(rule.id,region,label,side))],
  }];
}

export function diagramRequirement({subjectId='',subjectName='',topicTitle='',notes={}}={}) {
  const topic=String(topicTitle||'').trim();
  const lessonContent=compactText(notes);

  // The topic is the strongest signal of what the diagram must teach. Search it
  // before the wider note so a secondary mention (for example photosynthesis in
  // a cell-structure note) cannot replace the required cell diagram.
  const topicRule=CURATED.find(rule=>rule.pattern.test(topic));
  if(topicRule)return {
    required:true,
    templateId:topicRule.id,
    ...(topicRule.id==='cell-structure'?{variant:cellVariant(topic,notes)}:{}),
    reason:`The lesson teaches ${topicRule.id.replaceAll('-',' ')} and requires a concrete explanatory diagram.`,
  };
  const topicAnatomyRule=ANATOMY.find(rule=>rule.pattern.test(topic));
  if(topicAnatomyRule)return { required:true,templateId:`anatomy:${topicAnatomyRule.id}`,reason:'The lesson teaches a human organ system and requires an anatomical plate.' };

  const content=`${topic} ${lessonContent}`;
  for(const rule of CURATED) if(!rule.topicOnly&&rule.pattern.test(lessonContent)) return {
    required:true,
    templateId:rule.id,
    ...(rule.id==='cell-structure'?{variant:cellVariant(topic,notes)}:{}),
    reason:`The lesson teaches ${rule.id.replaceAll('-',' ')} and requires a concrete explanatory diagram.`,
  };
  const anatomyRule=ANATOMY.find(rule=>rule.pattern.test(lessonContent));
  if(anatomyRule)return { required:true,templateId:`anatomy:${anatomyRule.id}`,reason:'The lesson teaches a human organ system and requires an anatomical plate.' };
  const match=content.match(VISUAL_KEYWORDS)?.[0];
  if(match)return { required:true,templateId:null,reason:`The lesson contains the diagram-dependent concept “${match}”.` };
  const diagramRichSubjects=new Set([
    'biology','chemistry','physics','geography','science','combined-science','basic-science','intermediate-science','agriculture','environmental-management','marine-science',
    'mathematics','general-mathematics','further-mathematics','additional-mathematics','statistics','technical-drawing','design-and-technology','basic-technology',
    'basic-electricity','basic-electronics','electrical-installation-and-maintenance','solar-photovoltaic-installation-and-maintenance','computing','computer-science','information-technology',
    'physical-health-education','physical-education','health-education','relationships-sex-and-health-education','animal-husbandry','livestock-farming','horticulture-and-crop-production','fisheries',
  ]);
  const explicitVisual=/\b(?:diagram|illustrat(?:e|ion)|draw|label|structure|parts of|stages of|process of|cross-section|apparatus|graph|chart|cycle)\b/i.test(content);
  if(diagramRichSubjects.has(subjectId)&&explicitVisual)return { required:true,templateId:null,reason:`${subjectName||subjectId} lesson objectives explicitly require a diagram, structure, process, graph or labelled illustration.` };
  return { required:false,templateId:null,reason:'No diagram-dependent concept was detected in the saved lesson.' };
}

export function curatedIllustrationsForLesson(context={}) {
  const requirement=context.requirement||diagramRequirement(context);
  if(!requirement.required||!requirement.templateId)return [];
  if(requirement.templateId==='cell-structure') {
    if(requirement.variant==='plant')return plantCell();
    if(requirement.variant==='animal')return animalCell();
    return cellComparison();
  }
  if(requirement.templateId.startsWith('anatomy:')) {
    const id=requirement.templateId.slice('anatomy:'.length);
    const rule=ANATOMY.find(item=>item.id===id);
    return rule?anatomyTemplate(rule):[];
  }
  return CURATED.find(rule=>rule.id===requirement.templateId)?.build()||[];
}

export function curatedDiagramPreviews() {
  return CURATED.flatMap(rule=>rule.build());
}

export function diagramCoverage({illustrations,illustrationVersion,requirement,currentVersion}) {
  const count=Array.isArray(illustrations)?illustrations.length:0;
  if(!requirement.required)return { status:count?'optional-covered':'not-required',count,current:illustrationVersion===currentVersion };
  if(requirement.templateId&&count) {
    const expectedTitles=new Set(curatedIllustrationsForLesson({requirement}).map(item=>item.title));
    const hasExpectedTemplate=illustrations.some(item=>expectedTitles.has(item?.title));
    if(expectedTitles.size&&!hasExpectedTemplate)return { status:'missing',count,current:false };
  }
  return { status:count?'covered':'missing',count,current:illustrationVersion===currentVersion };
}

export const diagramCoverageTemplates=Object.freeze(CURATED.map(rule=>rule.id).concat(ANATOMY.map(rule=>`anatomy:${rule.id}`)));
