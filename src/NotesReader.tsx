import { useEffect, useState } from 'react';
import { api } from './api';
import { Search, ChevronRight, X, BookOpen, Bookmark, Lock } from 'lucide-react';
import type { Plan, Topic, Notes, NoteRecord, LessonIllustration, IllustrationElement } from '../shared/notes-types';
import { useAuth } from './AuthContext';
import type { ApiError } from './api';
import MathText from './MathText';
import SpecimenIllustration from './SpecimenIllustration';
import { specimenCatalog, type SpecimenId } from '../shared/specimen-catalog.mjs';
import AnatomyIllustration, { type AnatomyId } from './AnatomyIllustration';
import { anatomyCatalog } from '../shared/anatomy-catalog.mjs';
import {
  positionIllustrationCallouts,
  prepareIllustrationLabels,
  straightLeaderCoordinates,
  type IllustrationCalloutLayout,
} from './illustration-label-layout.mjs';

const DIAGRAM_WIDTH=960;
const DIAGRAM_HEIGHT=600;
const ILLUSTRATION_RENDERER_VERSION=6;
const LESSON_BROWSER_CACHE_MS=10*60*1000;
const safeNumber=(value:number,fallback=0)=>Number.isFinite(value)?Math.max(0,Math.min(1200,value)):fallback;
const allowedColours=new Set(['none','#ffffff','#f8fafc','#e0f2fe','#dbeafe','#dcfce7','#fef3c7','#fee2e2','#f3e8ff','#fce7f3','#0f172a','#1d4ed8','#15803d','#b45309','#be123c','#7e22ce','#475569']);
const safeColour=(value:string,fallback:string)=>allowedColours.has(value)?value:fallback;
const safePoints=(value:string)=>/^[-0-9.,\s]+$/.test(value)&&value.length<=500?value:'';
type MapId='nigeria'|'africa'|'west-africa';
type MapTemplate={id:string;label:string;source:string;viewBox:number[];locations:{id:string;name:string;path:string;center:number[];bounds:number[]}[]};
type EducationalMapData={version:number;attribution:{name:string;url:string;license:string;licenseUrl:string;notice:string};maps:Record<MapId,MapTemplate>};
function wrapLabel(value:string,maximumCharacters=23) {
  const words=value.trim().split(/\s+/).filter(Boolean);
  const lines:string[]=[];
  for(const word of words) {
    if(word.length>maximumCharacters) {
      for(let index=0;index<word.length;index+=maximumCharacters)lines.push(word.slice(index,index+maximumCharacters));
      continue;
    }
    const current=lines[lines.length-1]||'';
    if(!current)lines[lines.length?lines.length-1:0]=word;
    else if(`${current} ${word}`.length<=maximumCharacters)lines[lines.length-1]=`${current} ${word}`;
    else lines.push(word);
  }
  return (lines.length?lines:['']).slice(0,3);
}
type InternalLabelLayout={
  element:IllustrationElement;
  targetX:number;targetY:number;centreX:number;centreY:number;
  boxWidth:number;boxHeight:number;lines:string[];fontSize:number;boxed:boolean;
};
type LabelBounds={left:number;right:number;top:number;bottom:number};
const clamp=(value:number,minimum:number,maximum:number)=>Math.max(minimum,Math.min(maximum,value));
const labelBounds=(layout:InternalLabelLayout):LabelBounds=>({
  left:layout.centreX-layout.boxWidth/2,right:layout.centreX+layout.boxWidth/2,
  top:layout.centreY-layout.boxHeight/2,bottom:layout.centreY+layout.boxHeight/2,
});
function labelBoxesOverlap(first:LabelBounds,second:LabelBounds,gap=9) {
  return first.left<second.right+gap&&first.right+gap>second.left
    &&first.top<second.bottom+gap&&first.bottom+gap>second.top;
}
function positionInternalLabels(elements:IllustrationElement[]) {
  const prepared=elements.map(element=>{
    const fontSize=Math.max(11,Math.min(20,safeNumber(element.fontSize,14)));
    const maximumCharacters=element.width>0?Math.max(6,Math.min(26,Math.floor(element.width/(fontSize*.6)))):20;
    const lines=wrapLabel(element.label.slice(0,60),maximumCharacters);
    const longest=Math.max(...lines.map(line=>line.length),1);
    const phrase=lines.length>1||element.label.trim().length>12||/\s/.test(element.label.trim());
    const boxWidth=phrase?Math.min(210,Math.max(68,longest*fontSize*.61+28)):Math.max(20,longest*fontSize*.58+8);
    const boxHeight=phrase?Math.max(36,lines.length*fontSize*1.2+16):fontSize*1.35;
    const targetX=safeNumber(element.x),targetY=safeNumber(element.y);
    return {element,targetX,targetY,centreX:targetX,centreY:targetY,boxWidth,boxHeight,lines,fontSize,boxed:phrase} satisfies InternalLabelLayout;
  }).sort((first,second)=>first.targetY-second.targetY||first.targetX-second.targetX);
  const placed:InternalLabelLayout[]=[];
  for(const original of prepared) {
    let layout={...original};
    const naturalBounds=labelBounds(layout);
    const naturalCollision=placed.some(previous=>labelBoxesOverlap(naturalBounds,labelBounds(previous)));
    if(!layout.boxed&&!naturalCollision) { placed.push(layout);continue; }
    layout.boxed=true;
    layout.boxWidth=Math.max(58,layout.boxWidth);
    layout.boxHeight=Math.max(34,layout.boxHeight);
    const minimumX=232+layout.boxWidth/2,maximumX=728-layout.boxWidth/2;
    const minimumY=18+layout.boxHeight/2,maximumY=582-layout.boxHeight/2;
    const desiredX=clamp(layout.targetX,minimumX,maximumX);
    const desiredY=clamp(layout.targetY,minimumY,maximumY);
    const verticalStep=Math.max(42,layout.boxHeight+12);
    const horizontalStep=Math.max(105,layout.boxWidth*.68);
    const candidates:{x:number;y:number;score:number}[]=[];
    for(let vertical=-6;vertical<=6;vertical++)for(let horizontal=-2;horizontal<=2;horizontal++){
      const x=clamp(desiredX+horizontal*horizontalStep,minimumX,maximumX);
      const y=clamp(desiredY+vertical*verticalStep,minimumY,maximumY);
      candidates.push({x,y,score:Math.abs(vertical)*1.1+Math.abs(horizontal)*1.5});
    }
    for(const x of [330,480,630])for(let y=48+layout.boxHeight/2;y<=560-layout.boxHeight/2;y+=verticalStep){
      candidates.push({x:clamp(x,minimumX,maximumX),y,score:12+Math.hypot(x-desiredX,y-desiredY)/100});
    }
    candidates.sort((first,second)=>first.score-second.score);
    const unique=new Set<string>();
    const chosen=candidates.find(candidate=>{
      const candidateKey=`${Math.round(candidate.x)}:${Math.round(candidate.y)}`;
      if(unique.has(candidateKey))return false;
      unique.add(candidateKey);
      const bounds={left:candidate.x-layout.boxWidth/2,right:candidate.x+layout.boxWidth/2,top:candidate.y-layout.boxHeight/2,bottom:candidate.y+layout.boxHeight/2};
      return !placed.some(previous=>labelBoxesOverlap(bounds,labelBounds(previous)));
    });
    if(chosen){layout.centreX=chosen.x;layout.centreY=chosen.y;}
    placed.push(layout);
  }
  return placed;
}
function IllustrationInternalLabel({layout}:{layout:InternalLabelLayout}) {
  const {element,targetX,targetY,centreX,centreY,boxWidth,boxHeight,lines,fontSize,boxed}=layout;
  const colour=element.fill==='none'?'#0f172a':safeColour(element.fill,'#0f172a');
  const stroke=element.stroke==='none'?'#94a3b8':safeColour(element.stroke,'#94a3b8');
  const startY=centreY-(lines.length-1)*fontSize*.59+fontSize*.34;
  if(!boxed)return <text className='illustration-internal-label' x={centreX} y={startY} fill={colour} fontSize={fontSize} textAnchor='middle' fontFamily='Inter, Arial, sans-serif' fontWeight='650' stroke='#ffffff' strokeWidth='4' paintOrder='stroke fill' strokeLinejoin='round'>
    {lines.map((line,index)=><tspan key={`${line}-${index}`} x={centreX} dy={index===0?0:fontSize*1.18}>{line}</tspan>)}
  </text>;
  const boxX=centreX-boxWidth/2,boxY=centreY-boxHeight/2;
  const connectorX=clamp(targetX,boxX,boxX+boxWidth),connectorY=clamp(targetY,boxY,boxY+boxHeight);
  const moved=Math.hypot(centreX-targetX,centreY-targetY)>8;
  return <g className='illustration-internal-label illustration-internal-label-box'>
    {moved&&<><path d={`M ${targetX} ${targetY} L ${connectorX} ${connectorY}`} fill='none' stroke={stroke} strokeWidth='1.5' strokeDasharray='4 4' vectorEffect='non-scaling-stroke'/><circle cx={targetX} cy={targetY} r='3.5' fill='#ffffff' stroke={stroke} strokeWidth='1.7' vectorEffect='non-scaling-stroke'/></>}
    <rect x={boxX} y={boxY} width={boxWidth} height={boxHeight} rx='8' fill='#ffffff' fillOpacity='.96' stroke={stroke} strokeWidth='1.2' vectorEffect='non-scaling-stroke' filter='url(#label-shadow)'/>
    <text x={centreX} y={startY} fill={colour} fontSize={fontSize} textAnchor='middle' fontFamily='Inter, Arial, sans-serif' fontWeight='650'>
      {lines.map((line,index)=><tspan key={`${line}-${index}`} x={centreX} dy={index===0?0:fontSize*1.18}>{line}</tspan>)}
    </text>
  </g>;
}
function IllustrationShape({element,markerId}:{element:IllustrationElement;markerId:string}) {
  const x=safeNumber(element.x),y=safeNumber(element.y),x2=safeNumber(element.x2),y2=safeNumber(element.y2);
  const width=Math.max(0,safeNumber(element.width)),height=Math.max(0,safeNumber(element.height));
  const fill=safeColour(element.fill,'none'),stroke=safeColour(element.stroke,'#475569');
  const strokeWidth=Math.max(1,Math.min(6,safeNumber(element.strokeWidth,2)));
  const lineProps={stroke,strokeWidth,vectorEffect:'non-scaling-stroke' as const,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
  if(element.kind==='circle')return <circle className='illustration-shape' cx={x} cy={y} r={Math.max(2,width/2)} fill={fill} {...lineProps}/>;
  if(element.kind==='ellipse')return <ellipse className='illustration-shape' cx={x} cy={y} rx={Math.max(2,width/2)} ry={Math.max(2,height/2)} fill={fill} {...lineProps}/>;
  if(element.kind==='rect')return <rect className='illustration-shape' x={x} y={y} width={width} height={height} rx={Math.min(20,Math.max(0,safeNumber(element.x2)))} fill={fill} {...lineProps}/>;
  if(element.kind==='line'||element.kind==='arrow')return <line x1={x} y1={y} x2={x2} y2={y2} {...lineProps} markerEnd={element.kind==='arrow'?`url(#${markerId})`:undefined}/>;
  if(element.kind==='polygon')return <polygon className='illustration-shape' points={safePoints(element.points)} fill={fill} {...lineProps}/>;
  if(element.kind==='polyline')return <polyline points={safePoints(element.points)} fill='none' {...lineProps}/>;
  if(element.kind==='text') {
    const fontSize=Math.max(11,Math.min(20,safeNumber(element.fontSize,15)));
    const maximumCharacters=width>0?Math.max(6,Math.min(30,Math.floor(width/(fontSize*.58)))):24;
    const lines=wrapLabel(element.label.slice(0,60),maximumCharacters);
    const startY=y-(lines.length-1)*fontSize*.58;
    return <text className='illustration-internal-label' x={x} y={startY} fill={safeColour(element.fill,'#0f172a')} fontSize={fontSize} textAnchor='middle' fontFamily='Inter, Arial, sans-serif' fontWeight='650' stroke='#ffffff' strokeWidth='4' paintOrder='stroke fill' strokeLinejoin='round'>
      {lines.map((line,index)=><tspan key={`${line}-${index}`} x={x} dy={index===0?0:fontSize*1.18}>{line}</tspan>)}
    </text>;
  }
  return null;
}

function IllustrationMap({element,data}:{element:IllustrationElement;data:EducationalMapData}) {
  const map=data.maps[element.mapId as MapId];
  if(!map)return null;
  const highlighted=new Set(element.regionIds.split(',').filter(Boolean));
  const highlightFill=element.fill==='none'?'#fef3c7':safeColour(element.fill,'#fef3c7');
  const outline=safeColour(element.stroke,'#475569');
  return <svg className='illustration-real-map' x={safeNumber(element.x)} y={safeNumber(element.y)} width={safeNumber(element.width)} height={safeNumber(element.height)} viewBox={map.viewBox.join(' ')} preserveAspectRatio='xMidYMid meet' overflow='visible' aria-label={map.label}>
    {map.locations.map(location=><path key={location.id} data-region-id={location.id} d={location.path} fill={highlighted.has(location.id)?highlightFill:'#e0f2fe'} stroke={highlighted.has(location.id)?'#b45309':outline} strokeWidth={highlighted.has(location.id)?2.2:1.15} vectorEffect='non-scaling-stroke' strokeLinejoin='round'>
      <title>{location.name}</title>
    </path>)}
  </svg>;
}

function mapCalloutTarget(element:IllustrationElement,elements:IllustrationElement[],data:EducationalMapData) {
  if(!element.mapId||!element.regionIds)return element;
  const mapElement=elements.find(candidate=>candidate.kind==='map'&&candidate.mapId===element.mapId);
  const map=data.maps[element.mapId as MapId];
  const location=map?.locations.find(candidate=>candidate.id===element.regionIds);
  if(!mapElement||!map||!location)return element;
  const [viewX,viewY,viewWidth,viewHeight]=map.viewBox;
  const displayWidth=safeNumber(mapElement.width),displayHeight=safeNumber(mapElement.height);
  const scale=Math.min(displayWidth/viewWidth,displayHeight/viewHeight);
  const offsetX=(displayWidth-viewWidth*scale)/2;
  const offsetY=(displayHeight-viewHeight*scale)/2;
  return {...element,
    x:safeNumber(mapElement.x)+offsetX+(location.center[0]-viewX)*scale,
    y:safeNumber(mapElement.y)+offsetY+(location.center[1]-viewY)*scale,
  };
}

function specimenCalloutTarget(element:IllustrationElement,elements:IllustrationElement[]) {
  if(!element.specimenId||!element.regionIds)return element;
  const specimenElement=elements.find(candidate=>candidate.kind==='specimen'&&candidate.specimenId===element.specimenId);
  const specimen=specimenCatalog[element.specimenId as SpecimenId];
  const region=specimen?.regions.find(candidate=>candidate.id===element.regionIds);
  if(!specimenElement||!specimen||!region)return element;
  const [viewX,viewY,viewWidth,viewHeight]=specimen.viewBox;
  const displayWidth=safeNumber(specimenElement.width),displayHeight=safeNumber(specimenElement.height);
  const scale=Math.min(displayWidth/viewWidth,displayHeight/viewHeight);
  const offsetX=(displayWidth-viewWidth*scale)/2;
  const offsetY=(displayHeight-viewHeight*scale)/2;
  return {...element,
    x:safeNumber(specimenElement.x)+offsetX+(region.center[0]-viewX)*scale,
    y:safeNumber(specimenElement.y)+offsetY+(region.center[1]-viewY)*scale,
  };
}

function anatomyCalloutTarget(element:IllustrationElement,elements:IllustrationElement[]) {
  if(!element.anatomyId||!element.regionIds)return element;
  const anatomyElement=elements.find(candidate=>candidate.kind==='anatomy'&&candidate.anatomyId===element.anatomyId);
  const plate=anatomyCatalog[element.anatomyId as AnatomyId];
  const region=plate?.regions.find(candidate=>candidate.id===element.regionIds);
  if(!anatomyElement||!plate||!region)return element;
  const [viewX,viewY,viewWidth,viewHeight]=plate.viewBox;
  const displayWidth=safeNumber(anatomyElement.width),displayHeight=safeNumber(anatomyElement.height);
  const scale=Math.min(displayWidth/viewWidth,displayHeight/viewHeight);
  const offsetX=(displayWidth-viewWidth*scale)/2;
  const offsetY=(displayHeight-viewHeight*scale)/2;
  return {...element,
    x:safeNumber(anatomyElement.x)+offsetX+(region.center[0]-viewX)*scale,
    y:safeNumber(anatomyElement.y)+offsetY+(region.center[1]-viewY)*scale,
  };
}

function IllustrationCalloutLeader({layout,markerId}:{layout:IllustrationCalloutLayout;markerId:string}) {
  const {anchorX,anchorY,targetX,targetY}=straightLeaderCoordinates(layout);
  return <g className='illustration-callout-leader' aria-hidden='true'>
    <line x1={anchorX} y1={anchorY} x2={targetX} y2={targetY} stroke='#ffffff' strokeWidth='5.5' vectorEffect='non-scaling-stroke' strokeLinecap='round'/>
    <line x1={anchorX} y1={anchorY} x2={targetX} y2={targetY} stroke='#334155' strokeWidth='2' vectorEffect='non-scaling-stroke' strokeLinecap='round' markerEnd={`url(#${markerId})`}/>
  </g>;
}
function IllustrationCalloutLabel({layout}:{layout:IllustrationCalloutLayout}) {
  const {element,side,boxX,boxY,boxWidth,boxHeight,lines}=layout;
  const colour=safeColour(element.stroke,'#475569');
  const boxFill=element.fill==='none'?'#ffffff':safeColour(element.fill,'#ffffff');
  const textX=side==='left'?boxX+12:boxX+boxWidth-12;
  return <g className='illustration-callout illustration-callout-label'>
    <rect x={boxX} y={boxY} width={boxWidth} height={boxHeight} rx='10' fill={boxFill} fillOpacity='.98' stroke={colour} strokeWidth='1.35' vectorEffect='non-scaling-stroke' filter='url(#label-shadow)'/>
    <text x={textX} y={boxY+boxHeight/2-(lines.length-1)*8+4.5} fill='#0f172a' fontSize='13' textAnchor={side==='left'?'start':'end'} fontFamily='Inter, Arial, sans-serif' fontWeight='650'>
      {lines.map((line,index)=><tspan key={`${line}-${index}`} x={textX} dy={index===0?0:16}>{line}</tspan>)}
    </text>
  </g>;
}
export function LessonIllustrationView({illustration,index}:{illustration:LessonIllustration;index:number}) {
  const markerId=`lesson-arrow-${index}`;
  const leaderMarkerId=`lesson-label-arrow-${index}`;
  const titleId=`lesson-illustration-title-${index}`;
  const descriptionId=`lesson-illustration-description-${index}`;
  const drawingElements=illustration.elements.filter(element=>!['text','callout','map','specimen','anatomy'].includes(element.kind));
  const textElements=illustration.elements.filter(element=>element.kind==='text');
  const mapElements=illustration.elements.filter(element=>element.kind==='map');
  const specimenElements=illustration.elements.filter(element=>element.kind==='specimen'&&element.specimenId);
  const anatomyElements=illustration.elements.filter(element=>element.kind==='anatomy'&&element.anatomyId);
  const mapKey=mapElements.map(element=>element.mapId).join(',');
  const [loadedMaps,setLoadedMaps]=useState<EducationalMapData|null>(null);
  useEffect(()=>{
    let live=true;
    if(!mapKey){setLoadedMaps(null);return()=>{live=false;};}
    import('../shared/map-data.generated.json')
      .then(module=>{if(live)setLoadedMaps(module.default as EducationalMapData);})
      .catch(()=>{if(live)setLoadedMaps(null);});
    return()=>{live=false;};
  },[mapKey]);
  const calloutElements=illustration.elements.filter(element=>element.kind==='callout')
    .filter(element=>!element.mapId||loadedMaps)
    .map(element=>element.mapId&&loadedMaps?mapCalloutTarget(element,illustration.elements,loadedMaps)
      :element.specimenId?specimenCalloutTarget(element,illustration.elements)
        :element.anatomyId?anatomyCalloutTarget(element,illustration.elements):element);
  const preparedLabels=prepareIllustrationLabels(calloutElements,textElements,{width:DIAGRAM_WIDTH});
  const internalLabels=positionInternalLabels(preparedLabels.internalTexts);
  const callouts=positionIllustrationCallouts(preparedLabels.callouts,{width:DIAGRAM_WIDTH,height:DIAGRAM_HEIGHT});
  return <figure className='lesson-illustration' aria-label={illustration.title}>
    <figcaption><strong id={titleId}>{illustration.title}</strong><span id={descriptionId}>{illustration.description}</span></figcaption>
    <div className='lesson-illustration-canvas'>
      <svg viewBox={`0 0 ${DIAGRAM_WIDTH} ${DIAGRAM_HEIGHT}`} role='img' aria-labelledby={`${titleId} ${descriptionId}`} preserveAspectRatio='xMidYMid meet'>
        <defs>
          <marker id={markerId} markerWidth='10' markerHeight='10' refX='9' refY='3' orient='auto' markerUnits='strokeWidth'><path d='M0,0 L0,6 L9,3 z' fill='#475569'/></marker>
          <marker id={leaderMarkerId} viewBox='0 0 8 8' markerWidth='7' markerHeight='7' refX='7.3' refY='4' orient='auto' markerUnits='strokeWidth'><path d='M0,0 L8,4 L0,8 z' fill='#334155'/></marker>
          <filter id='label-shadow' x='-20%' y='-30%' width='140%' height='160%'><feDropShadow dx='0' dy='2' stdDeviation='3' floodColor='#0f172a' floodOpacity='.12'/></filter>
        </defs>
        <rect x='1' y='1' width={DIAGRAM_WIDTH-2} height={DIAGRAM_HEIGHT-2} rx='18' fill='#ffffff' stroke='#dbe4ee' strokeWidth='2'/>
        {drawingElements.map((element,elementIndex)=><IllustrationShape key={`shape-${elementIndex}`} element={element} markerId={markerId}/>) }
        {loadedMaps&&mapElements.map((element,elementIndex)=><IllustrationMap key={`map-${elementIndex}`} element={element} data={loadedMaps}/>) }
        {specimenElements.map((element,elementIndex)=><SpecimenIllustration key={`specimen-${elementIndex}`} specimenId={element.specimenId as SpecimenId} x={safeNumber(element.x)} y={safeNumber(element.y)} width={safeNumber(element.width)} height={safeNumber(element.height)} instanceId={`${index}-${elementIndex}`}/>) }
        {anatomyElements.map((element,elementIndex)=><AnatomyIllustration key={`anatomy-${elementIndex}`} anatomyId={element.anatomyId as AnatomyId} x={safeNumber(element.x)} y={safeNumber(element.y)} width={safeNumber(element.width)} height={safeNumber(element.height)}/>) }
        {!loadedMaps&&mapElements.length>0&&<text x={DIAGRAM_WIDTH/2} y={DIAGRAM_HEIGHT/2} textAnchor='middle' fill='#64748b' fontFamily='Inter, Arial, sans-serif' fontSize='15'>Loading geographic boundary map...</text>}
        {callouts.map((layout,elementIndex)=><IllustrationCalloutLeader key={`leader-${layout.side}-${elementIndex}`} layout={layout} markerId={leaderMarkerId}/>) }
        {internalLabels.map((layout,elementIndex)=><IllustrationInternalLabel key={`text-${elementIndex}`} layout={layout}/>) }
        {callouts.map((layout,elementIndex)=><IllustrationCalloutLabel key={`callout-${layout.side}-${elementIndex}`} layout={layout}/>) }
      </svg>
    </div>
    {loadedMaps&&mapElements.length>0&&<p className='map-attribution'>Map boundaries: <a href={loadedMaps.attribution.url} target='_blank' rel='noreferrer'>{loadedMaps.attribution.name}</a> (<a href={loadedMaps.attribution.licenseUrl} target='_blank' rel='noreferrer'>{loadedMaps.attribution.license}</a>). {loadedMaps.attribution.notice}</p>}
    {anatomyElements.map(element=>anatomyCatalog[element.anatomyId as AnatomyId]).filter(Boolean).map(plate=><p className='map-attribution anatomy-attribution' key={plate.asset}>Anatomy plate: <a href={plate.source.url} target='_blank' rel='noreferrer'>{plate.source.name}</a>. {plate.source.credit}; {plate.source.license}.</p>)}
  </figure>;
}

type Props = {
  profile:string; year:number; subjectId:string; subjectName:string;
  records:Record<string,NoteRecord>; onSave:(record:NoteRecord)=>void;
  onClose:()=>void; onRequestAccess:()=>void; initialTopicId?:string;
};
type LessonResponse = { notes?:Notes; provenance:string; complete:boolean; part?:number; content?:Partial<Notes> };
const pending = new Map<string,Promise<{data:LessonResponse}>>();
function lessonRequest(payload:Record<string,unknown>) {
  const key=JSON.stringify(payload);
  const current=pending.get(key);
  if(current)return current;
  const promise=api.post('/api/lesson-notes',payload) as Promise<{data:LessonResponse}>;
  pending.set(key,promise);
  promise.then(()=>pending.delete(key),()=>pending.delete(key));
  return promise;
}
function serviceMessage(e:unknown,fallback:string) {
  const value=e as {response?:{data?:{error?:string;message?:string}};responseText?:string;message?:string};
  const message=value?.response?.data?.error || value?.response?.data?.message;
  if(typeof message==='string')return message;
  try {
    const body=JSON.parse(value?.responseText||'{}');
    if(typeof body.error==='string')return body.error;
    if(typeof body.message==='string')return body.message;
  }catch { /* Keep a clear fallback for transport errors. */ }
  return fallback;
}
export default function NotesReader(p:Props) {
  const {user,loading:authLoading,refresh}=useAuth();
  const [plan,setPlan]=useState<Plan|null>(null);
  const [planError,setPlanError]=useState('');
  const [planRetry,setPlanRetry]=useState(0);
  const [topic,setTopic]=useState<Topic|null>(null);
  const [search,setSearch]=useState('');
  const [term,setTerm]=useState('All');
  const [notes,setNotes]=useState<Notes|null>(null);
  const [provenance,setProvenance]=useState('');
  const [notesError,setNotesError]=useState('');
  const [accessRequired,setAccessRequired]=useState(false);
  const [preparation,setPreparation]=useState(0);
  const [noteRetry,setNoteRetry]=useState(0);
  const [answers,setAnswers]=useState<Record<number,number>>({});
  const [submitted,setSubmitted]=useState(false);
  const [validation,setValidation]=useState('');
  const context={profile:p.profile,year:p.year,subjectId:p.subjectId};
  const id=topic?[p.profile,p.year,p.subjectId,topic.id].join(':'):'';
  const record=p.records[id];
  const classLabel=p.profile.startsWith('ng')?(p.year<=9?'JSS '+(p.year-6):'SS '+(p.year-9)):'Year '+p.year;
  useEffect(()=>{void refresh();},[refresh]);
  useEffect(()=>{
    let live=true;
    setPlan(null);setPlanError('');setTopic(null);
    api.post('/api/class-plan',context).then(r=>{
      if(!live)return;
      const result=r.data as Plan;
      if(!Array.isArray(result.topics)||!result.topics.length)throw Error('Invalid topic plan');
      setPlan(result);
      if(p.initialTopicId)setTopic(result.topics.find(t=>t.id===p.initialTopicId)||null);
    }).catch(e=>{if(live)setPlanError(serviceMessage(e,'The class topic plan could not be loaded. Please check your connection and retry.'));});
    return ()=>{live=false;};
  },[p.profile,p.year,p.subjectId,planRetry]);
  useEffect(()=>{
    let live=true;
    setNotes(null);setNotesError('');setAccessRequired(false);setPreparation(0);setAnswers({});setSubmitted(false);setValidation('');
    const selected=topic;
    async function load() {
      if(!selected)return;
      if(authLoading)return;
      const cacheKey=['learnbridge-full-note-v8-coverage6-relevance1',p.profile,p.year,p.subjectId,selected.id].join(':');
      try {
        const cached=JSON.parse(localStorage.getItem(cacheKey)||'null') as {notes:Notes;provenance:string;rendererVersion?:number;cachedAt?:number}|null;
        if(cached?.notes?.sections?.length && cached.notes.quiz?.length && cached.notes.illustrationVersion===6
          && cached.rendererVersion===ILLUSTRATION_RENDERER_VERSION && typeof cached.cachedAt==='number'
          && Date.now()-cached.cachedAt<LESSON_BROWSER_CACHE_MS) {
          if(live){setNotes(cached.notes);setProvenance(cached.provenance);}
          return;
        }
      }catch { /* A blocked browser cache must not prevent server loading. */ }
      try {
        for(let part=0;part<4;part++) {
          if(!live)return;
          setPreparation(part);
          const {data:result}=await lessonRequest({...context,topicId:selected.id,part});
          if(!live)return;
          if(result.notes && result.complete!==false) {
            if(!result.notes.sections?.length || !result.notes.quiz?.length)throw Error('Incomplete notes response');
            let finalNotes=result.notes.illustrationVersion===6
              ? result.notes
              : {...result.notes,illustrations:undefined,illustrationStatus:undefined,illustrationVersion:undefined};
            if(finalNotes.illustrationVersion!==6) {
              try {
                const illustrationResponse=await api.post('/api/lesson-illustrations',{...context,topicId:selected.id}) as {data:{illustrations?:Notes['illustrations'];illustrationStatus?:Notes['illustrationStatus'];illustrationVersion?:6}};
                finalNotes={...finalNotes,illustrations:illustrationResponse.data.illustrations||[],illustrationStatus:illustrationResponse.data.illustrationStatus||'not-needed',illustrationVersion:6};
              }catch { /* An illustration failure must not hide the complete lesson text. */ }
            }
            if(!live)return;
            setNotes(finalNotes);setProvenance(result.provenance);
            try {localStorage.setItem(cacheKey,JSON.stringify({notes:finalNotes,provenance:result.provenance,rendererVersion:ILLUSTRATION_RENDERER_VERSION,cachedAt:Date.now()}));}catch { /* Backend cache remains available. */ }
            return;
          }
          if(result.part!==part || !result.content)throw Error('Incomplete lesson section response');
        }
        throw Error('The lesson is not complete yet. Retry to finish the saved sections.');
      }catch(e){
        const code=(e as ApiError)?.response?.data?.code;
        if(live&&code==='LICENSE_REQUIRED')setAccessRequired(true);
        else if(live)setNotesError(serviceMessage(e,'Lesson preparation could not finish. Retry to resume from saved sections. If your connection is slow, keep the lesson open while it prepares.'));
      }
    }
    void load();
    return ()=>{live=false;};
  },[p.profile,p.year,p.subjectId,topic?.id,noteRetry,authLoading,user?.id,user?.entitlement.active]);
  function save(changes:Partial<NoteRecord>) {
    if(!topic)return;
    p.onSave({...record,...changes,id,profile:p.profile,year:p.year,subjectId:p.subjectId,topic,
      read:changes.read??record?.read??false,bookmarked:changes.bookmarked??record?.bookmarked??false});
  }
  function score() {
    if(!notes)return;
    if(notes.quiz.some((_,i)=>answers[i]===undefined)){setValidation('Answer every checkpoint question before checking.');return;}
    const next=Math.round(notes.quiz.filter((q,i)=>answers[i]===q.answer).length/notes.quiz.length*100);
    save({score:Math.max(record?.score||0,next)});setSubmitted(true);setValidation('');
  }
  const filtered=plan?.topics.filter(t=>(term==='All'||String(t.term)===term)&&t.title.toLowerCase().includes(search.toLowerCase()))||[];
  const index=plan?.topics.findIndex(t=>t.id===topic?.id)??-1;
  return <div className='modal-overlay notes-overlay'><section role='dialog' aria-modal='true' aria-labelledby='notes-heading' className='lesson-modal notes-modal'>
    <div className='modal-header'><span>{p.subjectName} {classLabel}</span><button className='icon-button' aria-label='Close subject' onClick={p.onClose}><X/></button></div>
    <div className='lesson-body'>
      <div className='notes-top'><div><span className='eyebrow'>{topic?'FULL LESSON NOTES':'CLASS TOPIC PLAN'}</span><h2 id='notes-heading'>{topic?topic.title:p.subjectName+' '+classLabel}</h2></div>{topic&&<button className='outline' onClick={()=>setTopic(null)}>All topics</button>}</div>
      {!plan&&!planError&&<div className='content-loading' role='status'><BookOpen/><p>Preparing the detailed topic plan for {classLabel}...</p><small>The first preparation may take a little time. Saved plans load faster.</small></div>}
      {planError&&<div className='notice' role='alert'><p>{planError}</p><button className='primary' onClick={()=>setPlanRetry(x=>x+1)}>Retry topic plan</button></div>}
      {plan&&!topic&&<>
        <div className='notice-neutral'><strong>{plan.topics.length} detailed topics for {classLabel}</strong><p>{plan.provenance}. Term grouping is a suggested study sequence; your school's scheme of work may differ.</p></div>
        <div className='topic-tools'><label className='search'><Search size={16}/><input aria-label='Search class topics' placeholder='Find a specific topic' value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label='Term filter' value={term} onChange={e=>setTerm(e.target.value)}><option value='All'>All terms</option>{[1,2,3].map(t=><option key={t} value={t}>Term {t}</option>)}</select></div>
        {!filtered.length&&<p className='notice-neutral'>No matching topics. <button className='text-button' onClick={()=>{setSearch('');setTerm('All');}}>Clear topic filters</button></p>}
        {[1,2,3].map(t=>filtered.some(x=>x.term===t)&&<section className='term-block' key={t}><h3>Suggested Term {t}</h3><div className='lesson-picker'>{filtered.filter(x=>x.term===t).map(x=>{
          const r=p.records[[p.profile,p.year,p.subjectId,x.id].join(':')];
          const canOpen=x.id==='t1'||user?.role==='super_admin'||user?.entitlement.active;
          return <button key={x.id} onClick={()=>setTopic(x)}><span>{x.title}<small>{x.id==='t1'?'Public sample lesson':canOpen?'Open full notes - examples - practice':'Subscription or school licence required'}{r?.read?' - Read':''}{r?.score!==undefined?' - Best '+r.score+'%':''}</small></span>{canOpen?<ChevronRight size={18}/>:<Lock size={16}/>}</button>;
        })}</div></section>)}
      </>}
      {plan&&topic&&<>
        <div className='topic-pagination'><button className='outline' disabled={index<=0} onClick={()=>setTopic(plan.topics[index-1])}>Previous topic</button><span>{index+1} of {plan.topics.length}</span><button className='outline' disabled={index>=plan.topics.length-1} onClick={()=>setTopic(plan.topics[index+1])}>Next topic</button></div>
        {!notes&&!notesError&&!accessRequired&&<div className='content-loading' role='status'><BookOpen/><p>Preparing lesson section {preparation+1} of 4...</p><small>{['Learning objectives, key terms and foundations','Detailed explanations and common mistakes','Worked examples and lesson summary','Practice questions, model answers and checkpoint'][preparation]} - {classLabel}. Completed sections are saved so a retry can resume.</small></div>}
        {accessRequired&&<div className='access-gate' role='status'><span><Lock size={24}/></span><h3>Choose a package to open this lesson</h3><p>Topic 1 in every subject is a public sample. Full notes are available through an active individual or family subscription, school pilot or school licence.</p><button className='primary' onClick={p.onRequestAccess}>{user?'Open my dashboard':'View packages and sign in'}</button></div>}
        {notesError&&<div className='notice' role='alert'><p>{notesError}</p><button className='primary' onClick={()=>setNoteRetry(x=>x+1)}>Retry lesson notes</button></div>}
        {notes&&<div className='full-notes'>
          {provenance && !/\b(?:ai|artificial intelligence|openai|azure)\b/i.test(provenance) && <p className='content-provenance'>{provenance}</p>}
          <div className='notes-actions'><button className='outline' onClick={()=>save({bookmarked:!record?.bookmarked})}><Bookmark size={14}/>{record?.bookmarked?'Remove bookmark':'Save bookmark'}</button><button className='outline' onClick={()=>save({read:true})}>{record?.read?'Lesson marked as read':'Mark as read'}</button><button className='outline' onClick={()=>window.print()}>Print notes</button></div>
          <section className='objectives'><h3>Learning objectives</h3><ul>{notes.objectives.map(s=><li key={s}><MathText text={s}/></li>)}</ul></section>
          <section><h3>Key terms</h3><dl>{notes.keyTerms.map(k=><div key={k.term}><dt><MathText text={k.term}/></dt><dd><MathText text={k.definition}/></dd></div>)}</dl></section>
          {notes.illustrations&&notes.illustrations.length>0&&<section className='lesson-illustrations'><h3>Textbook diagrams</h3><p>Study these accurate, labelled diagrams alongside the lesson explanation.</p>{notes.illustrations.map((illustration,index)=><LessonIllustrationView key={`${illustration.title}-${index}`} illustration={illustration} index={index}/>)}</section>}
          {notes.sections.map(s=><section key={s.heading}><h3><MathText text={s.heading}/></h3>{s.paragraphs.map((text,i)=><p key={i}><MathText text={text}/></p>)}</section>)}
          <section><h3>Worked examples</h3>{notes.examples.map(e=><div className='worked-example' key={e.title}><h4><MathText text={e.title}/></h4><ol>{e.steps.map((step,i)=><li key={i}><MathText text={step}/></li>)}</ol></div>)}</section>
          <section className='objectives'><h3>Lesson summary</h3><ul>{notes.summary.map(s=><li key={s}><MathText text={s}/></li>)}</ul></section>
          <section><h3>Practice questions</h3><p>Try each question before opening its model answer.</p>{notes.exercises.map((e,i)=><div className='practice-question' key={i}><strong>{i+1}. <MathText text={e.question}/></strong><details><summary>Show model answer</summary><p><MathText text={e.answer}/></p><p><MathText text={e.explanation}/></p></details></div>)}</section>
          <section className='checkpoint'><h3>Knowledge checkpoint</h3>{notes.quiz.map((q,i)=><div className='checkpoint-question' key={i}><p><strong>{i+1}. <MathText text={q.question}/></strong></p><div className='answers'>{q.choices.map((choice,j)=><button key={j} disabled={submitted} aria-pressed={answers[i]===j} className={answers[i]===j?'answer selected':'answer'} onClick={()=>{setAnswers(a=>({...a,[i]:j}));setValidation('');}}><span>{String.fromCharCode(65+j)}</span><MathText text={choice}/></button>)}</div>{submitted&&<div className={answers[i]===q.answer?'feedback correct':'feedback'}><strong>{answers[i]===q.answer?'Correct':'Review this answer'}</strong><p>Correct answer: <MathText text={q.choices[q.answer]}/></p><p><MathText text={q.explanation}/></p></div>}</div>)}
          {validation&&<p className='validation' role='alert'>{validation}</p>}{submitted?<><p className='notice-neutral'>Checkpoint score: {Math.round(notes.quiz.filter((q,i)=>answers[i]===q.answer).length/notes.quiz.length*100)}% - Best saved score: {record?.score}%</p><button className='primary' onClick={()=>{setSubmitted(false);setAnswers({});}}>Try again</button></>:<button className='primary' onClick={score}>Check answers</button>}
          </section>
        </div>}
      </>}
    </div>
  </section></div>;
}

