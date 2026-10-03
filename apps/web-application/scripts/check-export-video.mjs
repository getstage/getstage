// Exercise cold loading, blocked autoplay and network recovery without a browser cache.
// Browser validation is still required to verify real media decoding and rendered frames.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../public/landing-preview/site.js', import.meta.url), 'utf8');
const start = source.lastIndexOf('(() => {', source.indexOf("const track = document.querySelector('[data-export-scroll]')"));
const script = source.slice(start, source.indexOf('\n})();', start) + 6);
const flush = () => new Promise(resolve => setImmediate(resolve));
async function check({networkFailure = false, blockedPlay = false} = {}) {
  const events = {}, queue = [], clicks = {};
  let requests = 0, finishDownload;
  const download = new Promise(resolve => { finishDownload = resolve; });
  const error = {hidden:true}, loading = {hidden:true};
  const video = {
    dataset:{exportSrc:'/demo.mp4'}, duration:NaN, readyState:0, seeking:false, currentTime:0,
    setAttribute(){}, removeAttribute(){}, pause(){}, load(){},
    play:() => blockedPlay ? Promise.reject(Error('autoplay blocked')) : new Promise(()=>{}),
    addEventListener(name, handler){events[name] = handler;},
  };
  const steps = [1.5,4,7].map((time,index)=>({dataset:{exportStep:time},setAttribute(){},addEventListener(name,handler){clicks[`${index}:${name}`]=handler;}}));
  const copy = {prepend(){}}, header = {parentElement:copy};
  const demo = {offsetHeight:400,querySelector:s=>s==='.export-copy'?copy:header};
  const nodes = {'.export-demo':demo,'.export-stage':{getBoundingClientRect:()=>({top:0,height:400})},'[data-export-film]':video,'[data-export-error]':error,'[data-export-loading]':loading,'[data-export-retry]':{addEventListener(name,handler){clicks.retry=handler;}}};
  const track = {querySelector:s=>nodes[s],querySelectorAll:()=>steps,getBoundingClientRect:()=>({top:-800,bottom:2500}),style:{setProperty(){}},toggleAttribute(){},setAttribute(){}};
  vm.runInNewContext(script, {
    document:{querySelector:()=>track,hidden:false,addEventListener(){},dispatchEvent:()=>true},
    window:{innerWidth:1280,innerHeight:800,scrollY:0,scrollTo(){},matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){}},
    requestAnimationFrame(fn){queue.push(fn);return 1;},
    fetch:async()=>{requests++; if(networkFailure && requests===1)throw Error('offline'); await download;return {ok:true,blob:async()=>({size:292106,type:'video/mp4'})};},
    URL:{createObjectURL:()=> 'blob:buffered-demo',revokeObjectURL(){}},
    AbortController, setTimeout, clearTimeout, CustomEvent:class {},
  });
  assert.equal(requests,1,'Begin loading before scrolling to the section');
  if(networkFailure){
    await flush();assert.equal(error.hidden,false);assert.equal(loading.hidden,true);
    clicks.retry();assert.equal(requests,2);assert.equal(error.hidden,true);
  }
  assert.equal(video.src,undefined,'Do not seek against a partial network response');
  clicks['2:click']();assert.equal(requests,networkFailure?2:1,'Do not duplicate a pending download');
  finishDownload();await flush();
  assert.equal(video.src,'blob:buffered-demo');
  video.duration=11.1;video.readyState=4;
  events.loadedmetadata();events.loadeddata();await flush();
  assert.equal(loading.hidden,true);assert.equal(video.currentTime,7,'Honor a chapter selected while loading, even if autoplay is blocked or pending');
}
await check();await check({blockedPlay:true});await check({networkFailure:true});
console.log('PASS: cold load, pending/blocked autoplay, chapter selection while loading, failed download and retry');
