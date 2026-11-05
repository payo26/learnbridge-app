import { specimenCatalog, type SpecimenId } from '../shared/specimen-catalog.mjs';

type Props={
  specimenId:SpecimenId;
  x:number;
  y:number;
  width:number;
  height:number;
  instanceId:string;
};

const lineProps={vectorEffect:'non-scaling-stroke' as const,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};

function FloweringPlant({id}:{id:string}) {
  const leaf=(transform:string)=><path d='M0 0 C18 -20 45 -18 58 -4 C38 10 15 13 0 0 Z' fill={`url(#${id}-leaf)`} stroke='#166534' strokeWidth='2.2' transform={transform} {...lineProps}/>;
  return <>
    <defs>
      <linearGradient id={`${id}-stem`} x1='0' y1='0' x2='1' y2='0'><stop stopColor='#15803d'/><stop offset='.52' stopColor='#4ade80'/><stop offset='1' stopColor='#166534'/></linearGradient>
      <linearGradient id={`${id}-leaf`} x1='0' y1='0' x2='1' y2='1'><stop stopColor='#86efac'/><stop offset='.48' stopColor='#22c55e'/><stop offset='1' stopColor='#15803d'/></linearGradient>
      <radialGradient id={`${id}-fruit`} cx='.35' cy='.28'><stop stopColor='#fecaca'/><stop offset='.45' stopColor='#ef4444'/><stop offset='1' stopColor='#b91c1c'/></radialGradient>
    </defs>
    <path d='M36 431 C120 421 174 438 239 427 C313 416 369 439 448 428' fill='none' stroke='#9a6b3d' strokeWidth='4' {...lineProps}/>
    <path d='M239 433 C238 355 242 278 240 194 C239 142 246 101 246 73' fill='none' stroke={`url(#${id}-stem)`} strokeWidth='14' {...lineProps}/>
    <path d='M240 290 C206 259 178 241 145 224 M240 245 C279 216 310 194 343 170 M242 197 C211 173 190 151 166 126 M244 151 C276 132 299 115 325 101' fill='none' stroke='#228b45' strokeWidth='8' {...lineProps}/>
    {leaf('translate(146 225) rotate(198)')}{leaf('translate(178 244) rotate(28) scale(.82)')}
    {leaf('translate(337 169) rotate(-19)')}{leaf('translate(300 196) rotate(154) scale(.88)')}
    {leaf('translate(167 126) rotate(201) scale(.9)')}{leaf('translate(198 154) rotate(22) scale(.72)')}
    {leaf('translate(325 101) rotate(-26) scale(.8)')}{leaf('translate(294 124) rotate(147) scale(.7)')}
    {leaf('translate(240 327) rotate(168) scale(.78)')}{leaf('translate(244 357) rotate(-8) scale(.75)')}
    <g transform='translate(246 57)'>
      <ellipse cx='0' cy='-16' rx='13' ry='25' fill='#f472b6' stroke='#9d174d' strokeWidth='2'/><ellipse cx='0' cy='16' rx='13' ry='25' fill='#fb7185' stroke='#9d174d' strokeWidth='2'/>
      <ellipse cx='-17' cy='0' rx='25' ry='13' fill='#f9a8d4' stroke='#9d174d' strokeWidth='2'/><ellipse cx='17' cy='0' rx='25' ry='13' fill='#fda4af' stroke='#9d174d' strokeWidth='2'/>
      <ellipse cx='-12' cy='-12' rx='17' ry='12' transform='rotate(45 -12 -12)' fill='#fbcfe8'/><ellipse cx='12' cy='-12' rx='17' ry='12' transform='rotate(-45 12 -12)' fill='#fecdd3'/>
      <circle r='10' fill='#facc15' stroke='#a16207' strokeWidth='2'/><circle r='3' fill='#854d0e'/>
    </g>
    <path d='M327 102 C331 92 337 84 343 80' fill='none' stroke='#15803d' strokeWidth='5' {...lineProps}/><path d='M331 116 C326 104 329 92 341 83 C351 96 348 109 331 116 Z' fill='#86efac' stroke='#166534' strokeWidth='2'/>
    <path d='M169 268 C167 255 174 246 183 239' fill='none' stroke='#166534' strokeWidth='4' {...lineProps}/><circle cx='167' cy='288' r='24' fill={`url(#${id}-fruit)`} stroke='#991b1b' strokeWidth='2.5'/><path d='M158 266 Q167 257 178 268' fill='#16a34a' stroke='#166534' strokeWidth='2'/>
    <circle cx='240' cy='245' r='8' fill='#166534'/>
    <path d='M239 432 C239 468 241 503 240 542 M236 452 C214 468 198 486 188 516 M240 465 C270 478 292 501 303 531 M239 486 C217 500 212 520 207 541 M241 501 C264 509 274 526 282 545 M220 469 C200 462 184 465 166 475 M270 481 C296 471 319 474 344 488 M296 504 C319 501 340 508 361 522 M194 495 C169 491 150 499 130 511' fill='none' stroke='#9a5f32' strokeWidth='6' {...lineProps}/>
    <path d='M344 488 l28 -10 M342 496 l32 2 M348 507 l29 10 M355 518 l24 18 M166 475 l-28 -11 M153 486 l-29 3 M143 501 l-25 13 M132 511 l-18 20' fill='none' stroke='#b77943' strokeWidth='2.5' {...lineProps}/>
    <path d='M165 224 Q190 214 213 228 M337 169 Q312 160 292 179 M167 126 Q190 119 210 134 M325 101 Q302 96 284 111' fill='none' stroke='#bbf7d0' strokeWidth='1.4' opacity='.9' {...lineProps}/>
  </>;
}

function Goat({id}:{id:string}) {
  return <>
    <defs><linearGradient id={`${id}-coat`} x1='0' y1='0' x2='0' y2='1'><stop stopColor='#f8fafc'/><stop offset='.55' stopColor='#e7e5e4'/><stop offset='1' stopColor='#cbd5e1'/></linearGradient></defs>
    <ellipse cx='335' cy='358' rx='205' ry='10' fill='#cbd5e1' opacity='.45'/>
    <path d='M187 130 C237 104 365 102 433 124 C466 135 477 166 466 203 C455 238 424 250 382 247 L265 244 C224 243 195 224 185 193 C177 168 177 146 187 130 Z' fill={`url(#${id}-coat)`} stroke='#475569' strokeWidth='3' {...lineProps}/>
    <path d='M184 133 C168 116 155 105 144 100 L120 172 C139 179 158 175 177 158 Z' fill='#e7e5e4' stroke='#475569' strokeWidth='3' {...lineProps}/>
    <path d='M145 91 C128 78 103 83 91 101 C76 123 69 145 72 160 C86 174 109 177 127 166 C143 147 151 118 145 91 Z' fill='#f1f5f9' stroke='#475569' strokeWidth='3' {...lineProps}/>
    <path d='M95 84 C87 60 96 40 112 31 C110 55 119 66 125 82' fill='#fef3c7' stroke='#92400e' strokeWidth='3' {...lineProps}/>
    <path d='M122 78 C125 50 142 38 158 40 C149 57 148 71 147 91' fill='#fef3c7' stroke='#92400e' strokeWidth='3' {...lineProps}/>
    <path d='M139 88 C159 75 175 79 183 91 C166 101 150 102 136 96 Z' fill='#d6d3d1' stroke='#475569' strokeWidth='2.5'/>
    <circle cx='113' cy='112' r='7' fill='#ffffff' stroke='#334155' strokeWidth='2'/><circle cx='114' cy='112' r='3.4' fill='#0f172a'/>
    <path d='M72 150 C58 151 50 160 57 170 C70 177 84 173 92 164' fill='#d6d3d1' stroke='#475569' strokeWidth='2.5' {...lineProps}/><ellipse cx='67' cy='162' rx='3.5' ry='2.5' fill='#334155'/>
    <path d='M209 226 C211 264 214 314 218 345 L247 345 C247 305 245 266 250 236 Z M399 235 C405 270 412 315 414 345 L443 345 C446 307 444 265 440 225 Z' fill='#e2e8f0' stroke='#475569' strokeWidth='3' {...lineProps}/>
    <path d='M214 345 Q230 355 249 345 L248 359 L216 359 Z M411 345 Q427 356 445 345 L445 359 L413 359 Z' fill='#475569'/>
    <path d='M464 142 C486 123 507 127 514 141 C502 148 491 159 475 170' fill='none' stroke='#64748b' strokeWidth='10' {...lineProps}/><path d='M508 136 l17 -11' stroke='#475569' strokeWidth='5' {...lineProps}/>
    <path d='M174 155 C195 158 205 175 207 200' fill='none' stroke='#94a3b8' strokeWidth='2'/><path d='M286 126 C304 142 324 145 344 128' fill='none' stroke='#cbd5e1' strokeWidth='3'/>
  </>;
}

function Bird({id}:{id:string}) {
  return <>
    <defs><linearGradient id={`${id}-bird`} x1='0' y1='0' x2='1' y2='1'><stop stopColor='#bae6fd'/><stop offset='.5' stopColor='#38bdf8'/><stop offset='1' stopColor='#0369a1'/></linearGradient></defs>
    <ellipse cx='300' cy='352' rx='170' ry='9' fill='#cbd5e1' opacity='.4'/>
    <path d='M171 165 C212 126 301 119 376 143 C416 156 439 187 425 220 C404 267 327 286 257 266 C205 252 176 218 171 165 Z' fill={`url(#${id}-bird)`} stroke='#075985' strokeWidth='3' {...lineProps}/>
    <circle cx='139' cy='142' r='55' fill='#7dd3fc' stroke='#075985' strokeWidth='3'/>
    <path d='M88 141 L35 157 L90 169 C97 159 97 149 88 141 Z' fill='#facc15' stroke='#a16207' strokeWidth='2.5' {...lineProps}/>
    <circle cx='127' cy='126' r='8' fill='#fff' stroke='#0f172a' strokeWidth='2'/><circle cx='128' cy='126' r='4' fill='#0f172a'/>
    <path d='M245 157 C303 145 360 172 376 217 C337 228 292 224 255 201 C239 188 234 170 245 157 Z' fill='#0284c7' stroke='#075985' strokeWidth='3'/>
    <path d='M263 170 C298 173 331 188 356 211 M258 182 C289 190 316 205 336 220' fill='none' stroke='#7dd3fc' strokeWidth='2.2' {...lineProps}/>
    <path d='M414 171 L511 133 L463 183 L522 181 L455 213 L416 211 Z' fill='#0c4a6e' stroke='#082f49' strokeWidth='3' {...lineProps}/>
    <path d='M272 265 L276 332 M317 268 L309 332' stroke='#a16207' strokeWidth='7' {...lineProps}/><path d='M275 332 l-19 18 M275 332 l4 20 M275 332 l20 13 M309 332 l-18 18 M309 332 l4 20 M309 332 l21 12' stroke='#a16207' strokeWidth='4' {...lineProps}/>
    <path d='M177 174 C194 182 207 196 214 216' fill='none' stroke='#e0f2fe' strokeWidth='3'/>
  </>;
}

function Fish({id}:{id:string}) {
  const scaleRows=[145,165,185,205,225];
  return <>
    <defs><linearGradient id={`${id}-fish`} x1='0' y1='0' x2='1' y2='1'><stop stopColor='#bfdbfe'/><stop offset='.5' stopColor='#60a5fa'/><stop offset='1' stopColor='#1d4ed8'/></linearGradient></defs>
    <path d='M74 180 C114 106 223 91 348 111 C411 120 450 146 475 180 C446 224 402 248 339 254 C220 265 116 246 74 180 Z' fill={`url(#${id}-fish)`} stroke='#1e3a8a' strokeWidth='3' {...lineProps}/>
    <path d='M470 180 C493 136 522 111 545 105 L526 178 L546 250 C518 242 490 222 470 180 Z' fill='#3b82f6' stroke='#1e3a8a' strokeWidth='3' {...lineProps}/>
    <path d='M246 108 C270 67 315 46 360 57 L342 113 Z M272 249 C297 282 330 302 367 297 L344 250 Z M369 248 C392 276 416 286 438 276 L412 238 Z' fill='#60a5fa' stroke='#1e3a8a' strokeWidth='3' {...lineProps}/>
    <circle cx='132' cy='146' r='14' fill='#fff' stroke='#1e3a8a' strokeWidth='2.5'/><circle cx='134' cy='146' r='6' fill='#0f172a'/>
    <path d='M74 180 Q91 171 105 181' fill='none' stroke='#1e3a8a' strokeWidth='3' {...lineProps}/>
    <path d='M182 127 C158 160 158 204 182 232' fill='none' stroke='#1e40af' strokeWidth='4' {...lineProps}/>
    <path d='M204 206 C228 202 248 213 260 234 C236 241 215 228 204 206 Z' fill='#93c5fd' stroke='#1e3a8a' strokeWidth='2.5'/>
    <path d='M191 186 C269 178 362 181 449 191' fill='none' stroke='#dbeafe' strokeWidth='3' strokeDasharray='8 6' {...lineProps}/>
    {scaleRows.map((row,rowIndex)=><g key={row}>{Array.from({length:6},(_,column)=><path key={column} d={`M ${235+column*30+(rowIndex%2?15:0)} ${row} q 10 -10 20 0 q -10 10 -20 0`} fill='none' stroke='#1e40af' strokeWidth='1.3' opacity='.68'/>)}</g>)}
  </>;
}

export default function SpecimenIllustration({specimenId,x,y,width,height,instanceId}:Props) {
  const specimen=specimenCatalog[specimenId];
  if(!specimen)return null;
  const id=`specimen-${instanceId.replace(/[^a-zA-Z0-9_-]/g,'-')}`;
  return <svg className='illustration-specimen' data-specimen-id={specimenId} x={x} y={y} width={width} height={height} viewBox={specimen.viewBox.join(' ')} preserveAspectRatio='xMidYMid meet' overflow='visible' aria-label={specimen.label}>
    <title>{specimen.label}</title>
    {specimenId==='flowering-plant'&&<FloweringPlant id={id}/>} 
    {specimenId==='goat-external'&&<Goat id={id}/>} 
    {specimenId==='bird-external'&&<Bird id={id}/>} 
    {specimenId==='fish-external'&&<Fish id={id}/>} 
  </svg>;
}
