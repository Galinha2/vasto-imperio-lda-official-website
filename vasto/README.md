This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Cópias dos emails em Enviados

Os envios do site e do admin guardam a mesma mensagem, com os anexos, na pasta de enviados por IMAP. Por defeito usam `SMTP_HOST`, `SMTP_USER` e `SMTP_PASS`, com IMAP TLS na porta 993. Se o fornecedor separar os serviços, configure no ambiente da Vercel `IMAP_HOST`, `IMAP_PORT`, `IMAP_USER` e `IMAP_PASS`. A pasta é identificada pelo atributo IMAP `\\Sent`; para indicar outra pasta use `IMAP_SENT_FOLDER` com o caminho exato existente (por exemplo `INBOX.Sent`). Não é criada uma pasta alternativa automaticamente.

Se a cópia falhar após entrega por SMTP, não se repete o envio. O admin apresenta o aviso e os logs registam a falha sem conteúdo ou credenciais. A funcionalidade aplica-se a novos envios; não recupera emails antigos.

Na configuração atual, `mail.vastoimperio.pt` apresenta um certificado para `daparking4.webserver.pt`. Use `IMAP_HOST=daparking4.webserver.pt` (ou o hostname IMAP confirmado pelo fornecedor), sem desligar a validação TLS. A autenticação IMAP precisa de credenciais válidas próprias caso as credenciais SMTP não sejam aceites.
