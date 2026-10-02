import { X, Check } from "@phosphor-icons/react";
import { trackDatafastGoal } from "@/lib/datafast";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@/lib/auth";
import { useStageLanding } from "@/components/stage-landing/useStageLanding";
import { ProfileView } from "./ProfilePage";
import { ProfileBoundary, profileApi, catalog, type Profile, type ProfileInput } from "./MarketplaceState";
import { blank, fields, contacts, suggestedHandle } from "./profileModel";
import { RolePicker, ContactFields, TechnologyPicker, TechnologyLabel, PhotoField, contactError } from "./ProfileFields";


type Step = 1 | 2 | 3;
const headings = ['Set up your profile', 'What do you do?', "What's in your stack?"];
const subtitles = ['This is how other builders will see you.', 'Pick anything that fits. You can change it later.', 'It shows up on your profile under My collection.'];
function params(){return new URLSearchParams(window.location.search);}
function nextPath(){const next=params().get('next')||'/download/mac';return next==='/profile'||next.startsWith('/profile?')?next:'/download/mac';}
function finishPath(){const next=nextPath();return next.startsWith('/profile?')?`/download/mac?profile=${encodeURIComponent(next)}`:'/download/mac';}

export function ProfileSetupPage(){
 useStageLanding({title:"Set up your profile — Stage",description:"Create your builder profile.",bodyClass:"profile-page profile-setup-page"});
 const preview=import.meta.env.DEV&&params().get('preview')==='1';
 if(preview&&params().get('reset')==='1'){
  localStorage.removeItem('stage-profile-setup-v1:local-preview');
  const url=new URL(window.location.href);url.searchParams.delete('reset');window.history.replaceState(null,'',url);
 }
 return <main className="auth-page setup-auth-shell"><ProfileBoundary>{preview?<SetupEditor initial={blank('')} accountKey="local-preview" preview/>:<ConnectedSetup/>}</ProfileBoundary></main>;
}
function ConnectedSetup(){
 const {user,isAuthenticated,isLoading}=useAuth();const profile=useQuery(profileApi.mine,isAuthenticated?{}:'skip');
 const entry=useRef<{profile:Profile}|null>(null);
 if(user&&profile!==undefined&&!entry.current)entry.current={profile:profile??{...blank(user.name),customAvatar:user.avatarUrl}};
 const initial=entry.current?.profile;
 useEffect(()=>{if(!isLoading&&!isAuthenticated)window.location.replace(`/auth?redirect=${encodeURIComponent('/setup-profile'+window.location.search)}`);},[isLoading,isAuthenticated]);
 useEffect(()=>{if(initial?.onboardingStep===3)window.location.replace(nextPath());},[initial]);
 if(isLoading||!user||!initial||initial.onboardingStep===3)return <p className="profile-service-error" role="status">Loading your profile…</p>;
 return <SetupEditor key={user.id} initial={initial} accountKey={user.id}/>;
}
function SetupEditor({initial,accountKey,preview=false}:{initial:Profile;accountKey:string;preview?:boolean}){
 const storageKey=`stage-profile-setup-v1:${accountKey}`;
 const [draft,setDraft]=useState<Profile>(()=>{try{const stored=JSON.parse(localStorage.getItem(storageKey)||'null');if(stored?.version===1&&stored.profile&&typeof stored.profile.name==='string')return {...initial,...stored.profile};}catch{}return {...initial,handle:initial.handle||(initial.name?suggestedHandle(initial.name):'')};});
 const [step,setStep]=useState<Step>(()=>Math.min(3,(draft.onboardingStep??0)+1) as Step);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [handleTouched,setHandleTouched]=useState(!!initial.handle);const [handle,setHandle]=useState(draft.handle);const [toolQuery,setToolQuery]=useState('');
 const save=useMutation(profileApi.saveSetupStep);const heading=useRef<HTMLHeadingElement>(null);
 const validHandle=/^[a-z0-9_]{2,24}$/.test(draft.handle);const validName=draft.name.trim().length>0&&draft.name.trim().length<=60;
 useEffect(()=>{const timer=setTimeout(()=>setHandle(draft.handle),250);return()=>clearTimeout(timer);},[draft.handle]);
 const availability=useQuery(profileApi.username,!preview&&/^[a-z0-9_]{2,24}$/.test(handle)?{handle}:'skip');
 useEffect(()=>{if(!handleTouched&&availability?.suggestion&&!availability.available&&handle===draft.handle)setDraft(p=>({...p,handle:availability.suggestion}));},[availability,handleTouched,handle,draft.handle]);
 useEffect(()=>{try{if(draft.onboardingStep===3&&!preview)localStorage.removeItem(storageKey);else localStorage.setItem(storageKey,JSON.stringify({version:1,profile:draft}));}catch{}},[draft,storageKey]);
 useEffect(()=>{heading.current?.focus();if(!preview)trackDatafastGoal("onboarding_step_viewed",{step});},[step,preview]);
 const available=preview||handle===draft.handle&&availability?.available===true;
 function update(input:ProfileInput){setDraft(p=>({...p,...input}));}
 async function advance(skipped=false){
  if(busy||!validName||!validHandle||!available)return;
  if(step===3&&contacts.some(({key})=>contactError(key,draft[key]))){setError('Check the highlighted contact links.');return;}
  setBusy(true);setError('');
  try{
   if(!preview)await save({profile:fields(draft),step,items:draft.items});
   if(!preview)trackDatafastGoal("onboarding_step_completed",{step,skipped});
   setDraft(p=>({...p,onboardingStep:Math.max(p.onboardingStep??0,step)}));
   if(step===3){if(!preview)trackDatafastGoal("onboarding_finished");if(preview){localStorage.removeItem("stage-profile-preview-signed-out");localStorage.setItem("stage-profile-preview",JSON.stringify({...draft,onboardingStep:3}));}else localStorage.removeItem(storageKey);const destination=finishPath();window.location.assign(preview?`${destination}${destination.includes('?')?'&':'?'}preview=1`:destination);}
   else setStep((step+1) as Step);
  }catch(e){setError(e instanceof Error?e.message:'Could not save. Please try again.');}finally{setBusy(false)}
 }
 const tools=toolQuery.trim()?catalog.filter(item=>item.type==='Tools'&&!draft.items.includes(item.id)&&`${item.name} ${item.category}`.toLowerCase().includes(toolQuery.trim().toLowerCase())).slice(0,8):[];
 return <div className="profile-setup-layout">
  <section className="setup-form-column"><div className="profile-setup-card profile-dialog" aria-labelledby="setup-title">
   <a href="/" aria-label="Stage home" className="setup-logo"><img src="/auth/signup-logo.svg" alt="Stage"/></a>

   <header className="resource-modal-heading"><p>Step {step} of 3</p><div className="setup-progress" aria-label={`Step ${step} of 3`}>{[1,2,3].map(n=><span key={n} data-active={n<=step}/>)}</div><h1 ref={heading} tabIndex={-1} id="setup-title">{headings[step-1]}</h1><p>{subtitles[step-1]}</p></header>
   <form onSubmit={e=>{e.preventDefault();void advance();}}>
    <div className="resource-modal-body">
     {step===1&&<>
      <PhotoField compact value={draft.customAvatar} onChange={customAvatar=>setDraft(p=>({...p,customAvatar}))}/>
      <div className="form-field"><label htmlFor="setup-name">Display name</label><input id="setup-name" autoComplete="name" required maxLength={60} value={draft.name} onChange={e=>{const name=e.target.value;setDraft(p=>({...p,name,...(!handleTouched?{handle:suggestedHandle(name)}:{})}));}}/></div>
      <div className="form-field"><label htmlFor="setup-handle">Username</label><input id="setup-handle" required minLength={2} maxLength={24} pattern="[a-z0-9_]{2,24}" autoComplete="username" value={draft.handle} aria-describedby="handle-status" aria-invalid={!validHandle||(!preview&&handle===draft.handle&&availability?.available===false)} onChange={e=>{setHandleTouched(true);setDraft(p=>({...p,handle:e.target.value.toLowerCase()}));}}/><p id="handle-status" role="status" className="form-note">{!validHandle?'Use 2–24 letters, numbers or underscores.':available?<span className="username-available"><Check size={12} weight="bold" aria-hidden="true"/>Username available</span>:availability?.available===false&&handle===draft.handle?'This username is already taken.':'Checking availability…'}</p>{availability?.suggestion&&!availability.available&&handleTouched&&<button type="button" className="text-button" onClick={()=>setDraft(p=>({...p,handle:availability.suggestion}))}>Use {availability.suggestion}</button>}</div>
     </>}
     {step===2&&<><RolePicker value={draft.roles} onChange={roles=>setDraft(p=>({...p,roles}))}/><div className="form-field"><label htmlFor="setup-bio">Short bio <span>(optional)</span></label><textarea id="setup-bio" maxLength={220} placeholder="One line about what you build." value={draft.bio} onChange={e=>setDraft(p=>({...p,bio:e.target.value}))}/><p className="form-note">{draft.bio.length}/220</p></div></>}
     {step===3&&<>
      <fieldset><legend>Tools</legend><div className="technology-search"><label className="sr-only" htmlFor="setup-tools">Search marketplace tools</label><input id="setup-tools" type="search" placeholder="Search tools" autoComplete="off" value={toolQuery} onChange={e=>setToolQuery(e.target.value)}/>{tools.length>0&&<div className="technology-search-results">{tools.map(item=><button key={item.id} type="button" onClick={()=>{setDraft(p=>({...p,items:[...p.items,item.id]}));setToolQuery('')}}><img src={item.icon} alt="" width={16} height={16}/>{item.name}<span aria-hidden="true">+</span></button>)}</div>}{toolQuery.trim()&&tools.length===0&&<p className="form-note" role="status">No more matching tools.</p>}{catalog.some(item=>item.type==='Tools'&&draft.items.includes(item.id))&&<div className="technology-selected">{catalog.filter(item=>item.type==='Tools'&&draft.items.includes(item.id)).map(item=><button key={item.id} type="button" aria-label={`Remove ${item.name}`} onClick={()=>setDraft(p=>({...p,items:p.items.filter(id=>id!==item.id)}))}><img src={item.icon} alt="" width={16} height={16}/>{item.name}<X size={12} weight="bold" className="chip-remove" aria-hidden="true"/></button>)}</div>}</div></fieldset>
      <fieldset><legend>Technologies</legend><TechnologyPicker value={draft.technologies} onChange={technologies=>setDraft(p=>({...p,technologies}))}/></fieldset>
      <ContactFields profileStyle draft={draft} onChange={update}/>
     </>}
     {error&&<p className="field-error" role="alert">{error}</p>}
    </div>
    <div className="resource-modal-actions setup-actions">{step>1&&<button type="button" className="resource-modal-secondary" disabled={busy} onClick={()=>{setError('');setStep((step-1) as Step);}}>Back</button>}{step>1&&<button type="button" className="setup-skip" disabled={busy} onClick={()=>void advance(true)}>Skip</button>}<button className="resource-modal-primary" disabled={busy||!validName||!validHandle||!available}>{busy?'Saving…':step===3?'Finish':'Continue'}</button></div>
   </form>
  </div></section>
  <aside className="setup-art-column" aria-label="Live profile preview"><div className="setup-preview"><div className="setup-art" aria-hidden="true"><img src="/auth/signup-brand.png" alt=""/><div/></div><div className="setup-preview-content"><div className="setup-profile-card"><div inert><ProfileView profile={draft} owner={false} avatar={draft.customAvatar}/></div>{(draft.items.length>0||draft.technologies.length>0)&&<div className="setup-preview-stack">{catalog.filter(item=>draft.items.includes(item.id)).map(item=><span key={item.id}><img src={item.icon} alt="" width={16} height={16}/>{item.name}</span>)}{draft.technologies.map(tech=><span key={tech}><TechnologyLabel id={tech}/></span>)}</div>}</div></div></div></aside>
 </div>;
}
