// Older Home Screen installations can retain the original inbox start URL.
export function adminLaunchDestination(pathname, search, standalone) {
  if (!standalone || pathname.replace(/\/$/, '') !== '/admin/conversas') return null;
  const chat = new URLSearchParams(search).get('chat');
  // A notification deep link must keep its conversation destination.
  if (/^[a-f0-9]{64}$/.test(chat || '')) return null;
  return '/admin';
}
