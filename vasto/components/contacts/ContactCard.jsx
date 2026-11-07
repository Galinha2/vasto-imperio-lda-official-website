import ContactDetails from './ContactDetails';

// Keep existing page imports and background choices on the shared contact design.
export default function ContactCard({sectionBackground='gray',wide=false}){
 return <ContactDetails sectionBackground={sectionBackground} wide={wide}/>;
}
