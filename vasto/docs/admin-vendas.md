# Administração de vendas

Entrar em `/admin/login`. O dashboard fica em `/admin`. Estas rotas não têm links na navegação pública, têm `noindex` e ficam excluídas do sitemap. Todos os endpoints de vendas e PDFs exigem sessão assinada num cookie HttpOnly. A autenticação deste dashboard é independente do PIN antigo dos geradores de orçamento.

## Ativar na Vercel

1. Criar um projeto em [Supabase](https://supabase.com/dashboard).
2. No SQL Editor desse projeto, executar `supabase/admin-sales.sql`. Este ficheiro cria a tabela de vendas e o bucket **privado** `sales-pdfs`; não concede acesso a utilizadores públicos.
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

Se o bucket `sales-pdfs` já existir, executar novamente `supabase/admin-sales.sql` para atualizar o limite de tamanho para 6 MB.

Uma configuração incompleta na Vercel bloqueia o registo de vendas, para evitar guardar documentos num disco temporário. Este projeto não cria uma conta ou um projeto Supabase automaticamente.

## Desenvolvimento local

Foram adicionadas credenciais locais a `.env.local`, que é ignorado pelo Git. Sem Supabase, os dados são guardados na pasta privada `.admin-data`, também ignorada pelo Git. Para escolher outro disco local persistente, definir `ADMIN_DATA_DIR`. Reiniciar o servidor de desenvolvimento depois de alterar variáveis de ambiente.

Os dados guardados localmente **não são sincronizados automaticamente** com Supabase. Para importar na instalação de produção, carregar novamente os PDFs originais.

## Utilização

- Importar um ou vários PDFs exportados por `/orcamento/admin` ou `/simulador/admin`, até 6 MB por ficheiro.
- Cliente, NIF, data, total sem IVA, IVA e total com IVA são extraídos automaticamente. Os documentos novos contêm também metadados para importação exata; os antigos são lidos pelo texto e pelas posições dos campos.
- Os PDFs entram como **Em preparação**. Alterar o seletor para **Vendida** quando a venda estiver confirmada.
- O mês corresponde à **data do orçamento**. Alterar o estado não muda a data do documento.
- Os totais de vendas somam apenas documentos marcados como **Vendida**, com valores sem IVA e com IVA separados. Os valores em preparação são apresentados à parte.
- O mesmo conteúdo PDF não pode ser registado duas vezes, mesmo com outro nome de ficheiro.
- O PDF original fica guardado e pode ser aberto pela linha da encomenda.
- PDFs de terceiros, digitalizados sem texto, protegidos ou sem os campos obrigatórios são recusados, em vez de criar registos com valores estimados.

As sessões duram oito horas. O limite de tentativas de login é por instância do servidor; para instalações com grande exposição, pode ser complementado por rate limiting no fornecedor de hosting.
