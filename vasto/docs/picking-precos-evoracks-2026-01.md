# Atualização dos preços de picking — 16/11/2026

Fonte: `TABELA_EVORACKS_2026.01.pdf`, tabela válida a partir de **13/04/2026**, páginas 30–39 (Porteco) e 42 (componentes de arrumação vertical). Aplicados os valores da coluna **PVP**, sem aplicar aumentos percentuais, descontos ou IVA por aproximação.

SHA-256 do PDF de origem: `58d075b64edd6b36d7f99fb8596c741915e05d02da5e9c4b8bd4b43c49d958c9`.

A comparação foi feita por acabamento, medidas e tipo de componente. Uma segunda verificação independente conferiu a posição vertical de cada código do fornecedor e do respetivo PVP no PDF: **353 correspondências, sem diferenças**. As páginas 34, 37, 38 e 39 também foram renderizadas para conferência visual.

O ficheiro [CSV de conferência](picking-precos-evoracks-2026-01.csv) contém os 361 artigos finais da família 3, com preço anterior, preço atual, página, código do fornecedor e estado. Os códigos desse relatório são os códigos do fornecedor; as referências internas existentes e a ordem dos artigos foram preservadas.

## Alterações

| Grupo | Preços atualizados | Sob consulta |
|---|---:|---:|
| Bastidores pintados | 63 | 0 |
| Bastidores galvanizados standard | 63 | 0 |
| Vigas Z60 / Z100 | 17 | 0 |
| Prateleiras em aglomerado de 19 mm | 81 | 0 |
| Prateleiras metálicas galvanizadas | 78 | 3 |
| Reforços laterais, centrais e para painéis metálicos | 27 | 0 |
| Freio de segurança | 1 | 0 |
| Vigas em tubo 50×30 e braços de separação | 4 | 0 |
| **Total** | **334** | **3** |

A descrição da viga Z100 de 2000 mm foi corrigida de `690g` para `690Kg`, conforme a tabela de cargas da página 72. As cargas indicadas nos nomes das vigas referem-se ao par; o preço é por viga.

## 16 artigos acrescentados

| Artigo | PVP (€) | Página |
|---|---:|---:|
| Calço de nivelação Picking galvanizado | 0,76 | 33 |
| Bucha metálica Picking M8×75, conjunto de 2 unidades | 4,47 | 33 |
| Distanciador bastidor-bastidor 100 mm | 2,42 | 33 |
| Distanciador bastidor-bastidor 200 mm | 4,82 | 33 |
| Distanciador bastidor-bastidor 300 mm | 7,25 | 33 |
| Sapata metálica Picking com parafusos | 2,21 | 33 |
| União de pilares Picking de 40 mm | 4,47 | 33 |
| Viga tubo oval 1000 mm | 7,59 | 34 |
| Viga tubo oval 1250 mm | 9,19 | 34 |
| Viga tubo oval 1500 mm | 12,20 | 34 |
| Viga tubo oval 1750 mm | 14,07 | 34 |
| Viga tubo oval 2000 mm | 15,97 | 34 |
| Travessa de reforço para pneus 400 mm | 6,71 | 34 |
| Travessa de reforço para pneus 500 mm | 7,45 | 34 |
| Base OSB 1500×500×22 mm | 35,66 | 42 |
| Base OSB 1750×500×22 mm | 35,66 | 42 |

Foram acrescentados os componentes individuais em falta. Os kits completos de arrumação vertical, porta-bobinas e bancadas constituem outras propostas montadas do catálogo e não foram introduzidos como componentes do simulador picking.

## Casos que exigem distinção

- **Freio PTGOUP:** a página 34 apresenta **0,44 € por 2 unidades**. O catálogo e os simuladores já contam freios individuais (4 por nível), pelo que o preço aplicado é **0,22 €/unidade**. O nome existente foi preservado para manter as ligações dos simuladores.
- **Prateleiras metálicas 2600×400, 2600×500 e 2600×800×19 mm:** o PDF indica **Consultar**. Os preços antigos foram substituídos por `null`, com `priceOnRequest: true`. O editor mostra «Preço sob consulta» e impede a seleção com preço automático. Após confirmação do fornecedor, pode usar-se um item personalizado. Os simuladores só aceitam configurações com preços numéricos e não usam estas medidas como artigos gratuitos.
- **Sete bastidores especiais sem correspondência no PDF:** mantidos os valores anteriores, sem os apresentar como confirmados pela tabela: 800×700, 950×600, 950×700 e 1000×700 mm a **23,61 €**; 1500×800 mm a **33,29 €**; 1000×1100 e 1000×1200 mm a **29,00 €**. Os dois últimos mantêm `workbenchOnly: true`.
- **Z100 de 1250 mm:** usado o código `PTLZ1250-100`, **15,13 €**; a descrição nessa linha do PDF repete incorretamente «1000 mm». A página 72 confirma a existência da medida de 1250 mm.
- **Z60 de 2600 mm:** aparece na tabela de cargas da página 72, mas não tem PVP na página 34. Não foi inventado um preço nem acrescentado um artigo com preço estimado.
- Os valores pouco regulares do PDF, como aglomerado 1250×600 mm a 20,33 € e painel metálico 2250×700 mm a 68,61 €, foram transcritos tal como estão na fonte.

As famílias de referências 0, 1, 2, 4, 5 e 6 e os descontos foram mantidos. Os orçamentos já guardados não são recalculados retroativamente.

## Artigo adicional — TAB200-2-M

Acrescentada à família **ref. 3** a **Bancada Porteco com prateleira 2000×800×920 mm, RAL 5005 / 7035**, correspondente ao código `TAB200-2M` da página 43 da tabela (código indicado pelo utilizador: `TAB200-2-M`).

Preço definido pelo utilizador: **256,01 € sem IVA + 100% = 512,02 €/unidade sem IVA**. O IVA não está incluído no preço do artigo: é calculado no resumo final do orçamento. Para uma unidade sem descontos, IVA de 23% = **117,76 €**, total **629,78 €**. Os descontos habituais do orçamento continuam a aplicar-se se forem selecionados.

Esta adição é posterior à conferência original dos 360 artigos e está também incluída no CSV de conferência.
