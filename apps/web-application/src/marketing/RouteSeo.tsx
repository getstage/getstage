import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';
import { metaForPath } from './pageMeta';
import { absoluteUrl } from './site';

// Keep client navigation consistent with the HTML generated at build time.
export function RouteSeo() {
 const {pathname}=useLocation();
 useEffect(()=>{
  const meta=metaForPath(pathname);
  const set=(selector:string,attributes:Record<string,string>)=>{
   let element=document.head.querySelector(selector);
   if(!element){element=document.createElement(selector.startsWith('link')?'link':'meta');document.head.appendChild(element);}
   Object.entries(attributes).forEach(([key,value])=>element!.setAttribute(key,value));
  };
  set('meta[name="robots"]',{name:'robots',content:meta&&!meta.noIndex?'index, follow, max-image-preview:large':'noindex, follow'});
  const canonical=absoluteUrl(pathname.replace(/\/+$/,'')==='/marketplace'?'/component-libraries':pathname.replace(/\/+$/,'')||'/');
  set('link[rel="canonical"]',{rel:'canonical',href:canonical});
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach(el=>el.remove());
  if(!meta)return;
  document.title=meta.title;
  set('meta[name="description"]',{name:'description',content:meta.description});
  for(const [key,value] of Object.entries({'og:title':meta.title,'og:description':meta.description,'og:url':canonical,'og:type':meta.type,'og:image':absoluteUrl(meta.image),'og:image:alt':meta.title}))set(`meta[property="${key}"]`,{property:key,content:value});
  for(const [key,value] of Object.entries({'twitter:title':meta.title,'twitter:description':meta.description,'twitter:image':absoluteUrl(meta.image),'twitter:image:alt':meta.title}))set(`meta[name="${key}"]`,{name:key,content:value});
  for(const entry of meta.jsonLd){const script=document.createElement('script');script.type='application/ld+json';script.textContent=JSON.stringify(entry).replaceAll('<','\\u003c');document.head.appendChild(script);}
 },[pathname]);
 return null;
}
