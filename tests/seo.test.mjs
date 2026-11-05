import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root=new URL('../',import.meta.url);

test('SEO routes are crawlable while private pages remain noindex',async()=>{
  const [seo,nginx,generator]=await Promise.all([
    readFile(new URL('src/seo.ts',root),'utf8'),
    readFile(new URL('nginx.conf',root),'utf8'),
    readFile(new URL('scripts/generate-seo-pages.mjs',root),'utf8'),
  ]);
  for(const route of ['/class/','/subject/','/sample/'])assert.ok(generator.includes(route),`Missing static route family ${route}`);
  assert.match(generator,/pages\.length!==210/);
  assert.match(generator,/indexable\.length!==204/);
  assert.match(seo,/noindex, nofollow/);
  assert.match(nginx,/X-Robots-Tag "noindex, nofollow"/);
  assert.match(nginx,/error_page 404 \/404\.html/);
});

test('SEO output uses canonical URLs and educational structured data',async()=>{
  const [index,generator]=await Promise.all([
    readFile(new URL('index.html',root),'utf8'),
    readFile(new URL('scripts/generate-seo-pages.mjs',root),'utf8'),
  ]);
  assert.match(index,/rel="canonical" href="https:\/\/learnbridge-app\.com\//);
  assert.match(index,/type="application\/ld\+json"/);
  assert.match(generator,/'@type':'LearningResource'/);
  assert.match(generator,/learningResourceType/);
  assert.doesNotMatch(index,/name="keywords"/i);
});
