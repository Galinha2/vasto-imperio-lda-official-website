'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ADMIN_PREFERENCES_KEY, defaultAdminPreferences, normalizeAdminPreferences } from '@/lib/admin/preferences.mjs';
const Context = createContext(null);
export const useAdminPreferences = () => useContext(Context);
export default function AdminPreferences({children}) {
  const [preferences,setPreferences] = useState({...defaultAdminPreferences});
  const [ready,setReady] = useState(false);
  const [systemDark,setSystemDark] = useState(false);
  const [storageError,setStorageError] = useState('');
  const [permission,setPermission] = useState('unsupported');
  const refreshPermission = useCallback(() => setPermission('Notification' in window && window.isSecureContext ? Notification.permission : 'unsupported'),[]);
  useEffect(() => {
    const read = () => {try {setPreferences(normalizeAdminPreferences(JSON.parse(localStorage.getItem(ADMIN_PREFERENCES_KEY) || '{}')));}catch {/* Use defaults if storage is unavailable. */}};
    read();setReady(true);refreshPermission();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const system = () => setSystemDark(media.matches);system();media.addEventListener('change',system);
    const storage = event => {if(event.key===ADMIN_PREFERENCES_KEY) read();};
    const focus = () => refreshPermission();
    window.addEventListener('storage',storage);window.addEventListener('focus',focus);
    return () => {media.removeEventListener('change',system);window.removeEventListener('storage',storage);window.removeEventListener('focus',focus);};
  },[refreshPermission]);
  const update = useCallback(patch => {
    setPreferences(current => {
      const next=normalizeAdminPreferences({...current,...patch});
      try {localStorage.setItem(ADMIN_PREFERENCES_KEY,JSON.stringify(next));setStorageError('');}
      catch {setStorageError('As alterações estão ativas, mas este navegador não permitiu guardá-las para a próxima visita.');}
      return next;
    });
  },[]);
  const requestPermission = async () => {
    if (!('Notification' in window) || !window.isSecureContext) return 'unsupported';
    try {const result=await Notification.requestPermission();setPermission(result);if(result==='granted')update({desktop:true});return result;}
    catch {refreshPermission();return 'error';}
  };
  const theme=preferences.theme==='system'?(systemDark?'dark':'light'):preferences.theme;
  useEffect(() => {
    document.documentElement.dataset.adminTheme = theme;
    return () => { delete document.documentElement.dataset.adminTheme; };
  }, [theme]);
  return <Context.Provider value={{preferences,ready,theme,update,permission,requestPermission,storageError}}>{children}</Context.Provider>;
}
