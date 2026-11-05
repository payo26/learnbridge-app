import test from 'node:test';
import assert from 'node:assert/strict';
import { addBillingCycle, consumerPlanCodes, entitlement, lessonAccess, originGuard, paymentMode, requirePreloadAccess } from '../backend/platform.mjs';
import { ILLUSTRATION_VERSION, mapCatalog, validIllustrations } from '../backend/illustrations.mjs';

function request({topicId='t2',auth,origin,preloadToken}={}) {
  return {
    method:'POST',
    path:'/api/lesson-notes',
    auth,
    ip:'127.0.0.1',
    get(name) {
      if (name.toLowerCase()==='origin') return origin;
      if (name.toLowerCase()==='x-preload-token') return preloadToken;
      return undefined;
    },
    input:{topicId},
  };
}
function response() {
  return {
    statusCode:200,
    body:null,
    status(value){this.statusCode=value;return this;},
    json(value){this.body=value;return this;},
  };
}

test('only topic one is a public sample',()=>{
  assert.equal(lessonAccess(request({topicId:'t1'}),{topicId:'t1'}).allowed,true);
  assert.equal(lessonAccess(request({topicId:'t1'}),{topicId:'t1'}).canGenerate,false);
  assert.equal(lessonAccess(request({topicId:'t2'}),{topicId:'t2'}).allowed,false);
});

test('active school and platform accounts can open protected lessons',()=>{
  const school={role:'student',entitlement:{active:true}};
  const admin={role:'super_admin',entitlement:{active:true}};
  assert.equal(lessonAccess(request({auth:school}),{topicId:'t2'}).allowed,true);
  assert.equal(lessonAccess(request({auth:admin}),{topicId:'t2'}).canGenerate,true);
  assert.equal(lessonAccess(request({auth:{role:'student',entitlement:{active:false}}}),{topicId:'t2'}).allowed,false);
});

test('active individual and family accounts use the same protected lesson entitlement',()=>{
  const individual={role:'account_owner',school:{accountType:'individual'},entitlement:{active:true}};
  const familyLearner={role:'student',school:{accountType:'family'},entitlement:{active:true}};
  assert.equal(lessonAccess(request({auth:individual}),{topicId:'t12'}).allowed,true);
  assert.equal(lessonAccess(request({auth:familyLearner}),{topicId:'t12'}).allowed,true);
  assert.equal(lessonAccess(request({auth:{...individual,entitlement:{active:false}}}),{topicId:'t12'}).allowed,false);
});

test('database and browser account date fields produce the same entitlement',()=>{
  const future=new Date(Date.now()+60_000).toISOString();
  assert.deepEqual(entitlement({status:'licensed',licence_end_at:future}),{active:true,reason:'LICENSED'});
  assert.deepEqual(entitlement({status:'licensed',licenceEndAt:future}),{active:true,reason:'LICENSED'});
});

test('preload token grants generation without granting browser access',()=>{
  const previous=process.env.PRELOAD_TOKEN;
  process.env.PRELOAD_TOKEN='test-preload-token-123';
  try {
    const allowed=lessonAccess(request({preloadToken:'test-preload-token-123'}),{topicId:'t20'});
    assert.equal(allowed.allowed,true);
    assert.equal(allowed.preloader,true);
    const res=response();let next=false;
    requirePreloadAccess(request({preloadToken:'wrong-token'}),res,()=>{next=true;});
    assert.equal(next,false);assert.equal(res.statusCode,401);
  } finally {
    if(previous===undefined)delete process.env.PRELOAD_TOKEN;else process.env.PRELOAD_TOKEN=previous;
  }
});

test('browser mutations reject an unexpected origin',()=>{
  const previous=process.env.APP_ORIGIN;
  process.env.APP_ORIGIN='https://maydoy.name.ng';
  try {
    const rejected=response();let rejectedNext=false;
    originGuard(request({origin:'https://attacker.invalid'}),rejected,()=>{rejectedNext=true;});
    assert.equal(rejectedNext,false);assert.equal(rejected.statusCode,403);
    const accepted=response();let acceptedNext=false;
    originGuard(request({origin:'https://maydoy.name.ng'}),accepted,()=>{acceptedNext=true;});
    assert.equal(acceptedNext,true);
  } finally {
    if(previous===undefined)delete process.env.APP_ORIGIN;else process.env.APP_ORIGIN=previous;
  }
});

test('Paystack mode ignores placeholders and distinguishes test from live keys',()=>{
  const previous=process.env.PAYSTACK_SECRET_KEY;
  try {
    process.env.PAYSTACK_SECRET_KEY='sk_test_replace_me';
    assert.equal(paymentMode(),'not-configured');
    process.env.PAYSTACK_SECRET_KEY='sk_test_'+'x'.repeat(24);
    assert.equal(paymentMode(),'test');
    process.env.PAYSTACK_SECRET_KEY='sk_live_'+'x'.repeat(24);
    assert.equal(paymentMode(),'live');
  } finally {
    if(previous===undefined)delete process.env.PAYSTACK_SECRET_KEY;else process.env.PAYSTACK_SECRET_KEY=previous;
  }
});

test('consumer plan configuration maps all four package and billing combinations',()=>{
  const names=['PAYSTACK_INDIVIDUAL_MONTHLY_PLAN','PAYSTACK_INDIVIDUAL_ANNUAL_PLAN','PAYSTACK_FAMILY_MONTHLY_PLAN','PAYSTACK_FAMILY_ANNUAL_PLAN'];
  const previous=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  try {
    names.forEach((name,index)=>{process.env[name]=`PLN_plan${index}`;});
    const plans=consumerPlanCodes();
    assert.deepEqual(plans.map(plan=>[plan.package,plan.billingCycle,plan.expectedInterval]),[
      ['individual','monthly','monthly'],['individual','annual','annually'],['family','monthly','monthly'],['family','annual','annually'],
    ]);
    assert.deepEqual(plans.map(plan=>plan.planCode),['PLN_plan0','PLN_plan1','PLN_plan2','PLN_plan3']);
  } finally {
    for(const name of names){if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];}
  }
});

test('monthly access ends on the matching day without skipping short months',()=>{
  assert.equal(addBillingCycle('2027-01-31T10:00:00.000Z','monthly').toISOString(),'2027-02-28T10:00:00.000Z');
  assert.equal(addBillingCycle('2028-01-31T10:00:00.000Z','monthly').toISOString(),'2028-02-29T10:00:00.000Z');
  assert.equal(addBillingCycle('2027-06-15T10:00:00.000Z','annual').toISOString(),'2028-06-15T10:00:00.000Z');
});

function diagramElement(kind,overrides={}) {
  return {kind,x:0,y:0,x2:0,y2:0,width:0,height:0,points:'',label:'',fill:'none',stroke:'#475569',strokeWidth:2,fontSize:14,mapId:'',specimenId:'',anatomyId:'',regionIds:'',...overrides};
}

test('version 6 illustration quality rules accept separated callout labels',()=>{
  const illustration={title:'Plant cell',description:'A clearly labelled plant cell.',elements:[
    diagramElement('rect',{x:270,y:110,x2:18,width:420,height:350,fill:'#dcfce7',stroke:'#15803d'}),
    diagramElement('ellipse',{x:480,y:285,width:310,height:230,fill:'#f8fafc'}),
    diagramElement('circle',{x:430,y:260,width:90,fill:'#dbeafe',stroke:'#1d4ed8'}),
    diagramElement('callout',{x:300,y:150,x2:170,y2:120,label:'Cell wall',fill:'#ffffff'}),
    diagramElement('callout',{x:430,y:260,x2:790,y2:230,label:'Nucleus',fill:'#ffffff'}),
  ]};
  assert.equal(ILLUSTRATION_VERSION,6);
  assert.equal(validIllustrations([illustration]),true);
});

test('illustration quality rules reject crowded callouts and overlapping free text',()=>{
  const shapes=[
    diagramElement('rect',{x:270,y:110,x2:18,width:420,height:350,fill:'#dcfce7'}),
    diagramElement('ellipse',{x:480,y:285,width:310,height:230,fill:'#f8fafc'}),
    diagramElement('circle',{x:430,y:260,width:90,fill:'#dbeafe'}),
  ];
  const crowded=Array.from({length:7},(_,index)=>diagramElement('callout',{x:300+index*10,y:90+index*65,x2:170,y2:60+index*70,label:`Part ${index+1}`,fill:'#ffffff'}));
  assert.equal(validIllustrations([{title:'Crowded',description:'Too many labels on one side.',elements:[...shapes,...crowded]}]),false);
  const overlapping=[
    diagramElement('text',{x:480,y:200,label:'First label',fill:'#0f172a'}),
    diagramElement('text',{x:485,y:202,label:'Second label',fill:'#0f172a'}),
  ];
  assert.equal(validIllustrations([{title:'Overlap',description:'Overlapping internal labels.',elements:[...shapes,...overlapping]}]),false);
});

test('illustration quality rules measure wrapped English labels at their rendered height',()=>{
  const shapes=[
    diagramElement('rect',{x:270,y:110,x2:18,width:420,height:350,fill:'#f8fafc'}),
    diagramElement('line',{x:300,y:260,x2:660,y2:260}),
    diagramElement('circle',{x:480,y:260,width:24,fill:'#dbeafe'}),
  ];
  const wrappedLabels=[
    diagramElement('text',{x:480,y:200,width:90,label:'Independent clause marker',fill:'#0f172a'}),
    diagramElement('text',{x:480,y:238,width:90,label:'Dependent clause marker',fill:'#0f172a'}),
  ];
  assert.equal(validIllustrations([{title:'Sentence structure',description:'Wrapped grammatical labels must not collide.',elements:[...shapes,...wrappedLabels]}]),false);
});

test('real Nigeria map elements accept known states and reject invented regions',()=>{
  assert.equal(mapCatalog.nigeria.regions.length,37);
  assert.equal(mapCatalog.africa.regions.length,55);
  assert.equal(mapCatalog['west-africa'].regions.length,16);
  const map=diagramElement('map',{x:240,y:45,width:480,height:510,mapId:'nigeria',regionIds:'lagos,oyo',fill:'#fef3c7'});
  const lagos=diagramElement('callout',{x2:170,y2:390,label:'Lagos State',fill:'#ffffff',mapId:'nigeria',regionIds:'lagos'});
  const oyo=diagramElement('callout',{x2:790,y2:250,label:'Oyo State',fill:'#ffffff',mapId:'nigeria',regionIds:'oyo'});
  const illustration={title:'Selected Nigerian states',description:'Real state boundaries with accurate region anchors.',elements:[map,lagos,oyo]};
  assert.equal(validIllustrations([illustration]),true);
  const invented={...map,regionIds:'atlantis'};
  assert.equal(validIllustrations([{...illustration,elements:[invented,lagos,oyo]}]),false);
});

test('real biological specimen templates accept exact anatomical region labels',()=>{
  const specimen=diagramElement('specimen',{x:240,y:35,width:480,height:530,specimenId:'flowering-plant'});
  const flower=diagramElement('callout',{x2:790,y2:80,label:'Flower',fill:'#ffffff',specimenId:'flowering-plant',regionIds:'flower'});
  const roots=diagramElement('callout',{x2:170,y2:500,label:'Root system',fill:'#ffffff',specimenId:'flowering-plant',regionIds:'root-system'});
  const illustration={title:'Parts of a flowering plant',description:'A recognisable whole plant with exact structure labels.',elements:[specimen,flower,roots]};
  assert.equal(validIllustrations([illustration]),true);
  assert.equal(validIllustrations([{...illustration,elements:[specimen,{...flower,regionIds:'invented-part'},roots]}]),false);
});

test('real anatomy plates accept catalogued organ anchors and reject invented structures',()=>{
  const plate=diagramElement('anatomy',{x:240,y:35,width:480,height:530,anatomyId:'digestive-system'});
  const stomach=diagramElement('callout',{x2:790,y2:180,label:'Stomach',fill:'#ffffff',anatomyId:'digestive-system',regionIds:'stomach'});
  const intestine=diagramElement('callout',{x2:170,y2:360,label:'Small intestine',fill:'#ffffff',anatomyId:'digestive-system',regionIds:'small-intestine'});
  const illustration={title:'Human digestive system',description:'A medical plate with exact anatomical anchors.',elements:[plate,stomach,intestine]};
  assert.equal(validIllustrations([illustration]),true);
  assert.equal(validIllustrations([{...illustration,elements:[plate,{...stomach,regionIds:'invented-organ'},intestine]}]),false);
});

test('pre-labelled public-domain anatomy plates are valid without duplicate callouts',()=>{
  const plate=diagramElement('anatomy',{x:250,y:30,width:460,height:540,anatomyId:'urinary-system'});
  assert.equal(validIllustrations([{title:'Human urinary system',description:'A pre-labelled medical anatomy plate.',elements:[plate]}]),true);
});
