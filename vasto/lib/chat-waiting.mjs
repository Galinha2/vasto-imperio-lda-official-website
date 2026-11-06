export const CHAT_REPLY_WAIT_MS = 4 * 60 * 1000;
// Follow-up messages and images do not restart the customer's waiting time.
export function unansweredSince(messages) {
  let since = null;
  for (const message of messages) {
    if (message.sender === 'staff') since = null;
    else if (message.sender === 'visitor' && since === null) {
      const time = Date.parse(message.created_at);
      if (Number.isFinite(time)) since = time;
    }
  }
  return since;
}
