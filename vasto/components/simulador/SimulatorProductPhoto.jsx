import Image from 'next/image';
import styles from './SimulatorProductPhoto.module.css';

const photos = {
  pickingGalvanized: {src:'/produtos/10-Porteco Z100/i1.png',width:1353,height:1097,pt:'Estante picking galvanizada',en:'Galvanised picking shelving',finishPt:'Estrutura galvanizada',finishEn:'Galvanised frame'},
  pickingPainted: {src:'/produtos/9-Porteco Z60/i1.png',width:2587,height:3239,pt:'Estante picking pintada',en:'Painted picking shelving',finishPt:'Estrutura pintada',finishEn:'Painted frame'},
  racks: {src:'/orcamento/i1.png',width:2434,height:4236,pt:'Rack industrial para paletes',en:'Industrial pallet racking',finishPt:'Estrutura azul · Vigas laranja',finishEn:'Blue frame · Orange beams'},
  bancadas: {src:'/produtos/14-Bancadas (Workbench)/i2.png',width:1600,height:1067,pt:'Bancada de trabalho',en:'Workbench',finishPt:'Fotografia de referência',finishEn:'Reference photograph'},
  light: {src:'/prateleira inteira.png',width:1024,height:1024,pt:'Estante de carga ligeira',en:'Light-duty shelving',finishPt:'Prateleiras metálicas',finishEn:'Metal shelves'},
};

export function getSimulatorProductPhoto(type,galvanized=false) {
  return photos[type==='picking' ? galvanized?'pickingGalvanized':'pickingPainted' : type==='ligeiras'?'light':type];
}
export default function SimulatorProductPhoto({type,galvanized=false,english=false,hero=false}) {
  const photo=getSimulatorProductPhoto(type,galvanized);
  if(!photo)return null;
  if(hero)return <figure className={styles.hero} aria-label={english?'Product reference photograph':'Fotografia de referência do produto'}>
    <div className={styles.heroStage}><Image key={photo.src} src={photo.src} width={photo.width} height={photo.height} sizes="(max-width: 767px) 90vw, (max-width: 1024px) 380px, 480px" alt={english?photo.en:photo.pt} className={`${styles.heroImage} ${type === 'picking' && galvanized ? styles.heroGalvanized : ''}`}/></div>
    <figcaption className={styles.heroCaption}><span className={styles.heroFinishDot} aria-hidden="true"/><p>{english?photo.finishEn:photo.finishPt}</p></figcaption>
  </figure>;
  return <figure className={styles.card} aria-label={english?'Product photograph':'Fotografia do produto'}>
    <div className={styles.visual}><Image key={photo.src} src={photo.src} width={photo.width} height={photo.height} sizes="(max-width: 640px) 80vw, 280px" alt={english?photo.en:photo.pt} className={styles.image}/></div>
    <figcaption className={styles.caption}>
      <p className={styles.eyebrow}>{english?'The real product':'O produto real'}</p>
      <h3>{english?photo.en:photo.pt}</h3>
      <span className={styles.finish}><span aria-hidden="true" className={`${styles.swatch} ${type==='picking'&&galvanized?styles.galvanized:type==='racks'?styles.racks:type==='light'?styles.light:styles.painted}`}/>{english?photo.finishEn:photo.finishPt}</span>
      <p className={styles.note}>{english?'Reference photograph. Your selected dimensions and levels are shown in the drawing above.':'Fotografia de referência. As medidas e os níveis selecionados estão representados no desenho acima.'}</p>
    </figcaption>
  </figure>;
}
