import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import SpecimenIllustration from '../src/SpecimenIllustration';
import { specimenCatalog, type SpecimenId } from '../shared/specimen-catalog.mjs';

const output=resolve(process.cwd(),'specimen-previews');
mkdirSync(output,{recursive:true});

for(const specimenId of Object.keys(specimenCatalog) as SpecimenId[]) {
  const markup=renderToStaticMarkup(<SpecimenIllustration specimenId={specimenId} x={0} y={0} width={960} height={600} instanceId={`preview-${specimenId}`}/>);
  writeFileSync(resolve(output,`${specimenId}.svg`),`<?xml version="1.0" encoding="UTF-8"?>\n${markup}\n`,'utf8');
}

console.log(`Generated ${Object.keys(specimenCatalog).length} specimen SVG previews in ${output}.`);
