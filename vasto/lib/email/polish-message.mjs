// Local, deterministic writing assistance. No external service or API key.
export function polishEmailMessage(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const protectedValues = [];
  let text = value.replace(/https?:\/\/[^\s]+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\d+(?:[.,:/×x-]\d+)*(?:[ \t]*(?:€|%|mm|cm|m|kg|EUR))?/gi, (match) => {
    protectedValues.push(match);
    return `\uE000${protectedValues.length - 1}\uE001`;
  });
  const changes = [
    [/\bpfv\b|\bsff\b|\bporfavor\b/gi, 'por favor'],
    [/\bobg\b|\bobrigdo\b/gi, 'obrigado'],
    [/\bnao\b/gi, 'não'], [/\btambem\b/gi, 'também'],
    [/\bpossivel\b/gi, 'possível'], [/\bdisponivel\b/gi, 'disponível'],
    [/\borcamentos\b/gi, 'orçamentos'], [/\borcamento\b/gi, 'orçamento'],
    [/\bsegue em anexo o or[çc]amento pedido\b/gi, 'segue em anexo o orçamento solicitado'],
    [/\baqui vai o or[çc]amento pedido\b/gi, 'segue em anexo o orçamento solicitado'],
    [/\baqui vai o or[çc]amento\b/gi, 'segue em anexo o orçamento'],
    [/\bmande-me\b/gi, 'envie-me'],
    [/\bse tiver(?:em)? alguma d[úu]vida\b/gi, 'caso tenha alguma dúvida'],
    [/\bqualquer d[úu]vida diga\b/gi, 'caso tenha alguma dúvida, estou disponível para esclarecer'],
    [/\bfico [àa] espera da sua resposta\b/gi, 'fico a aguardar a sua resposta'],
  ];
  for (const [pattern, replacement] of changes) text = text.replace(pattern, replacement);
  text = text.replace(/\r\n?/g, '\n').split('\n').map((line) => {
    let result = line.trim().replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+([,;!?])/g, '$1').replace(/([,;!?])(?=[\p{L}])/gu, '$1 ');
    result = result.replace(/(^|[.!?]\s+)(\p{Ll})/gu, (_, prefix, letter) => prefix + letter.toLocaleUpperCase('pt-PT'));
    return result;
  }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  text = text.replace(/^(ol[áa]|bom dia|boa tarde|boa noite)[,!\s]*(?=\S)/i, (_, greeting) => `${/^ola$/i.test(greeting) ? 'Olá' : greeting[0].toUpperCase() + greeting.slice(1).toLowerCase()},\n\n`);
  if (!/^(ol[áa]\b|bom dia\b|boa tarde\b|boa noite\b|car[oa]s?\b|exm[oa])/i.test(text)) text = `Bom dia,\n\n${text}`;
  text = text.replace(/(^|\n)(\p{Ll})/gu, (_, prefix, letter) => prefix + letter.toLocaleUpperCase('pt-PT'));
  text = text.replace(/\uE000(\d+)\uE001/g, (_, index) => protectedValues[Number(index)]);
  if (!/[.!?:;,]$/.test(text) && !/https?:\/\/\S+$|\S+@\S+$/.test(text)) text += '.';
  return text;
}
