import type { IllustrationElement, LessonIllustration } from '../shared/notes-types';
import { LessonIllustrationView } from './NotesReader';

const element=(kind:IllustrationElement['kind'],overrides:Partial<IllustrationElement>):IllustrationElement=>({
  kind,x:0,y:0,x2:0,y2:0,width:0,height:0,points:'',label:'',fill:'none',stroke:'#475569',strokeWidth:2,fontSize:14,mapId:'',specimenId:'',anatomyId:'',regionIds:'',...overrides,
});
const anatomy=(anatomyId:IllustrationElement['anatomyId'],x:number,y:number,width:number,height:number)=>element('anatomy',{anatomyId,x,y,width,height});
const callout=(anatomyId:IllustrationElement['anatomyId'],regionIds:string,label:string,side:'left'|'right')=>element('callout',{anatomyId,regionIds,label,x2:side==='left'?170:790,y2:300,fill:'#ffffff'});

export const diagrams:LessonIllustration[]=[
  {
    title:'Human digestive system',
    description:'A medical anatomy plate with external labels connected directly to the structures of the alimentary canal.',
    elements:[
      anatomy('digestive-system',240,35,480,530),
      callout('digestive-system','oesophagus','Oesophagus','left'),callout('digestive-system','stomach','Stomach','right'),
      callout('digestive-system','duodenum','Duodenum','left'),callout('digestive-system','small-intestine','Small intestine','right'),
      callout('digestive-system','large-intestine','Large intestine','left'),callout('digestive-system','transverse-colon','Transverse colon','right'),
      callout('digestive-system','appendix','Appendix','left'),callout('digestive-system','rectum','Rectum','right'),
    ],
  },
  {
    title:'Human respiratory system',
    description:'The airways, lungs, branching bronchi, diaphragm and magnified alveoli are shown in a recognisable anatomical view.',
    elements:[
      anatomy('respiratory-system',250,30,460,540),
      callout('respiratory-system','nasal-cavity','Nasal cavity','left'),callout('respiratory-system','pharynx','Pharynx','left'),
      callout('respiratory-system','trachea','Trachea','left'),callout('respiratory-system','right-lung','Right lung','left'),
      callout('respiratory-system','left-lung','Left lung','right'),callout('respiratory-system','bronchi','Primary bronchi','right'),
      callout('respiratory-system','diaphragm','Diaphragm','right'),callout('respiratory-system','alveoli','Alveoli','right'),
    ],
  },
  {
    title:'Human circulatory system',
    description:'Arteries and veins retain their accepted red and blue convention while labels terminate on the named vessels.',
    elements:[
      anatomy('circulatory-system',265,20,430,560),
      callout('circulatory-system','carotid-arteries','Carotid arteries','left'),callout('circulatory-system','aorta','Aorta','right'),
      callout('circulatory-system','heart','Heart','left'),callout('circulatory-system','pulmonary-vessels','Pulmonary vessels','right'),
      callout('circulatory-system','renal-vessels','Renal vessels','left'),callout('circulatory-system','femoral-vessels','Femoral vessels','right'),
      callout('circulatory-system','arteries','Arteries','left'),callout('circulatory-system','veins','Veins','right'),
    ],
  },
  {
    title:'Human skeletal system',
    description:'A full anterior skeleton is used instead of approximate geometric shapes.',
    elements:[
      anatomy('skeletal-system',265,20,430,560),
      callout('skeletal-system','skull','Skull','left'),callout('skeletal-system','clavicle','Clavicle','right'),
      callout('skeletal-system','sternum','Sternum','left'),callout('skeletal-system','rib-cage','Rib cage','right'),
      callout('skeletal-system','vertebral-column','Vertebral column','left'),callout('skeletal-system','pelvis','Pelvis','right'),
      callout('skeletal-system','humerus','Humerus','left'),callout('skeletal-system','femur','Femur','right'),
      callout('skeletal-system','patella','Patella','left'),callout('skeletal-system','tibia-fibula','Tibia and fibula','right'),
    ],
  },
  {
    title:'Central nervous system',
    description:'A lateral medical plate identifies the cerebrum, cerebellum, brainstem and spinal cord.',
    elements:[
      anatomy('nervous-system',270,35,420,530),
      callout('nervous-system','cerebrum','Cerebrum','left'),callout('nervous-system','cerebellum','Cerebellum','right'),
      callout('nervous-system','brainstem','Brainstem','left'),callout('nervous-system','spinal-cord','Spinal cord','right'),
    ],
  },
  {
    title:'Human lymphatic system',
    description:'Major node groups, vessels and the thoracic duct appear in their anatomical positions.',
    elements:[
      anatomy('lymphatic-system',250,30,460,540),
      callout('lymphatic-system','cervical-nodes','Cervical nodes','left'),callout('lymphatic-system','axillary-nodes','Axillary nodes','right'),
      callout('lymphatic-system','mediastinal-nodes','Mediastinal nodes','left'),callout('lymphatic-system','thoracic-duct','Thoracic duct','right'),
      callout('lymphatic-system','lumbar-nodes','Lumbar nodes','left'),callout('lymphatic-system','inguinal-nodes','Inguinal nodes','right'),
    ],
  },
  {
    title:'Female reproductive system',
    description:'A frontal medical cross-section shows the organs and uses external callouts instead of overprinting the image.',
    elements:[
      anatomy('female-reproductive-system',220,115,520,370),
      callout('female-reproductive-system','ovary','Ovary','left'),callout('female-reproductive-system','fallopian-tube','Fallopian tube','right'),
      callout('female-reproductive-system','uterus','Uterus','left'),callout('female-reproductive-system','endometrium','Endometrium','right'),
      callout('female-reproductive-system','cervix','Cervix','left'),callout('female-reproductive-system','vagina','Vagina','right'),
    ],
  },
  {
    title:'Human urinary system',
    description:'A medically recognisable, pre-labelled urinary system plate with direct leader lines.',
    elements:[anatomy('urinary-system',220,20,520,560)],
  },
  {
    title:'Major endocrine glands',
    description:'A pre-labelled medical plate compares the locations of the major endocrine glands.',
    elements:[anatomy('endocrine-system',220,20,520,560)],
  },
  {
    title:'Human skeletal muscles',
    description:'A detailed anterior muscular anatomy plate replaces symbolic or geometric body drawings.',
    elements:[anatomy('muscular-system',220,20,520,560)],
  },
];

export default function DiagramPreview() {
  return <main className='diagram-preview-page'>
    <header><span>LearnBridge localhost test</span><strong>Real anatomy renderer 6</strong></header>
    <section className='diagram-preview-intro'>
      <span className='eyebrow'>HUMAN ANATOMY QUALITY CHECK</span>
      <h1>Medical anatomy plates with precise labels</h1>
      <p>Each body system is a bundled medical plate. External labels use catalogued anatomical anchors, straight leader lines and collision-aware placement.</p>
    </section>
    <section className='diagram-preview-list'>{diagrams.map((diagram,index)=><LessonIllustrationView key={diagram.title} illustration={diagram} index={index}/>)}</section>
  </main>;
}
