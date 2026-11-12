import { markup as sceneMarkup, mount as mountScene, duration as sceneDuration } from "./mcp-motion.js";

export function mountMcpGuide(endpoint) {
  const svg = (body, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const icons = {
    stage: `<img src="/landing-preview/assets/stage-logo.png" width="40" height="40" alt="" aria-hidden="true" />`,
    chatgpt: `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M9.79648 9.34799V7.49548C9.79648 7.33946 9.85502 7.22239 9.99146 7.14447L13.7161 4.9995C14.2231 4.70702 14.8276 4.57058 15.4515 4.57058C17.7915 4.57058 19.2736 6.38413 19.2736 8.31455C19.2736 8.451 19.2736 8.60703 19.254 8.76305L15.393 6.501C15.159 6.36456 14.925 6.36456 14.691 6.501L9.79648 9.34799ZM18.4935 16.5631V12.1364C18.4935 11.8634 18.3764 11.6684 18.1425 11.5319L13.248 8.68494L14.847 7.76838C14.9834 7.69046 15.1005 7.69046 15.237 7.76838L18.9615 9.91336C20.0342 10.5374 20.7555 11.8634 20.7555 13.1503C20.7555 14.6322 19.8782 15.9973 18.4935 16.5628V16.5631ZM8.64599 12.663L7.04699 11.7271C6.91054 11.6492 6.85201 11.5321 6.85201 11.3761V7.08614C6.85201 4.99968 8.45101 3.42007 10.6156 3.42007C11.4346 3.42007 12.195 3.69316 12.8386 4.18061L8.99717 6.40369C8.76323 6.54015 8.64617 6.73513 8.64617 7.00822V12.6632L8.64599 12.663ZM12.0878 14.652L9.79648 13.3651V10.6351L12.0878 9.34818L14.3789 10.6351V13.3651L12.0878 14.652ZM13.56 20.5801C12.741 20.5801 11.9806 20.307 11.3369 19.8196L15.1784 17.5964C15.4123 17.46 15.5294 17.2651 15.5294 16.992V11.3369L17.148 12.2729C17.2845 12.3508 17.3429 12.4679 17.3429 12.6239V16.9139C17.3429 19.0003 15.7243 20.5801 13.56 20.5801ZM8.93846 16.2316L5.21387 14.0866C4.14128 13.4625 3.41989 12.1366 3.41989 10.8497C3.41989 9.34818 4.31688 8.00269 5.70131 7.43713V11.8831C5.70131 12.1562 5.81838 12.3512 6.05232 12.4876L10.9274 15.315L9.32842 16.2316C9.19196 16.3096 9.0749 16.3096 8.93846 16.2316ZM8.72408 19.4297C6.52057 19.4297 4.90201 17.772 4.90201 15.7246C4.90201 15.5685 4.92158 15.4125 4.94097 15.2565L8.78243 17.4796C9.01637 17.616 9.2505 17.616 9.48444 17.4796L14.3789 14.6522V16.5047C14.3789 16.6607 14.3204 16.7777 14.1839 16.8557L10.4593 19.0007C9.95233 19.2931 9.3478 19.4297 8.72391 19.4297H8.72408ZM13.56 21.75C15.9195 21.75 17.8889 20.073 18.3376 17.85C20.5215 17.2844 21.9256 15.2369 21.9256 13.1505C21.9256 11.7855 21.3406 10.4595 20.2876 9.50401C20.3851 9.09448 20.4437 8.68494 20.4437 8.27559C20.4437 5.48714 18.1816 3.4005 15.5686 3.4005C15.0422 3.4005 14.5351 3.47842 14.0281 3.65401C13.1505 2.79599 11.9415 2.25 10.6156 2.25C8.25602 2.25 6.28663 3.92691 5.83795 6.14999C3.65402 6.71555 2.25 8.76305 2.25 10.8495C2.25 12.2146 2.83494 13.5405 3.88796 14.496C3.79046 14.9055 3.73194 15.315 3.73194 15.7244C3.73194 18.5128 5.99397 20.5994 8.60703 20.5994C9.13344 20.5994 9.64047 20.5216 10.1475 20.346C11.0249 21.204 12.2339 21.75 13.56 21.75Z" fill="currentColor"></path></svg>`,
    claude: `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M5.92405 15.2962L9.85823 13.0903L9.92405 12.8981L9.85823 12.7918H9.66582L9.0076 12.7513L6.75949 12.6906L4.81013 12.6097L2.92152 12.5085L2.44557 12.4073L2 11.8204L2.04557 11.5269L2.44557 11.2588L3.01772 11.3094L4.28354 11.3954L6.18228 11.5269L7.55949 11.6079L9.6 11.8204H9.92405L9.96962 11.6888L9.85823 11.6079L9.77215 11.5269L7.8076 10.1963L5.68101 8.78978L4.56709 7.98027L3.96456 7.57045L3.66076 7.18594L3.52911 6.34607L4.07595 5.74399L4.81013 5.79459L4.99747 5.84518L5.74177 6.4169L7.33165 7.64635L9.4076 9.1743L9.71139 9.42727L9.83291 9.34126L9.8481 9.28055L9.71139 9.05287L8.58228 7.01391L7.37722 4.93954L6.84051 4.07943L6.69873 3.56337C6.6481 3.35087 6.61266 3.17379 6.61266 2.95624L7.23544 2.11131L7.57975 2L8.41013 2.11131L8.75949 2.41487L9.27595 3.59373L10.1114 5.45054L11.4076 7.97521L11.7873 8.72401L11.9899 9.41715L12.0658 9.62965H12.1975V9.50822L12.3038 8.08652L12.5013 6.34101L12.6937 4.09461L12.7595 3.46218L13.0734 2.70326L13.6962 2.29345L14.1823 2.52618L14.5823 3.0979L14.5266 3.46724L14.2886 5.01037L13.8228 7.42879L13.519 9.04781H13.6962L13.8987 8.84543L14.719 7.75765L16.0962 6.03744L16.7038 5.35441L17.4127 4.60056L17.8684 4.24134H18.7291L19.362 5.18239L19.0785 6.15381L18.1924 7.27701L17.4582 8.22818L16.4051 9.64483L15.7468 10.7781L15.8076 10.8692L15.9646 10.854L18.3443 10.3481L19.6304 10.1154L21.1646 9.85226L21.8582 10.1761L21.9342 10.5049L21.6608 11.1778L20.0203 11.5826L18.0962 11.9671L15.2304 12.6451L15.1949 12.6704L15.2354 12.721L16.5266 12.8424L17.0785 12.8728H18.4304L20.9468 13.06L21.6051 13.4951L22 14.0263L21.9342 14.4311L20.9215 14.9471L19.5544 14.6233L16.3646 13.8644L15.2709 13.5912H15.119V13.6823L16.0304 14.5727L17.7013 16.0804L19.7924 18.0233L19.8987 18.5039L19.6304 18.8834L19.3468 18.8429L17.5089 17.4617L16.8 16.8394L15.1949 15.4885H15.0886V15.6302L15.4582 16.1715L17.4127 19.106L17.5139 20.0066L17.3722 20.3L16.8658 20.4771L16.3089 20.3759L15.1646 18.7721L13.9848 16.9658L13.0329 15.3468L12.9165 15.4126L12.3544 21.4586L12.0911 21.7673L11.4835 22L10.9772 21.6155L10.7089 20.9932L10.9772 19.7637L11.3013 18.1599L11.5646 16.8849L11.8025 15.3013L11.9443 14.7751L11.9342 14.7397L11.8177 14.7549L10.6228 16.3941L8.80506 18.848L7.36709 20.386L7.02279 20.5226L6.42532 20.214L6.48101 19.6625L6.81519 19.1718L8.80506 16.642L10.0051 15.0736L10.7797 14.168L10.7747 14.0364H10.7291L5.44304 17.4667L4.50127 17.5882L4.0962 17.2087L4.14684 16.5864L4.33924 16.384L5.92911 15.2912L5.92405 15.2962Z" fill="currentColor"></path></svg>`,
    other: svg('<path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-11-2 14"/>'),
    copy: svg('<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M15 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>'),
    arrow: svg('<path d="M7 17 17 7M7 7h10v10"/>'),
    check: svg('<path d="m5 12 4 4L19 6"/>'),
    close: svg('<path d="m6 6 12 12M6 18 18 6"/>'),
    chevron: svg('<path d="m9 6 6 6-6 6"/>'),
    up: svg('<path d="M12 18V6m-5 5 5-5 5 5"/>')
  };
  const prompt = 'Start a new Stage project for my app.';
  const agents = {
    chatgpt: {name:'ChatGPT', icon:'chatgpt', url:'https://chatgpt.com/plugins', action:'Connect to ChatGPT', copyStep:null, value:endpoint, steps:['Open Plugins in ChatGPT','Connect Stage and sign in','Mention @Stage in any chat']},
    claude: {name:'Claude', icon:'claude', url:'https://claude.ai/settings/connectors', action:'Connect to Claude', copyStep:1, value:endpoint, steps:['Add a custom connector','Enter Stage’s server URL','Ask in any chat']},
    other: {name:'your agent', icon:'other', action:'Copy server URL', copyStep:0, value:endpoint, steps:['Add a remote HTTP MCP server','Sign in to your Stage account','Ask your agent to start a project']}
  };
  const stepDuration=()=>sceneDuration(motionContext());
  let active='claude', step=0, previousFocus, previousOverflow, copyTimer, carousel, disposeScene=()=>{};
  const dialog=document.createElement('dialog');
  dialog.id='stage-mcp-dialog';
  dialog.className='mcp-dialog';
  dialog.setAttribute('aria-labelledby','mcp-title');
  dialog.innerHTML=`
    <div class="mcp-shell">
      <header class="mcp-header"><span class="mcp-brand" aria-label="Stage">${icons.stage}</span><h2 id="mcp-title">Connect Stage to <span id="mcp-agent-name">Claude</span></h2><button class="mcp-close" type="button" aria-label="Close connection guide" autofocus>${icons.close}</button></header>
      <div class="mcp-body">
      <div class="mcp-tabs" role="tablist" aria-label="Choose your AI agent">
        <button type="button" role="tab" id="mcp-tab-claude" aria-selected="true" aria-controls="mcp-guide" data-mcp-tab="claude">${icons.claude}Claude</button>
        <button type="button" role="tab" id="mcp-tab-chatgpt" aria-selected="false" aria-controls="mcp-guide" tabindex="-1" data-mcp-tab="chatgpt">${icons.chatgpt}ChatGPT</button>
        <button type="button" role="tab" id="mcp-tab-other" aria-selected="false" aria-controls="mcp-guide" tabindex="-1" data-mcp-tab="other">Other agents</button>
      </div>
      <section id="mcp-guide" role="tabpanel" aria-labelledby="mcp-tab-claude">
        <div class="mcp-illustration" aria-hidden="true"></div>
        <div class="mcp-step-row"><div class="mcp-step-label"><span class="mcp-step-number">1</span><span id="mcp-step-title"></span></div><nav class="mcp-steps" aria-label="Setup steps">${[0,1,2].map(i=>`<button type="button" data-mcp-step="${i}" aria-label="Step ${i+1}"><span></span></button>`).join('')}</nav></div>
        <div class="mcp-setup-slot"><div class="mcp-code-control" hidden><span id="mcp-code-label" class="mcp-code-label">MCP server URL</span><div class="mcp-code-box"><code id="mcp-code" tabindex="0" aria-labelledby="mcp-code-label"></code><button type="button" class="mcp-copy" aria-label="Copy setup value">${icons.copy}<span>Copy URL</span></button></div></div><span class="mcp-copy-status" role="status" aria-live="polite"></span></div>
      </section>
      <div class="mcp-action-slot"></div>
      <p class="mcp-footer">Needs a Stage account. <a href="/auth?mode=signup" target="_blank" rel="noopener noreferrer">Create one</a></p>
      </div>
    </div>`;
  document.body.append(dialog);
  const find=selector=>dialog.querySelector(selector);
  const motionContext=()=>({agent:active,name:agents[active].name,icon:agents[active].icon,step,icons,endpoint,prompt});
  const copyButtonContent=(copied=false)=>`${icons[copied?'check':'copy']}<span>${copied?'Copied':'Copy URL'}</span>`;
  function setCopyFeedback(copied){
    const inline=find('.mcp-copy'),action=find('[data-mcp-copy-action]');
    inline.innerHTML=copyButtonContent(copied);
    inline.classList.toggle('is-copied',copied);
    inline.setAttribute('aria-label',copied?'Copied to clipboard':'Copy server URL');
    if(action){
      action.innerHTML=copied?`${icons.check}<span>Copied</span>`:`${agents[active].action}${icons.copy}`;
      action.classList.toggle('is-copied',copied);
    }
  }
  function stopCarousel(){clearTimeout(carousel);}
  function startCarousel(delay=stepDuration()){
    stopCarousel();
    if(!dialog.open)return;
    carousel=setTimeout(()=>{if(document.hidden){startCarousel(1000);return;}step=(step+1)%3;render();startCarousel();},delay);
  }
  function render(){
    const agent=agents[active];
    dialog.dataset.mcpAgent=active;
    dialog.dataset.currentStep=String(step);
    dialog.style.setProperty('--mcp-step-duration',`${stepDuration()}ms`);
    find('.mcp-illustration').dataset.provider=active;
    find('#mcp-agent-name').textContent=agent.name;
    dialog.querySelectorAll('[data-mcp-tab]').forEach(button=>{const selected=button.dataset.mcpTab===active;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
    find('#mcp-guide').setAttribute('aria-labelledby',`mcp-tab-${active}`);
    disposeScene();
    const illustration=find('.mcp-illustration');
    illustration.innerHTML=sceneMarkup(motionContext());
    disposeScene=mountScene(illustration,motionContext());
    find('.mcp-step-number').textContent=step+1;
    find('#mcp-step-title').textContent=agent.steps[step];
    dialog.querySelectorAll('[data-mcp-step]').forEach((button,i)=>{button.setAttribute('aria-label',`Step ${i+1}: ${agent.steps[i]}`);if(i===step)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');button.innerHTML='<span></span>';});
    find('.mcp-code-control').hidden=step!==agent.copyStep;
    find('#mcp-code').textContent=agent.value;
    find('.mcp-copy').setAttribute('aria-label','Copy server URL');
    find('.mcp-copy').classList.remove('is-copied');
    find('.mcp-copy').innerHTML=copyButtonContent();
    find('.mcp-copy-status').textContent='';
    clearTimeout(copyTimer);
    find('.mcp-action-slot').hidden=!agent.url && step===agent.copyStep;
    find('.mcp-action-slot').innerHTML=agent.url?`<a class="button button-primary mcp-primary" href="${agent.url}" target="_blank" rel="noopener noreferrer" ${active==='chatgpt'?'data-mcp-connect-chatgpt title="Copies the Stage server URL and opens ChatGPT"':''}>${agent.action}${icons.arrow}</a>`:`<button class="button button-primary mcp-primary" type="button" data-mcp-copy-action aria-live="polite">${agent.action}${icons.copy}</button>`;
  }
  async function copy(){
    stopCarousel();
    clearTimeout(copyTimer);
    setCopyFeedback(false);
    const copiedAgent=active,copiedStep=step;
    try{
      await navigator.clipboard.writeText(agents[active].value);
      if(copiedAgent!==active || copiedStep!==step || !dialog.open)return;
      setCopyFeedback(true);
      copyTimer=setTimeout(()=>{setCopyFeedback(false);find('.mcp-copy-status').textContent='';},2600);
      startCarousel(10000);
    }catch{
      if(copiedAgent!==active || copiedStep!==step || !dialog.open)return;
      find('.mcp-code-control').hidden=false;
      const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(find('#mcp-code'));selection.removeAllRanges();selection.addRange(range);find('#mcp-code').focus();
      find('.mcp-copy-status').textContent='Select and copy the text above.';
    }
  }
  function open(trigger){
    if(dialog.open)return;
    previousFocus=trigger || document.activeElement;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    active='claude';step=0;dialog.showModal();render();startCarousel();
  }
  function restorePage(){
    document.body.style.overflow=previousOverflow;
    previousFocus?.focus();
    previousFocus=undefined;
    clearTimeout(copyTimer);
    stopCarousel();
    disposeScene();
  }
  dialog.addEventListener('close',restorePage);
  dialog.addEventListener('click',event=>{
    const target=event.target;
    if(target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();return;}
    if(target.closest('.mcp-close'))dialog.close();
    const tab=target.closest('[data-mcp-tab]');if(tab){active=tab.dataset.mcpTab;step=0;render();startCarousel();}
    const dot=target.closest('[data-mcp-step]');if(dot){step=Number(dot.dataset.mcpStep);render();startCarousel();}
    if(target.closest('.mcp-copy')||target.closest('[data-mcp-copy-action]')||target.closest('[data-mcp-connect-chatgpt]'))copy();
  });
  find('.mcp-tabs').addEventListener('keydown',event=>{
    const tabs=[...dialog.querySelectorAll('[data-mcp-tab]')],current=tabs.indexOf(document.activeElement);if(current<0)return;
    const next=event.key==='ArrowRight'?(current+1)%3:event.key==='ArrowLeft'?(current+2)%3:event.key==='Home'?0:event.key==='End'?2:null;
    if(next!==null){event.preventDefault();tabs[next].click();tabs[next].focus();}
  });
  const listeners=new AbortController();
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){stopCarousel();disposeScene();}
    else if(dialog.open){render();startCarousel();}
  },{signal:listeners.signal});
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-connect-mcp]');
    if(trigger)open(trigger);
  },{signal:listeners.signal});
  return ()=>{
    listeners.abort();
    dialog.removeEventListener('close',restorePage);
    if(dialog.open)dialog.close();
    if(previousFocus)restorePage();
    dialog.remove();
  };
}
