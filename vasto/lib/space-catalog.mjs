export function spaceModelCost(model, levels = 4) {
  return [...model.fixedParts, ...model.levelParts.map((p) => ({ ...p, quantity: p.quantity * levels }))].reduce((sum, p) => sum + Math.round(p.price * 100) * p.quantity, 0);
}

const price = (p) => p?.["preço"];
const dimensions = (p) => p.produto.match(/(\d+)x(\d+)(?:x\d+)?\s*mm/i);
const cheapest = (items) => items.filter((p) => typeof price(p) === "number" && price(p) > 0).sort((a, b) => price(a) - price(b))[0];

export function spaceCatalog(products) {
  const result = [];
  for (const type of ["ligeiras", "picking", "racks"]) {
    const ref = type === "ligeiras" ? 1 : type === "picking" ? 3 : 2;
    const items = products.filter((p) => p.ref === ref);
    const frames = items.filter((p) => p.produto.startsWith(type === "ligeiras" ? "Bastidor Ligeiro " : type === "picking" ? "Bastidor Picking" : "Bastidor Industrial") && !p.produto.includes("L7100") && price(p) > 0);
    for (const frame of frames) {
      const d = dimensions(frame); if (!d) continue;
      const height = Number(d[1]) / 1000, depth = Number(d[2]) / 1000;
      if (height < 1.5) continue;
      const beams = type === "ligeiras" ? items.filter((p) => p.produto.startsWith("Tabuleiro ") && Number(dimensions(p)?.[2]) / 1000 === depth)
        : items.filter((p) => p.produto.startsWith(type === "picking" ? "Viga Z60" : "Vigas "));
      for (const beam of beams) {
        if (!(price(beam) > 0)) continue;
        const nominalWidth = type === "ligeiras" ? Number(dimensions(beam)?.[1]) / 1000 : Number(beam.produto.match(type === "picking" ? /c\/\s*(\d+)mm/ : /Vigas\s+(\d+)\s*mm/i)?.[1]) / 1000;
        if (!nominalWidth) continue;
        for (const material of type === "picking" ? ["Aglomerado", "Metálica"] : [null]) {
          const fixedParts = [{ name: frame.produto, quantity: 2, price: price(frame) }];
          const levelParts = [];
          if (type === "ligeiras") {
            const brace = cheapest(items.filter((p) => p.produto === `Travamento ${nominalWidth * 1000}mm`));
            // Catalogue names may include a space before mm.
            const chosenBrace = brace || cheapest(items.filter((p) => p.produto.startsWith("Travamento ") && Number(p.produto.match(/(\d+)\s*mm/)?.[1]) === nominalWidth * 1000));
            if (!chosenBrace) continue;
            fixedParts.push({ name: chosenBrace.produto, quantity: height >= 3 ? 3 : 2, price: price(chosenBrace) });
            levelParts.push({ name: beam.produto, quantity: 1, price: price(beam) });
          } else {
            const brake = cheapest(items.filter((p) => p.produto === (type === "picking" ? "Freio de segurança Picking" : "Freio de segurança")));
            if (!brake) continue;
            levelParts.push({ name: beam.produto, quantity: 2, price: price(beam) }, { name: brake.produto, quantity: 4, price: price(brake) });
            if (type === "picking") {
              const shelf = cheapest(items.filter((p) => p.produto.startsWith(material === "Aglomerado" ? "Prat. Madeira" : "Prat.") && (material !== "Metálica" || !p.produto.startsWith("Prat. Madeira")) && Number(dimensions(p)?.[1]) / 1000 === nominalWidth && Number(dimensions(p)?.[2]) / 1000 === depth));
              const findReinforcement = (kind) => cheapest(items.filter((p) => p.produto.startsWith(material === "Metálica" ? "Reforço para prateleiras metálicas" : `Reforço ${kind}`) && p.produto.includes(`${depth * 1000}mm`)));
              const central = findReinforcement("central"), lateral = findReinforcement("lateral");
              if (!shelf || !central || !lateral) continue;
              levelParts.push({ name: shelf.produto, quantity: 1, price: price(shelf) }, { name: central.produto, quantity: nominalWidth <= 2 ? 1 : 2, price: price(central) }, { name: lateral.produto, quantity: 2, price: price(lateral) });
            }
          }
          result.push({ type, width: nominalWidth + (type === "racks" ? 0.1 : 0.05), nominalWidth, depth, height, material, fixedParts, levelParts });
        }
      }
    }
  }
  return result;
}

export function estimateSpacePlan(plan, models, levels = 4, material = "Aglomerado") {
  const lines = new Map();
  const countedFrames = new Set();
  for (const shelf of plan.shelves) {
    const width = shelf.runWidth || Math.max(shelf.w, shelf.h);
    const choices = models.filter((m) => Math.abs(m.width - width) < 0.001 && Math.abs(m.depth - (shelf.depth || Math.min(shelf.w, shelf.h))) < 0.001 && m.height === shelf.height && (!m.material || m.material === material));
    const cost = (m) => spaceModelCost(m, levels);
    const chosen = choices.sort((a, b) => cost(a) - cost(b))[0];
    if (!chosen) return null;
    const vertical = ["left", "right", "center"].includes(shelf.wall) || (!shelf.wall && shelf.h > shelf.w);
    const ends = vertical
      ? [[shelf.x, shelf.y, shelf.x + shelf.w, shelf.y], [shelf.x, shelf.y + shelf.h, shelf.x + shelf.w, shelf.y + shelf.h]]
      : [[shelf.x, shelf.y, shelf.x, shelf.y + shelf.h], [shelf.x + shelf.w, shelf.y, shelf.x + shelf.w, shelf.y + shelf.h]];
    const frame = chosen.fixedParts[0];
    let frameCount = 0;
    for (const end of ends) {
      const key = `${frame.name}|${frame.price}|${end.map((n) => Math.round(n * 1000)).join(":")}`;
      if (!countedFrames.has(key)) { countedFrames.add(key); frameCount++; }
    }
    const fixedParts = [{ ...frame, quantity: frameCount }, ...chosen.fixedParts.slice(1)];
    for (const part of [...fixedParts, ...chosen.levelParts.map((p) => ({ ...p, quantity: p.quantity * levels }))]) {
      const key = `${part.name}|${part.price}`;
      const line = lines.get(key) || { ...part, quantity: 0 };
      line.quantity += part.quantity; lines.set(key, line);
    }
  }
  const parts = [...lines.values()];
  const cents = parts.reduce((sum, p) => sum + Math.round(p.price * 100) * p.quantity, 0);
  return { subtotal: cents / 100, vat: Math.round(cents * 0.23) / 100, total: (cents + Math.round(cents * 0.23)) / 100, parts };
}
