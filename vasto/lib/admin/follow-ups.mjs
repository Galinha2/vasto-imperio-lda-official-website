import { sameNotesCustomer } from './customer-notes.mjs';
export function followUpToday(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function dueFollowUps(sales, today = followUpToday()) {
  const visible = sales.filter((sale) => !sale.mergedInto && !sale.mergeArchived);
  const seen = new Set();
  const reminders = [];
  for (const owner of sales) {
    const target = visible.find((sale) => sale.id === owner.id) || visible.find((sale) => sameNotesCustomer(sale, owner));
    if (!target) continue;
    for (const note of owner.customerNotes || []) {
      if (!note.followUpDate || note.followUpDate > today || note.followUpCompletedAt || seen.has(note.id)) continue;
      seen.add(note.id);
      reminders.push({ id: note.id, saleId: target.id, customerName: target.customerName, text: note.text, category: note.category, date: note.followUpDate, overdue: note.followUpDate < today });
    }
  }
  return reminders.sort((a, b) => a.date.localeCompare(b.date) || a.customerName.localeCompare(b.customerName));
}
