import type { Profile } from './MarketplaceState';
export function readLocalProfile(): Profile | null {
 if (!import.meta.env.DEV || typeof window === 'undefined') return null;
 if(localStorage.getItem('stage-profile-preview-signed-out')==='1')return null;
 try {
  const profile = JSON.parse(localStorage.getItem('stage-profile-preview') || 'null') || JSON.parse(localStorage.getItem('stage-profile-setup-v1:local-preview') || 'null')?.profile;
  return profile && typeof profile.name === 'string' && Array.isArray(profile.items) ? profile : null;
 } catch { return null; }
}
export function writeLocalProfile(profile: Profile) {
 if (import.meta.env.DEV) localStorage.setItem('stage-profile-preview', JSON.stringify(profile));
}
