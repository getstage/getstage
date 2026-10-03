import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { makeFunctionReference } from 'convex/server';
import type { Profile } from './MarketplaceState';
import { useAuth } from '@/lib/auth';
import { readLocalProfile } from './localProfile';

const myProfile = makeFunctionReference<'query', Record<string, never>, Profile | null>('builderProfiles:mine');

export function AccountMenu(_props: { mobile?: boolean }) {
 const [mounted,setMounted]=useState(false);
 useEffect(()=>setMounted(true),[]);
 return mounted?<ConnectedAccount/>:<a className="nav-link login-link" href="/auth?mode=login&redirect=%2Fprofile">Log in</a>;
}
function ConnectedAccount() {
 const {isAuthenticated,isLoading,user}=useAuth();
 const profile=useQuery(myProfile,isAuthenticated?{}:'skip');
 const localProfile=readLocalProfile();
 const preview=!!localProfile;
 const avatar=(isAuthenticated?profile?.customAvatar:localProfile?.customAvatar)||user?.avatarUrl;
 if(isAuthenticated||preview)return <a className="nav-link profile-nav-link" href={preview&&!isAuthenticated?'/profile?preview=1':'/profile'}><ProfileNavAvatar key={avatar || "placeholder"} src={avatar}/><span>My Profile</span></a>;
 if(isLoading)return <span className="nav-link" aria-label="Loading account" role="status" style={{width: 62, height: 14, borderRadius: 4, background: "rgba(255,255,255,.12)"}} />;
 return <a className="nav-link login-link" href="/auth?mode=login&redirect=%2Fprofile">Log in</a>;
}

function ProfileNavAvatar({src}:{src?:string}) {
 const [failed,setFailed]=useState(false);
 return <span className="profile-nav-avatar"><svg className="profile-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M5.5 18.2a6.8 6.8 0 0 1 13 0"/></svg>{src&&!failed&&<img src={src} alt="" width={20} height={20} onError={()=>setFailed(true)}/>}</span>;
}
