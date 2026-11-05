import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nigeria from '@svg-maps/nigeria';
import world from '@svg-maps/world';
import pathBounds from 'svg-path-bounds';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const africaIds='dz ao bj bw bf bi cv cm cf td km cd cg ci dj eg gq er sz et ga gm gh gn gw ke ls lr ly mg mw ml mr mu ma mz na ne ng rw st sn sc sl so za ss sd tz tg tn ug zm zw eh'.split(' ');
const westAfricaIds='bj bf cv ci gm gh gn gw lr ml mr ne ng sn sl tg'.split(' ');

function clean(value) { return Math.round(value*1000)/1000; }
function buildMap(id,label,source,locations) {
  const prepared=locations.map(location=>{
    const [left,top,right,bottom]=pathBounds(location.path);
    return {
      id:location.id,
      name:location.name,
      path:location.path,
      center:[clean((left+right)/2),clean((top+bottom)/2)],
      bounds:[clean(left),clean(top),clean(right),clean(bottom)],
    };
  });
  const left=Math.min(...prepared.map(location=>location.bounds[0]));
  const top=Math.min(...prepared.map(location=>location.bounds[1]));
  const right=Math.max(...prepared.map(location=>location.bounds[2]));
  const bottom=Math.max(...prepared.map(location=>location.bounds[3]));
  const padding=Math.max(right-left,bottom-top)*.035;
  return {
    id,label,source,
    viewBox:[clean(left-padding),clean(top-padding),clean(right-left+padding*2),clean(bottom-top+padding*2)],
    locations:prepared,
  };
}

const worldLocations=new Map(world.locations.map(location=>[location.id,location]));
const selectWorld=ids=>ids.map(id=>worldLocations.get(id)).filter(Boolean);
const output={
  version:1,
  attribution:{
    name:'SVG Maps / MapSVG',
    url:'https://github.com/VictorCazanave/svg-maps',
    license:'CC BY 4.0',
    licenseUrl:'https://creativecommons.org/licenses/by/4.0/',
    notice:'Boundary data are provided for educational use and are not an official legal authority.',
  },
  maps:{
    nigeria:buildMap('nigeria','Nigeria: states and FCT','@svg-maps/nigeria',nigeria.locations),
    africa:buildMap('africa','Africa: countries','@svg-maps/world',selectWorld(africaIds)),
    'west-africa':buildMap('west-africa','West Africa: countries','@svg-maps/world',selectWorld(westAfricaIds)),
  },
};

await writeFile(path.join(root,'shared','map-data.generated.json'),`${JSON.stringify(output)}\n`,'utf8');
console.log(`Generated ${Object.keys(output.maps).length} real map templates with ${Object.values(output.maps).reduce((sum,map)=>sum+map.locations.length,0)} boundary regions.`);
