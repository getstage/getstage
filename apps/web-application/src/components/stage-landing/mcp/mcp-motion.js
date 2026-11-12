const finishTimes={search:3150,menu:3750,form:3730,connect:2840,chat:3510};
const sceneKind=({agent,step})=>step===2?'chat':agent==='claude'&&step===0?'menu':agent==='claude'&&step===1||agent==='other'&&step===0?'form':step===1?'connect':'search';
// Include the 240ms pointer fade and a short settling beat before advancing.
const duration=ctx=>matchMedia('(prefers-reduced-motion: reduce)').matches||ctx.step===2?6000:finishTimes[sceneKind(ctx)]+450;
const safe=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lineIcon=paths=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const uiIcons={
  attach:lineIcon('<path d="m8 12 7-7a3 3 0 0 1 4 4L9 19a5 5 0 0 1-7-7L13 1" transform="translate(2 1) scale(.9)"/><path d="m7 15 9-9"/>'),
  grid:lineIcon('<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>'),
  skills:lineIcon('<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>'),
  plus:lineIcon('<path d="M12 5v14M5 12h14"/>'),
  manage:lineIcon('<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M9 6V4h6v2M4 12h16M10 12v3h4v-3"/>'),
  mic:lineIcon('<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M6 11v2a6 6 0 0 0 12 0v-2M12 19v3"/>')
};
const cursor='<div class="mm-cursor"><span class="mm-click-pulse"></span><svg class="mm-cursor-glyph" viewBox="0 0 20 26" fill="none" aria-hidden="true"><path d="M3 2.5 3.4 20.2 8.2 15.8 11.8 23.2 15 21.6 11.4 14.4 17.8 14Z" fill="currentColor" stroke="var(--pointer-outline)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>';
const field=(name,placeholder,label)=>`<div class="mm-field-group"><span class="mm-field-label">${label}</span><div class="mm-field" data-target="${name}"><span class="mm-value" data-type="${name}" data-placeholder="${placeholder}"></span></div></div>`;
function markup(ctx){
  const {agent,name,step,icons}=ctx;
  const app=`<span class="mm-stage-icon">${icons.stage}</span>`;
  let scene,kind;
  if(step===2){
    kind='chat';
    scene=`<div class="mm-chat-world"><div class="mm-chat-brand">${icons[ctx.icon]}<span>${safe(agent==='other'?'Your agent':name)}</span></div><div class="mm-composer"><div class="mm-compose-text"><span class="mm-mention" data-mention>@Stage</span><span class="mm-value" data-type="prompt" data-placeholder="${agent==='claude'?'Reply to Claude…':'Ask anything…'}"></span></div><div class="mm-compose-toolbar"><span class="mm-compose-plus">+</span><span class="mm-tool-chip">${icons.stage}<span>Stage</span></span><span class="mm-send" data-target="send">${icons.up}</span></div></div><div class="mm-suggestion mm-reveal" data-target="suggestion">${app}<span>Stage<small>Use in this chat</small></span><span class="mm-key">↵</span></div>
      <div class="mm-chat-thread">
        <div class="mm-sent mm-reveal">${agent==='chatgpt'?'<span>@Stage</span> ':''}Start a new Stage project for my app.</div>
        <div class="mm-stage-response mm-reveal">
          ${app}
          <div class="mm-response-copy">
            <span class="mm-response-name">Stage</span>
            <span class="mm-thinking">Thinking<span class="mm-thinking-dots"><i></i><i></i><i></i></span></span>
          </div>
        </div>
      </div>
    </div>`;
  }else if(agent==='claude' && step===0){
    kind='menu';
    scene=`<div class="mm-menu-world"><div class="mm-menu-composer"><span>Reply to Claude…</span><div class="mm-menu-toolbar"><span class="mm-plus-key" data-target="plus">${uiIcons.plus}</span><span class="mm-menu-model">Sonnet ${icons.chevron}</span><span class="mm-menu-mic">${uiIcons.mic}</span></div></div><div class="mm-menu-primary mm-reveal"><div>${uiIcons.attach}<span>Add files</span></div><div>${uiIcons.skills}<span>Skills</span>${icons.chevron}</div><div data-target="connectors">${uiIcons.grid}<span>Connectors</span>${icons.chevron}</div></div><div class="mm-menu-branch mm-reveal"><div data-target="add-connector">${uiIcons.plus}<span>Add connector</span>${icons.chevron}</div><div>${uiIcons.manage}<span>Manage connectors</span></div></div><div class="mm-menu-secondary mm-reveal"><div>${uiIcons.grid}<span>Browse connectors</span></div><div data-target="custom">${uiIcons.plus}<span>Add custom connector</span></div></div></div>`;
  }else if(agent==='claude' && step===1 || agent==='other' && step===0){
    kind='form';
    scene=`<div class="mm-form-world"><div class="mm-panel mm-form"><strong>${agent==='claude'?'Add custom connector':'Add remote MCP server'}</strong>${field('name','e.g. Stage','Name')}${field('url','https://…','Remote MCP server URL')}<div class="mm-form-actions"><span class="mm-cancel">Cancel</span><span class="mm-submit" data-target="submit"><span data-button-label>${agent==='claude'?'Continue':'Add server'}</span></span></div></div><div class="mm-server-result mm-panel mm-reveal"><strong>MCP servers</strong><div>${app}<span>Stage<small>Remote · HTTP</small></span><span class="mm-server-status">${icons.check}</span></div></div></div>`;
  }else if(step===1){
    kind='connect';
    scene=`<div class="mm-connect-world"><div class="mm-connect-apps"><span class="mm-provider-icon">${icons[ctx.icon]}</span><span class="mm-link-track"><span class="mm-link-fill"></span><span class="mm-link-check mm-reveal">${icons.check}</span></span><span class="mm-stage-app">${icons.stage}</span></div><strong>Stage</strong><div class="mm-connect-button" data-target="connect"><span data-button-label>Connect account</span></div></div>`;
  }else{
    kind='search';
    scene=`<div class="mm-panel mm-directory"><div class="mm-directory-heading"><strong>Plugins</strong><span class="mm-directory-add">${uiIcons.plus}</span></div><div class="mm-search" data-target="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><span class="mm-value" data-type="search" data-placeholder="Search plugins"></span></div><div class="mm-search-result mm-reveal" data-target="result">${app}<span><strong>Stage</strong><small>Product strategy for your AI</small></span>${icons.chevron}</div></div>`;
  }
  return `<div class="mcp-motion-stage" data-motion-scene="${kind}" data-motion-phase="start">${scene}${cursor}</div>`;
}
function mount(container,ctx){
  const stage=container.querySelector('.mcp-motion-stage');
  if(!stage)return ()=>{};
  const timers=new Set(),animations=new Set();
  let disposed=false,pointerAnimation;
  const q=selector=>stage.querySelector(selector);
  const phase=value=>{stage.dataset.motionPhase=value;};
  const at=(time,fn)=>{const id=setTimeout(()=>{timers.delete(id);if(!disposed)fn();},time);timers.add(id);};
  const animate=(el,frames,options={})=>{
    if(!el || disposed)return;
    const animation=el.animate(frames,{duration:300,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards',...options});
    animations.add(animation);return animation;
  };
  const reveal=(selector,options={})=>{const el=q(selector);if(!el)return;el.dataset.revealed='true';animate(el,[{opacity:0,transform:'translateY(7px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],options);};
  const revealMenu=selector=>{const el=q(selector);if(!el)return;el.dataset.revealed='true';animate(el,[{opacity:0,transform:'translateX(-6px) scale(.98)'},{opacity:1,transform:'translateX(0) scale(1)'}],{duration:240});};
  const hide=selector=>animate(q(selector),[{opacity:1},{opacity:0}],{duration:160});
  const focus=name=>{stage.querySelectorAll('.is-focused').forEach(el=>el.classList.remove('is-focused'));q(`[data-target="${name}"]`)?.classList.add('is-focused');};
  const type=(name,text,start,interval=30)=>{const el=q(`[data-type="${name}"]`);if(!el)return;at(start,()=>{el.textContent='';el.classList.add('is-typing');phase('typing');});[...text].forEach((_,i)=>at(start+(i+1)*interval,()=>{el.textContent=text.slice(0,i+1);}));at(start+(text.length+1)*interval,()=>el.classList.remove('is-typing'));};
  const cursor=q('.mm-cursor');
  let position={x:stage.clientWidth*.88,y:stage.clientHeight*.9};
  cursor.style.transform=`translate3d(${position.x}px,${position.y}px,0)`;
  const move=(target,duration=450,ratio=.65)=>{
    const el=q(`[data-target="${target}"]`);if(!el)return;
    const rect=el.getBoundingClientRect(),bounds=stage.getBoundingClientRect();
    const next={x:rect.left-bounds.left+rect.width*ratio,y:rect.top-bounds.top+rect.height*.55};
    const current=getComputedStyle(cursor),matrix=new DOMMatrixReadOnly(current.transform);
    position={x:matrix.m41,y:matrix.m42};
    const opacity=Number(current.opacity),dx=next.x-position.x,dy=next.y-position.y;
    const distance=Math.hypot(dx,dy),bend=Math.min(distance*.045,7);
    const middle={x:position.x+dx*.62-(distance?dy/distance*bend:0),y:position.y+dy*.62+(distance?dx/distance*bend:0)};
    pointerAnimation?.cancel();
    pointerAnimation=animate(cursor,[
      {opacity,transform:`translate3d(${position.x}px,${position.y}px,0)`},
      {opacity:1,transform:`translate3d(${middle.x}px,${middle.y}px,0)`,offset:.62},
      {opacity:1,transform:`translate3d(${next.x}px,${next.y}px,0)`}
    ],{duration,easing:'cubic-bezier(.4,0,.2,1)'});position=next;
  };
  const click=()=>{
    phase('clicking');
    animate(q('.mm-cursor-glyph'),[{transform:'scale(1)'},{transform:'scale(.92)',offset:.35},{transform:'scale(1)'}],{duration:240,easing:'cubic-bezier(.2,.8,.2,1)'});
    animate(q('.mm-click-pulse'),[{opacity:0,transform:'scale(.45)'},{opacity:.24,transform:'scale(.75)',offset:.2},{opacity:0,transform:'scale(1.35)'}],{duration:360});
  };
  const label=html=>{const el=q('[data-button-label]');if(el)el.innerHTML=html;};
  const busy=text=>label(`<span class="mm-spinner"></span>${text}`);
  const ready=text=>label(`${ctx.icons.check}${text}`);
  const complete=()=>{phase('complete');cursor.style.pointerEvents='none';animate(cursor,[{opacity:1},{opacity:0}],{duration:240});};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduced)animate(stage,[{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:280});
  const kind=stage.dataset.motionScene;
  if(reduced){
    stage.classList.add('mm-reduced');
    if(kind==='search'){q('[data-type="search"]').textContent='Stage';q('.mm-search-result').style.opacity='1';}
    if(kind==='menu'){q('.mm-menu-primary').style.opacity='1';q('.mm-menu-branch').style.opacity='1';q('.mm-menu-secondary').style.opacity='1';q('[data-target="connectors"]').classList.add('is-hovered');q('[data-target="add-connector"]').classList.add('is-hovered');q('[data-target="custom"]').classList.add('is-hovered');}
    if(kind==='form'){q('[data-type="name"]').textContent='Stage';q('[data-type="url"]').textContent=ctx.endpoint;ready('Added');}
    if(kind==='connect'){ready('Connected');q('.mm-link-check').style.opacity='1';}
    if(kind==='chat'){q('.mm-composer').style.display='none';q('.mm-sent').style.opacity='1';q('.mm-stage-response').style.opacity='1';}
    phase('complete');
  }else if(kind==='search'){
    at(240,()=>move('search',500,.32));at(740,()=>{click();focus('search');});type('search','Stage',900,105);
    at(1650,()=>{phase('results');reveal('.mm-search-result');});at(2050,()=>move('result',570,.65));
    at(2640,()=>{click();q('.mm-search-result').classList.add('is-hovered');});at(finishTimes.search,complete);
  }else if(kind==='menu'){
    at(180,()=>move('plus',460,.5));at(660,()=>{click();q('.mm-plus-key').classList.add('is-hovered');});at(800,()=>{phase('menu-open');reveal('.mm-menu-primary');});
    at(1120,()=>move('connectors',450,.62));at(1620,()=>{q('[data-target="connectors"]').classList.add('is-hovered');revealMenu('.mm-menu-branch');phase('submenu-open');});
    at(1940,()=>move('add-connector',400,.6));at(2380,()=>{q('[data-target="add-connector"]').classList.add('is-hovered');revealMenu('.mm-menu-secondary');phase('custom-menu-open');});
    at(2750,()=>move('custom',460,.65));at(3260,()=>{click();q('[data-target="custom"]').classList.add('is-hovered');});at(finishTimes.menu,complete);
  }else if(kind==='form'){
    at(180,()=>move('name',430,.3));at(640,()=>{click();focus('name');});type('name','Stage',760,78);
    at(1290,()=>move('url',400,.48));at(1710,()=>{click();focus('url');});type('url',ctx.endpoint,1780,21);
    at(2670,()=>{stage.querySelectorAll('.is-focused').forEach(el=>el.classList.remove('is-focused'));move('submit',440,.55);});
    at(3150,()=>{click();phase('connecting');busy('Adding');});
    at(finishTimes.form,()=>{ready('Added');q('.mm-submit').classList.add('is-complete');if(ctx.agent==='other'){hide('.mm-form');reveal('.mm-server-result');}complete();});
  }else if(kind==='connect'){
    at(300,()=>move('connect',600,.6));at(940,()=>{click();busy('Connecting');phase('connecting');});
    at(1200,()=>animate(q('.mm-link-fill'),[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:850}));
    at(2170,()=>{reveal('.mm-link-check',{duration:360,easing:'cubic-bezier(.34,1.56,.64,1)'});ready('Connected');q('.mm-connect-button').classList.add('is-complete');animate(q('.mm-stage-app'),[{transform:'scale(1)'},{transform:'scale(1.09)',offset:.45},{transform:'scale(1)'}],{duration:450});});at(finishTimes.connect,complete);
  }else if(kind==='chat'){
    const isGPT=ctx.agent==='chatgpt';
    if(isGPT){
      type('prompt','@Stage',330,75);at(900,()=>reveal('.mm-suggestion'));at(1080,()=>move('suggestion',430,.57));
      at(1560,()=>{click();hide('.mm-suggestion');q('[data-type="prompt"]').textContent='';q('[data-mention]').style.display='inline';q('.mm-composer').classList.add('has-tool');});
      type('prompt',ctx.prompt,1700,26);
    }else{at(400,()=>q('.mm-composer').classList.add('has-tool'));type('prompt',ctx.prompt,750,32);}
    at(2850,()=>move('send',400,.5));at(3290,()=>{click();phase('sending');animate(q('.mm-composer'),[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-16px) scale(.97)'}],{duration:260});});
    at(finishTimes.chat,()=>{reveal('.mm-sent');complete();});
    at(finishTimes.chat+230,()=>{reveal('.mm-stage-response');phase('thinking');});
  }
  return ()=>{disposed=true;timers.forEach(clearTimeout);animations.forEach(animation=>animation.cancel());};
}

export { markup, mount, duration };
