const key = 'vasto-admin-update-cursors';
const valid = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
export function readUpdateCursors(storage, now = Date.now()) {
  try {
    const data = JSON.parse((storage || localStorage).getItem(key));
    if (!data || !Number.isFinite(data.at) || now - data.at > 300000 || now < data.at) return {};
    return { ...(valid(data.sales) && {sales:data.sales}), ...(valid(data.chat) && {chat:data.chat}) };
  } catch { return {}; }
}
export function saveUpdateCursors(data, storage, now = Date.now()) {
  try {
    const previous = readUpdateCursors(storage, now);
    const sales = data.sales?.cursor || previous.sales;
    const chat = data.chat?.cursor || previous.chat;
    (storage || localStorage).setItem(key, JSON.stringify({sales,chat,at:now}));
  } catch { /* No customer data is stored; tabs can poll independently. */ }
}
