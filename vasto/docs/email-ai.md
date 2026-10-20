# Melhorar mensagens de email com IA

No envio de orçamentos pelo admin, o botão **Melhorar com IA** revê o corpo da mensagem em português de Portugal. O administrador pode editar a sugestão, repor o texto anterior e enviar o email separadamente.

## Ativar

1. Configure `OPENAI_API_KEY` nas variáveis de ambiente do projeto na Vercel, nos ambientes pretendidos, com uma chave da sua conta OpenAI API.
2. Faça um novo deploy. Para desenvolvimento local, use a mesma variável em `.env.local` e reinicie o servidor.
3. Opcional: `OPENAI_EMAIL_MODEL` permite escolher o modelo. Por defeito usa `gpt-4.1-mini`.

A chave é utilizada apenas no servidor. Nunca use um prefixo `NEXT_PUBLIC_` nem guarde a chave no Git. A conta da API precisa de acesso ao modelo e faturação/saldo para os pedidos; o uso da API é cobrado separadamente do ChatGPT.

Só o texto do campo Mensagem é enviado à OpenAI, após clicar no botão, através da Responses API com `store: false`. Não são enviados os anexos ou os dados do orçamento em separado. A rota exige sessão admin e origem válida. O email continua a ser enviado apenas no botão Enviar email.

Valide a sugestão antes de enviar, sobretudo valores, medidas e condições comerciais. Falhas da IA mantêm o rascunho original.

Documentação: https://developers.openai.com/api/docs/guides/text
