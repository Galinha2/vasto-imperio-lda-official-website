import Link from 'next/link';
import styles from './LegalPage.module.css';
export default function LegalPage({title,intro,sections,relatedHref,relatedLabel}){
 return <article className={styles.page}>
  <div className={styles.container}>
   <header className={styles.header}><Link href="/" className={styles.back}>← Vasto Império</Link><p className={styles.eyebrow}>Informação legal</p><h1>{title}</h1><p className={styles.intro}>{intro}</p><p className={styles.updated}>Última atualização: <time dateTime="2026-11-06">6 de novembro de 2026</time></p></header>
   <div className={styles.layout}><aside className={styles.index}><nav aria-label="Índice da página"><p>Nesta página</p><ol>{sections.map(section=><li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol></nav></aside>
    <div className={styles.document}>{sections.map((section,index)=><section id={section.id} key={section.id} className={styles.section}><h2><span>{String(index+1).padStart(2,'0')}</span>{section.title}</h2><div className={styles.copy}>{section.content}</div></section>)}
     <footer className={styles.documentFooter}><p>Precisa de algum esclarecimento?</p><a href="mailto:geral@vastoimperio.pt">geral@vastoimperio.pt</a><Link href={relatedHref}>{relatedLabel} →</Link></footer>
    </div>
   </div>
  </div>
 </article>;
}
