export type SpecimenId='flowering-plant'|'goat-external'|'bird-external'|'fish-external';
export type SpecimenRegion={id:string;name:string;center:readonly [number,number]};
export type SpecimenTemplate={label:string;viewBox:readonly [number,number,number,number];regions:readonly SpecimenRegion[]};
export const specimenCatalog:Readonly<Record<SpecimenId,SpecimenTemplate>>;
export const specimenPromptCatalog:Record<string,{label:string;regions:{id:string;name:string}[]}>;
