export type MathSegment={type:'text'|'math'|'chemistry';value:string;display:boolean};
export function cleanEducationalText(value:unknown):string;
export function normalizeChemicalMath(value:unknown):string;
export function isChemicalEquation(value:unknown):boolean;
export function splitMathText(value:unknown):MathSegment[];
export function renderMathML(value:string,display?:boolean):string;
