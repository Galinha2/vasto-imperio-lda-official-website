export const signatureText = "Com os melhores cumprimentos,\n\nHenrique Galinha | Vasto Império Lda.\n\nRua Principal n31 - Cabecinha\n2475-014 - Benedita\n\nT. +351 928 348 117 (Chamada para a rede móvel nacional)\nE. geral@vastoimperio.pt\nW. vastoimperio.pt";

export function emailSignature(logo = "cid:vasto-signature-logo") {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;font-family:Arial,Helvetica,sans-serif;color:#252525;max-width:540px;width:100%">
    <tr><td style="padding:0 0 18px;font-size:14px;line-height:22px">Com os melhores cumprimentos,</td></tr>
    <tr><td style="padding:0 0 14px;font-size:14px;line-height:22px;font-weight:bold">Henrique Galinha <span style="color:#a1a1a6;font-weight:normal">|</span> Vasto Império Lda.</td></tr>
    <tr><td><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="110" valign="top" style="padding:0 18px 0 0"><a href="https://www.vastoimperio.pt/" style="text-decoration:none"><img src="${logo}" alt="Vasto Império" width="100" height="75" style="display:block;width:100px;height:75px;border:0;object-fit:contain" /></a></td>
      <td valign="top" style="border-left:2px solid #ff5500;padding:0 0 0 18px;font-size:12px;line-height:20px;color:#555555">
        Rua Principal n31 - Cabecinha<br />2475-014 - Benedita<br />
        <span style="color:#ff5500;font-weight:bold">T.</span> <a href="tel:+351928348117" style="color:#333333;text-decoration:none">+351 928 348 117</a><br />
        <span style="font-size:10px;color:#888888">(Chamada para a rede móvel nacional)</span><br />
        <span style="color:#ff5500;font-weight:bold">E.</span> <a href="mailto:geral@vastoimperio.pt" style="color:#333333;text-decoration:none">geral@vastoimperio.pt</a><br />
        <span style="color:#ff5500;font-weight:bold">W.</span> <a href="https://www.vastoimperio.pt/" style="color:#0879c0;text-decoration:none">vastoimperio.pt</a>
      </td>
    </tr></table></td></tr>
  </table>`;
}

export function signedEmail(message) {
  message = message.replace(/(?:\r?\n)*\s*Com os melhores cumprimentos[,!.]?\s*$/i, "").trimEnd();
  const escaped = message.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  return {
    text: `${message}\n\n${signatureText}`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#252525"><div>${escaped.replace(/\r?\n/g, "<br />")}</div>${emailSignature()}</div>`,
  };
}
