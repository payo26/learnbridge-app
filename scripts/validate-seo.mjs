import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [index,robots,nginx,seo,generator,packageJson,vite]=await Promise.all([
  readFile(path.join(root,'index.html'),'utf8'),
  readFile(path.join(root,'public','robots.txt'),'utf8'),
  readFile(path.join(root,'nginx.conf'),'utf8'),
  readFile(path.join(root,'src','seo.ts'),'utf8'),
  readFile(path.join(root,'scripts','generate-seo-pages.mjs'),'utf8'),
  readFile(path.join(root,'package.json'),'utf8').then(JSON.parse),
  readFile(path.join(root,'vite.config.ts'),'utf8'),
]);

const checks=[
  ['page title',/<title>LearnBridge/],
  ['description meta',/<meta name="description" content="[^"]{80,}/],
  ['canonical link',/<link rel="canonical" href="https:\/\/learnbridge-app\.com\//],
  ['robots meta',/<meta name="robots" content="index, follow/],
  ['Open Graph title',/<meta property="og:title"/],
  ['Open Graph image dimensions',/<meta property="og:image:width" content="1200"/],
  ['Twitter card',/<meta name="twitter:card" content="summary_large_image"/],
  ['JSON-LD',/<script id="learnbridge-structured-data" type="application\/ld\+json">/],
  ['static fallback content',/<!--seo-content-start-->[\s\S]+<!--seo-content-end-->/],
];
for(const [label,pattern] of checks)if(!pattern.test(index))throw new Error(`SEO validation failed: missing ${label}.`);
if(/name="keywords"/i.test(index))throw new Error('SEO validation failed: obsolete meta keywords must not be added.');
if(!robots.includes('Disallow: /api/')||!robots.includes('Sitemap: https://learnbridge-app.com/sitemap.xml'))throw new Error('SEO validation failed: robots.txt is incomplete.');
if(!nginx.includes('X-Robots-Tag "noindex, nofollow"')||!nginx.includes('error_page 404 /404.html'))throw new Error('SEO validation failed: private/API noindex or real 404 handling is missing.');
for(const route of ['/nigerian-curriculum','/british-curriculum','/class/','/subject/','/sample/','/terms','/privacy','/refunds'])if(!generator.includes(route))throw new Error(`SEO validation failed: page generator is missing ${route}.`);
for(const privateRoute of ['Bookmarks','Progress','Account','School','Platform','Join School'])if(!seo.includes(privateRoute))throw new Error(`SEO validation failed: private page metadata is missing ${privateRoute}.`);
if(!packageJson.scripts.build.includes('generate-seo-pages.mjs')||!packageJson.scripts.test.includes('validate:seo'))throw new Error('SEO validation failed: build and test scripts are not wired.');
if(!/base:\s*['"]\/['"]/.test(vite))throw new Error('SEO validation failed: nested static pages require root-relative Vite assets.');
console.log('SEO metadata, static rendering, crawl controls, route catalogue and structured-data checks passed.');
