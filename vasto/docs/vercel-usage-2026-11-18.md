# Redução de pedidos e CPU — 18/11/2026

## Situação comunicada

O painel Vercel mostrou 4h16m de Active CPU para uma quota de 4h, cerca de 1 milhão de CDN Requests e 927 mil Function Invocations para uma quota de 1 milhão. CPU e pedidos CDN já ultrapassaram o limite; as invocações estão próximas. Os restantes recursos indicados ainda estão abaixo das respetivas quotas.

As alterações no repositório reduzem o consumo futuro. Não apagam o consumo acumulado, não levantam a suspensão e ainda precisam de ser publicadas. A poupança real de CPU/CDN só poderá ser medida depois da publicação.

## Fontes de consumo encontradas e correções

| Mecanismo | Antes | Depois |
|---|---|---|
| Chat público nunca aberto | GET a cada 4 s, mesmo sem conversa | Nenhum pedido antes de abrir |
| Chat aberto sem conversa existente | GET a cada 4 s | Uma consulta ao abrir; sem repetição até existir conversa |
| Chat público com conversa aberta | GET a cada 4 s | GET a cada 5 s, apenas com página visível e ligação disponível |
| Conversa pública já iniciada, painel fechado | GET a cada 4 s | GET a cada 60 s, apenas com página visível |
| Presença do visitante | POST a cada 15 s, incluindo página oculta | Mantém heartbeat de 15 s enquanto visível; ao ocultar envia saída uma vez |
| Avisos gerais do administrador | Vendas e mensagens em dois pedidos a cada 4 s | Um pedido combinado a cada 30 s |
| Contagem de mensagens por ler | Outro pedido a cada 10 s | Incluída no pedido combinado; consultas pontuais ao abrir/focar e marcar leitura |
| Administração oculta com push ativo | Consultas a cada 4 s | Sem consultas periódicas; Web Push continua independente |
| Administração oculta sem push | Consultas a cada 4 s | Fallback a cada 120 s |
| Lista de conversas | GET a cada 30 s | GET a cada 60 s e atualização quando chega evento de mensagem |
| Conversa selecionada no administrador | GET a cada 3 s | GET a cada 5 s, só visível |
| Várias abas administrativas | Cada aba consultava separadamente | Canal entre abas, Web Locks e timestamps partilham as verificações gerais |
| Rede desligada / falhas repetidas | Novas tentativas ao ritmo normal | Pausa offline; espera progressiva em erros, até 5 minutos |

As respostas privadas não são guardadas em localStorage nem em cache público. O canal entre abas mantém apenas a última resposta em memória. Nestas verificações, o armazenamento do navegador contém timestamps de coordenação e cursores temporais, sem nomes, mensagens ou dados de clientes. Navegadores sem as APIs de coordenação mantêm consultas independentes, mas com os novos intervalos e pausas.

O endpoint `/api/admin/updates` mantém autenticação de administrador e `Cache-Control: private, no-store`. Consulta vendas, novas mensagens e contagens em paralelo. Uma falha isolada no chat não bloqueia os avisos de vendas. Mantêm-se os cursores inclusivos e a deduplicação por ID.

No chat público, uma conversa anterior é recuperada quando o visitante volta a abrir o chat; não se consulta o servidor só por carregar uma página. Depois de uma conversa ser carregada/iniciada nessa aba, a contagem de respostas continua a atualizar com o painel fechado, no intervalo mais lento.

## Estimativa limitada às verificações gerais

Sem ações manuais ou conversa aberta, os dois feeds de 4 segundos e o contador de 10 segundos representavam aproximadamente **36 pedidos por minuto por aba**. O novo pedido combinado representa **2 por minuto**, uma redução teórica de **94,4% nesse conjunto de consultas**. Não é uma estimativa de redução de toda a conta Vercel: páginas, imagens, robôs, emails, PDFs e ações do utilizador também contam.

As páginas públicas principais já são pré-geradas na compilação. Não foi aplicado cache público às APIs privadas nem removida a proteção de acesso para diminuir CPU.

## Publicação e confirmação na Vercel

1. Enquanto o alojamento estiver suspenso, fechar as abas antigas do site/admin evita que o JavaScript anteriormente carregado continue a tentar consultar APIs.
2. Publicar estas alterações quando a Vercel permitir deployments e servir projetos. A redução de consumo, isoladamente, não repõe a quota já gasta.
3. Confirmar no ambiente publicado: abrir o site sem chat não gera pedidos `/api/chat`; abrir uma conversa permite enviar e receber; minimizar pausa consultas; testar push real num dispositivo registado.
4. Em Usage/Observability, comparar períodos equivalentes, filtrando pelo projeto e rota. Os avisos passam para `/api/admin/updates`; consultar especialmente `/api/chat` e `/api/admin/chat`.
5. Separar tráfego real de robôs antes de criar regras de firewall. Não bloquear APIs, crawlers de pesquisa ou visitantes por aproximação.
6. Acompanhar Active CPU, CDN Requests e Function Invocations. Os restantes valores mostrados não justificam eliminar documentos, imagens ou dados de vendas.

Referências: https://vercel.com/docs/plans/hobby e https://vercel.com/docs/pricing/manage-and-optimize-usage.

## Validação local

- 32 testes de polling, coordenação entre abas, precisão dos timestamps, autenticação, cursores, falhas parciais, chat e Web Push passaram.
- Chrome com respostas fictícias e temporizadores acelerados: zero pedidos do chat nunca aberto; uma consulta ao abrir sem conversa; receção de respostas numa conversa existente; consultas mais lentas ao fechar; ausência de GET e heartbeats quando a página fica oculta.
- Compilação `npx next build --webpack` concluída, com 58 páginas estáticas geradas e o novo endpoint privado incluído.
- Não houve deploy, acesso às métricas privadas da conta nem teste de entrega push num dispositivo real nesta alteração.
