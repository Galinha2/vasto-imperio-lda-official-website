// Inclusive timestamp queries can repeat boundary messages; merge by ID.
export function mergeChatMessages(current, incoming) {
  const messages = new Map(current.map(message => [message.id, message]));
  for (const message of incoming) messages.set(message.id, message);
  return [...messages.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
}
