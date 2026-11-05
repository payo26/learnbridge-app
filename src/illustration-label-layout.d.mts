import type { IllustrationElement } from '../shared/notes-types';

export const MAX_CALLOUTS_PER_SIDE: number;
export type IllustrationCalloutLayout = {
  element: IllustrationElement;
  originalIndex: number;
  side: 'left' | 'right';
  boxX: number;
  boxY: number;
  boxWidth: number;
  boxHeight: number;
  lines: string[];
};
export function wrapIllustrationLabel(value:string, maximumCharacters?:number):string[];
export function isInternalSymbolLabel(value:string):boolean;
export function prepareIllustrationLabels(
  calloutElements:IllustrationElement[],
  textElements:IllustrationElement[],
  options?:{width?:number;maxPerSide?:number},
):{callouts:IllustrationElement[];internalTexts:IllustrationElement[]};
export function positionIllustrationCallouts(
  elements:IllustrationElement[],
  options?:{width?:number;height?:number;boxWidth?:number},
):IllustrationCalloutLayout[];
export function straightLeaderCoordinates(layout:IllustrationCalloutLayout):{
  anchorX:number;anchorY:number;targetX:number;targetY:number;
};
