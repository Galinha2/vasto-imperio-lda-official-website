import Link from 'next/link';
import ChatWidget from '@/components/chat/ChatWidget';
import styles from '@/components/admin/AdminSettings.module.css';
import { chatSetupStatus } from '@/lib/chat.mjs';

export const metadata = { title: 'Testar chat · Administração', robots: { index: false, follow: false } };

export default async function TestChatPage() {
  const setup = await chatSetupStatus();
  return <main className={styles.page}>
    <header className={styles.header}><p className={styles.eyebrow}>Área privada</p><h1>Testar o chat</h1><p>Experimente a conversa do visitante sem ativar o chat no site público.</p></header>
    <section className={styles.card}>
      {!setup.ready && <div role="alert" className={styles.error}><strong>O chat precisa de configuração.</strong><p>{setup.message}</p><p>O ficheiro admin-push.sql configura apenas as notificações; o chat também precisa de site-chat.sql. Depois de executar o SQL, recarregue esta página.</p></div>}
      {setup.ready && <p className={styles.hint}>{setup.local ? 'Armazenamento local disponível. As conversas deste ambiente ficam apenas neste computador.' : 'Ligação às tabelas do chat confirmada.'}</p>}
      <div className={styles.sectionTitle}><div><h2>Teste completo das notificações</h2><p>As mensagens enviadas aqui entram nas conversas reais do admin e acionam as notificações habituais.</p></div></div>
      <ol className={styles.installSteps}>
        <li>No telemóvel, instale a aplicação e ative as notificações nas Definições.</li>
        <li>Deixe a aplicação do telemóvel em segundo plano ou bloqueie o ecrã.</li>
        <li>Neste computador, preencha o chat com um nome como “Teste” e envie uma mensagem.</li>
        <li>Toque no aviso recebido no telemóvel, responda na conversa e confirme a resposta neste chat.</li>
      </ol>
      <p className={styles.hint}>Pode deixar o email do visitante vazio. Aplicam-se os avisos normais do chat, incluindo o email de início de conversa para a equipa. Este navegador mantém a sua conversa de visitante entre visitas.</p>
      <div className={styles.actions}><Link href="/admin/definicoes" className={styles.secondary}>Definições das notificações</Link><Link href="/admin/conversas" className={styles.secondary}>Abrir conversas</Link></div>
    </section>
    <ChatWidget preview />
  </main>;
}
