export function customerPhone(value) {
  const phone = String(value || '').trim().replace(/[ \t]+/g, ' ');
  const digits = phone.replace(/\D/g, '');
  if (phone && (phone.length > 80 || !/^[+\d ()/.,;-]+$/.test(phone) || digits.length < 7 || digits.length > 30)) throw Object.assign(new Error('Confirme o contacto telefónico do cliente.'), { status: 400 });
  return phone;
}
