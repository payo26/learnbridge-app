import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root=new URL('../',import.meta.url);

test('publishes all three legal routes and footer links',async()=>{
  const [main,app]=await Promise.all([
    readFile(new URL('src/main.tsx',root),'utf8'),
    readFile(new URL('src/App.tsx',root),'utf8'),
  ]);
  for(const path of ['/terms','/privacy','/refunds']) {
    assert.match(main,new RegExp(`['"]${path}['"]`));
    assert.match(app,new RegExp(`href=['"]${path}['"]`));
  }
});

test('legal text covers recurring payments, learner privacy and statutory rights',async()=>{
  const legal=await readFile(new URL('src/LegalPages.tsx',root),'utf8');
  for(const phrase of [
    'renew automatically through Paystack',
    'learner under 18',
    'Nigeria Data Protection Act 2023',
    'Federal Competition and Consumer Protection Act',
    'first consumer subscription cancelled within seven calendar days',
    'does not reduce any refund or remedy required by applicable Nigerian law',
  ])assert.ok(legal.includes(phrase),`Missing legal provision: ${phrase}`);
});
