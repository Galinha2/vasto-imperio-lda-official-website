import { saleNotifications } from './store.mjs';
import { incomingMessages, unreadChatCounts } from '../chat.mjs';

export async function adminUpdates({ salesSince, chatSince }, dependencies = {}) {
  for (const value of [salesSince, chatSince]) {
    if (value && !Number.isFinite(Date.parse(value))) throw Object.assign(new Error('Data inválida.'), {status:400});
  }
  const keys = ['sales', 'chat', 'counts'];
  const results = await Promise.allSettled([
    (dependencies.sales || saleNotifications)(salesSince),
    (dependencies.chat || incomingMessages)(chatSince),
    (dependencies.unread || unreadChatCounts)(),
  ]);
  // A chat outage must not disable new-quote notifications (or vice versa).
  if (results.every(result => result.status === 'rejected')) throw results[0].reason;
  return Object.fromEntries(results.map((result, index) => [keys[index], result.status === 'fulfilled' ? result.value : null]));
}
