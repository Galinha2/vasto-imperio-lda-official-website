# Aplicação e notificações do chat

A administração pode ser instalada no Android e no iPhone. Cada mensagem recebida no chat é guardada e enviada pelo servidor ao serviço push de cada dispositivo ativo. Tocar no aviso abre `/admin/conversas?chat=...`; a resposta é escrita na conversa após autenticação. Não há resposta direta no ecrã bloqueado.

## Preparar o servidor

1. Executar `supabase/admin-push.sql` no SQL Editor do projeto Supabase utilizado pelo site.
2. Em `vasto/`, executar `node scripts/setup-web-push.mjs`. Este comando cria o par de chaves apenas se ainda não existir em `.env.local`, sem o exibir.
3. Configurar na Vercel os mesmos valores de `WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY` e `WEB_PUSH_VAPID_SUBJECT` (por exemplo `mailto:geral@vastoimperio.pt`). A chave privada é secreta e nunca deve ser enviada para o frontend, incluída num commit ou publicada. A chave pública é disponibilizada apenas pela API autenticada.
4. Publicar as alterações. A aplicação exige HTTPS, exceto em localhost durante desenvolvimento.
5. Depois de alterar variáveis locais, reiniciar o servidor de desenvolvimento.

Não voltar a gerar as chaves num novo deploy: os dispositivos subscritos dependem do mesmo par. Se forem substituídas, voltar a ativar as notificações nos dispositivos.

## Instalar em cada telemóvel

- **iPhone / iPad, iOS 16.4 ou posterior:** abrir `/admin/definicoes` no Safari, Partilhar → Adicionar ao ecrã principal. Abrir pelo ícone criado e iniciar sessão. Para acesso prolongado, usar a opção de manter a sessão no formulário de login.
- **Android:** abrir `/admin/definicoes` no Chrome e escolher Instalar aplicação / Adicionar ao ecrã principal no menu, ou usar o botão Instalar aplicação quando disponível.
- Em **Definições → Aplicação no telemóvel**, tocar **Ativar neste dispositivo**, permitir os avisos e utilizar **Testar neste dispositivo**. Repetir em ambos os telemóveis.

As preferências de som, conteúdo das notificações e avisos do chat são sincronizadas para a subscrição deste navegador. Os novos orçamentos continuam com avisos locais enquanto o painel está aberto; o push em segundo plano implementado aqui é para mensagens do chat.

## Validação real

1. Confirmar que o teste foi aceite e apareceu no telemóvel.
2. Fechar a aplicação no telemóvel e enviar uma mensagem de teste como visitante, a partir de outro dispositivo.
3. Tocar na notificação e confirmar que abre a conversa certa, incluindo uma conversa antiga fora das primeiras 100 da lista.
4. Responder e verificar a chegada da resposta no site.
5. Terminar sessão nesse telemóvel e confirmar que deixa de receber avisos; o outro dispositivo deve continuar ativo.

O chat público mantém-se oculto pelo sinalizador `websiteChatEnabled = false` em `app/layout.js`, até ser reativado pelo utilizador.

## Funcionamento e limites

- O service worker não guarda páginas privadas, PDFs, conversas ou credenciais em cache.
- As subscrições são acessíveis apenas pelo backend e estão associadas à configuração atual das credenciais do admin. Alterar essas credenciais invalida os registos anteriores.
- Terminar sessão remove o registo push do dispositivo antes de apagar a sessão. Sessões normais limitam a subscrição à validade da sessão; sessões lembradas têm uma subscrição com validade até 180 dias, renovada ao abrir o painel.
- Endereços de subscrição só podem apontar para serviços push conhecidos; a API não permite pedidos para URLs arbitrários.
- Subscrições expiradas ou removidas pelo serviço (HTTP 404/410) são eliminadas. Falhas temporárias não apagam o dispositivo nem bloqueiam a mensagem do visitante.
- Receção depende da ligação, das permissões do sistema, das opções de poupança de energia e do modo Não incomodar. O teste do servidor comprova aceitação pelo serviço push; entrega real requer um teste no Android e no iPhone.
