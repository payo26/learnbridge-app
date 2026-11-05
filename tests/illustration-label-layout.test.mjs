import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  isInternalSymbolLabel,
  positionIllustrationCallouts,
  prepareIllustrationLabels,
  straightLeaderCoordinates,
} from '../src/illustration-label-layout.mjs';

function element(kind, overrides = {}) {
  return {
    kind, x:0, y:0, x2:0, y2:0, width:0, height:0, points:'', label:'',
    fill:'none', stroke:'#475569', strokeWidth:2, fontSize:14, mapId:'', specimenId:'', anatomyId:'', regionIds:'',
    ...overrides,
  };
}

test('keeps compact notation internal and promotes descriptive names', () => {
  assert.equal(isInternalSymbolLabel('N'), true);
  assert.equal(isInternalSymbolLabel('Na'), true);
  assert.equal(isInternalSymbolLabel('25°C'), true);
  assert.equal(isInternalSymbolLabel('e⁻'), true);
  assert.equal(isInternalSymbolLabel('p⁺'), true);
  assert.equal(isInternalSymbolLabel('Nucleus'), false);
  assert.equal(isInternalSymbolLabel('Cell wall'), false);

  const existing = element('callout',{x:430,y:250,x2:790,y2:250,label:'Nucleus',fill:'#ffffff'});
  const descriptive = element('text',{x:300,y:150,label:'Cell wall',fill:'#0f172a'});
  const symbol = element('text',{x:480,y:300,label:'Na',fill:'#0f172a'});
  const prepared = prepareIllustrationLabels([existing],[descriptive,symbol]);

  assert.equal(prepared.callouts.length,2);
  assert.equal(prepared.internalTexts.length,1);
  const promoted=prepared.callouts.find(item=>item.label==='Cell wall');
  assert.deepEqual([promoted.x,promoted.y],[300,150]);
  assert.equal(promoted.fill,'#ffffff');
});

test('orders each label column by target and never overlaps its boxes', () => {
  const callouts=[
    element('callout',{x:320,y:430,x2:170,y2:80,label:'Bottom feature'}),
    element('callout',{x:330,y:110,x2:170,y2:500,label:'Top feature'}),
    element('callout',{x:340,y:260,x2:170,y2:300,label:'Middle feature'}),
  ];
  const layouts=positionIllustrationCallouts(callouts);
  assert.deepEqual(layouts.map(layout=>layout.element.y),[110,260,430]);
  for(let index=1;index<layouts.length;index++) {
    assert.ok(layouts[index-1].boxY+layouts[index-1].boxHeight<=layouts[index].boxY);
  }
});

test('straight leaders end exactly at their illustrated feature', () => {
  const [layout]=positionIllustrationCallouts([
    element('callout',{x:365,y:212,x2:170,y2:80,label:'Precise structure'}),
  ]);
  const leader=straightLeaderCoordinates(layout);
  assert.deepEqual([leader.targetX,leader.targetY],[365,212]);
  assert.equal(leader.anchorX,layout.boxX+layout.boxWidth);
  assert.equal(Object.keys(leader).length,4);
});

test('renderer uses direct line leaders and no elbow path', async () => {
  const source=await fs.readFile(new URL('../src/NotesReader.tsx',import.meta.url),'utf8');
  assert.match(source,/function IllustrationCalloutLeader/);
  assert.ok(source.includes('markerEnd={`url(#${markerId})`}'));
  assert.doesNotMatch(source,/elbowX/);
});
