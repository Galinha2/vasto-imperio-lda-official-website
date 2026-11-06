export const ADMIN_PREFERENCES_KEY = 'vasto-admin-preferences-v1';
export const defaultAdminPreferences = Object.freeze({ theme:'system', sound:true, volume:40, desktop:true, inApp:true, sales:true, chat:true, preview:false, mutedChatIds:[] });
export function normalizeAdminPreferences(value) {
  const source = value && typeof value === 'object' ? value : {};
  const next = {...defaultAdminPreferences};
  if (['light','dark','system'].includes(source.theme)) next.theme = source.theme;
  for (const key of ['sound','desktop','inApp','sales','chat','preview']) if (typeof source[key] === 'boolean') next[key] = source[key];
  if (typeof source.volume === 'number' && Number.isFinite(source.volume)) next.volume = Math.max(0,Math.min(100,Math.round(source.volume)));
  next.mutedChatIds = [...new Set(Array.isArray(source.mutedChatIds) ? source.mutedChatIds.filter(id => typeof id === 'string' && /^[a-f0-9]{64}$/.test(id)) : [])].slice(-500);
  return next;
}
