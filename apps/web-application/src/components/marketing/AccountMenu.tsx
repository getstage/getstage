import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { readLocalProfile } from './localProfile';

export function AccountMenu(_props: { mobile?: boolean }) {
 const [mounted,setMounted]=useState(false);
 useEffect(()=>setMounted(true),[]);
 return mounted?<ConnectedAccount/>:<a className="nav-link login-link" href="/auth?mode=login&redirect=%2Fprofile">Log in</a>;
}
function ConnectedAccount() {
 const {isAuthenticated,isLoading}=useAuth();
 const preview=!!readLocalProfile();
 if(isAuthenticated||preview)return <a className="nav-link profile-nav-link" href={preview&&!isAuthenticated?'/profile?preview=1':'/profile'}>My Profile</a>;
 if(isLoading)return <span className="nav-link" aria-label="Loading account">…</span>;
 return <a className="nav-link login-link" href="/auth?mode=login&redirect=%2Fprofile">Log in</a>;
}
