import { anatomyCatalog } from '../shared/anatomy-catalog.mjs';

export type AnatomyId=keyof typeof anatomyCatalog;

type Props={
  anatomyId:AnatomyId;
  x:number;
  y:number;
  width:number;
  height:number;
};

export default function AnatomyIllustration({anatomyId,x,y,width,height}:Props) {
  const plate=anatomyCatalog[anatomyId];
  if(!plate)return null;
  const [viewX,viewY,viewWidth,viewHeight]=plate.viewBox;
  return <svg
    className='illustration-anatomy'
    data-anatomy-id={anatomyId}
    x={x}
    y={y}
    width={width}
    height={height}
    viewBox={plate.viewBox.join(' ')}
    preserveAspectRatio='xMidYMid meet'
    overflow='visible'
    aria-label={plate.label}
  >
    <title>{plate.label}</title>
    <rect x={viewX} y={viewY} width={viewWidth} height={viewHeight} rx={Math.min(viewWidth,viewHeight)*.025} fill='#ffffff'/>
    <image href={plate.asset} x={viewX} y={viewY} width={viewWidth} height={viewHeight} preserveAspectRatio='xMidYMid meet'/>
  </svg>;
}
