'use client';
export default function CookiePreferencesButton(){
 return <button type="button" onClick={()=>window.dispatchEvent(new Event('vasto:cookie-preferences'))}>Gerir preferências de cookies</button>;
}
