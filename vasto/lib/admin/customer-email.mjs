export function customerEmail(value) {
  const email=String(value || "").trim();
  if (email && (email.length>254 || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email))) throw Object.assign(new Error("Confirme o email do cliente."),{status:400});
  return email;
}
