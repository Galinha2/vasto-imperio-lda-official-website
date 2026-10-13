# Administração de vendas

Entrar em `/admin/login`. O dashboard fica em `/admin`. Estas rotas não têm links na navegação pública, têm `noindex` e ficam excluídas do sitemap. Todos os endpoints de vendas e PDFs exigem sessão assinada num cookie HttpOnly. A autenticação deste dashboard é independente do PIN antigo dos geradores de orçamento.

## Ativar na Vercel

1. Criar um projeto em [Supabase](https://supabase.com/dashboard).
2. No SQL Editor desse projeto, executar `supabase/admin-sales.sql`. Este ficheiro cria as tabelas de vendas e comissões e o bucket **privado** `sales-pdfs`; não concede acesso a utilizadores públicos. Se as vendas já estiverem configuradas, executar novamente o script para criar as tabelas de comissões e acrescentar a coluna da taxa mensal.
3. Nas variáveis de ambiente do projeto da Vercel, definir:

| Variável | Valor |
| --- | --- |
| `ADMIN_USERNAME` | Utilizador para iniciar sessão, por exemplo `admin` |
| `ADMIN_PASSWORD` | Palavra-passe forte, com pelo menos 12 caracteres |
| `ADMIN_SESSION_SECRET` | Segredo aleatório com pelo menos 32 caracteres |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave **service_role**, apenas no servidor |

4. Fazer novo deploy para aplicar as variáveis e entrar em `/admin/login`.

Não usar prefixos `NEXT_PUBLIC_` nestas variáveis. A chave do Supabase nunca é enviada para o navegador. Os PDFs são enviados com uma URL assinada temporária para o bucket privado e descarregados através do backend autenticado; não há URLs públicas dos documentos. A arquitetura segue o acesso controlado descrito na [documentação oficial de Storage do Supabase](https://supabase.com/docs/guides/storage/security/access-control).

### Manter o projeto Supabase ativo no plano gratuito

O Vercel executa diariamente uma consulta autenticada e apenas de leitura à tabela `admin_sales`. Não são inseridas vendas, PDFs ou dados artificiais. Para ativar o agendamento, definir também `CRON_SECRET` nas variáveis de ambiente de produção da Vercel com um segredo aleatório forte (por exemplo, gerar com `openssl rand -hex 32`) e fazer um novo deploy. A configuração está em `vercel.json`; o endpoint só aceita o pedido de cron autenticado.

Este ping reduz o risco de pausa por inatividade, mas não garante disponibilidade contínua: o agendamento Hobby pode atrasar até cerca de uma hora e a Vercel/Supabase podem ter falhas ou limites próprios. Um projeto já pausado poderá ter de ser retomado manualmente no painel Supabase. A documentação do Supabase indica que só o plano Pro garante que o projeto não é pausado por inatividade.

Se o bucket `sales-pdfs` já existir ou se a instalação já tiver registos, executar novamente `supabase/admin-sales.sql`. O script atualiza o limite/formats do bucket e migra os estados antigos para os campos independentes de orçamento, pagamento e entrega.

Uma configuração incompleta na Vercel bloqueia o registo de vendas, para evitar guardar documentos num disco temporário. Este projeto não cria uma conta ou um projeto Supabase automaticamente.

### Diagnóstico de erros de ligação

Se a administração indicar que o Supabase recusou o acesso, confirme na Vercel que `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` pertencem ao mesmo projeto e que a chave é a chave secreta `service_role` (não uma chave `anon`/publishable). Se indicar que o recurso não foi encontrado, execute `supabase/admin-sales.sql` no SQL Editor desse projeto e confirme o nome do bucket. Depois de alterar variáveis ou SQL, faça novo deploy. Para outros erros, consulte os logs da função `/api/admin/sales`; o log `[admin-sales-storage]` regista apenas o método, endpoint sem parâmetros, estado HTTP e código devolvido pelo Supabase — nunca a chave nem o conteúdo das vendas.

## Desenvolvimento local

Foram adicionadas credenciais locais a `.env.local`, que é ignorado pelo Git. Sem Supabase, os dados são guardados na pasta privada `.admin-data`, também ignorada pelo Git. Para escolher outro disco local persistente, definir `ADMIN_DATA_DIR`. Reiniciar o servidor de desenvolvimento depois de alterar variáveis de ambiente.

Os dados guardados localmente **não são sincronizados automaticamente** com Supabase. Para importar na instalação de produção, carregar novamente os PDFs originais.

## Utilização

- Importar um ou vários PDFs exportados pelas secções Orçamentos ou Simulador da área `/admin`, até 6 MB por ficheiro.
- No simulador admin, usar **Enviar para vendas** para registar o orçamento PDF e anexar automaticamente a imagem do desenho à mesma venda.
- Cliente, NIF, data, total sem IVA, IVA e total com IVA são extraídos automaticamente. Os documentos novos contêm também metadados para importação exata; os antigos são lidos pelo texto e pelas posições dos campos.
- Cada registo tem três acompanhamentos independentes: estado do orçamento (**A aguardar resposta / Confirmado pelo cliente**), pagamento (**Por pagar / Entrada paga / Pago**) e entrega (**Por entregar / Entregue**). O registo fica assinalado como **Resolvido** automaticamente quando está pago e entregue.
- A página **Comissões** calcula uma estimativa mensal sobre as vendas confirmadas sem IVA, permite definir uma percentagem própria para cada mês (com uma taxa predefinida para os restantes) e assinalar cada mês como pago. As percentagens e os estados mensais ficam sincronizados no Supabase; em desenvolvimento local, são guardados na pasta privada `.admin-data`.
- A data original do orçamento mantém-se. Ao mudar a entrega para **Entregue**, é pedida a data de entrega; a venda passa então a contar no mês da entrega, que pode ser corrigido ao lado do estado da entrega. Antes da entrega, as vendas confirmadas contam pelo mês em que foram confirmadas e os orçamentos a aguardar resposta pelo mês de emissão.
- Os totais de encomendas confirmadas incluem os orçamentos aceites pelo cliente, com valores sem IVA e com IVA separados. Os orçamentos que aguardam resposta são apresentados à parte; estes totais indicam valor contratado, não montantes já recebidos.
- O mesmo conteúdo PDF não pode ser registado duas vezes, mesmo com outro nome de ficheiro.
- O PDF original fica guardado e pode ser aberto pela linha da encomenda.
- A ação de imagens permite anexar, consultar e remover até 10 imagens JPG, PNG ou WebP (4 MB por imagem) a cada orçamento. Os anexos são privados e só ficam acessíveis com sessão de administrador.
- A ação de eliminar orçamento remove o registo, o PDF original e os respetivos anexos; esta operação é permanente.
- PDFs de terceiros, digitalizados sem texto, protegidos ou sem os campos obrigatórios são recusados, em vez de criar registos com valores estimados.

As sessões duram oito horas. O limite de tentativas de login é por instância do servidor; para instalações com grande exposição, pode ser complementado por rate limiting no fornecedor de hosting.
