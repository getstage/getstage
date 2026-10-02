// Check the actual build artifacts, including pages served without JavaScript.
import {readFile,access} from 'node:fs/promises';
import path from 'node:path';
const dist=path.resolve('dist');
const sitemap=await readFile(path.join(dist,'sitemap.xml'),'utf8');
const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>match[1]);
const errors=[];const titles=new Set();const descriptions=new Set();
for(const url of urls){
 const pathname=new URL(url).pathname;
 const html=await readFile(path.join(dist,pathname==='/'?'index.html':`${pathname}.html`),'utf8');
 const check=(ok,message)=>{if(!ok)errors.push(`${pathname}: ${message}`)};
 const title=html.match(/<title>(.*?)<\/title>/s)?.[1];
 const description=html.match(/<meta name="description" content="([^"]*)"/s)?.[1];
 check(title&&!titles.has(title),'missing or duplicate title');titles.add(title);
 check(description&&!descriptions.has(description),'missing or duplicate description');descriptions.add(description);
 check(html.includes(`<link rel="canonical" href="${url}"`),'incorrect canonical');
 check((html.match(/<h1[\s>]/g)||[]).length===1,'expected exactly one H1');
 check(!/<meta name="robots" content="[^"]*noindex/.test(html),'sitemap page is noindex');
 check(html.includes('max-image-preview:large'),'large image previews not enabled');
 for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))try{JSON.parse(match[1])}catch{check(false,'invalid JSON-LD')}
 check(html.includes('application/ld+json'),'missing structured data');
 for(const match of html.matchAll(/<(?:img|source)[^>]+src="(\/[^"?#]+)[^"]*"/g))try{await access(path.join(dist,decodeURI(match[1])))}catch{check(false,`missing image ${match[1]}`)}
 check(!html.includes('http://127.0.0.1:'),'localhost reference in public HTML');
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1}else console.log(`SEO checks passed for ${urls.length} indexable pages: unique metadata, canonical URLs, H1s, JSON-LD, image files and indexing directives.`);
