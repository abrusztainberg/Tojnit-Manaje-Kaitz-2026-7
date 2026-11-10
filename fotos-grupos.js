/* Las tarjetas de la portada siguen con los degradés originales. */
(async function(){
  const key=new URLSearchParams(location.search).get('grupo')?.toLowerCase();
  const valid=['jaza','mega','nifla','leitza','mabri','kasu','mebu','shingsha','jamu','shoja','metu','shalu','netza','ofna','lojamuza'];
  if(!valid.includes(key))return;
  try{
    if(!window.JSZip)throw new Error('No está disponible el lector de fotografías');
    const response=await fetch('fotos-grupos-majane.zip');
    if(!response.ok)throw new Error('Todavía falta subir fotos-grupos-majane.zip al repositorio');
    const zip=await window.JSZip.loadAsync(await response.arrayBuffer());
    const entry=zip.file(key+'.jpeg');
    if(!entry)throw new Error('Falta la foto del grupo '+key);
    const blob=await entry.async('blob');
    const url=URL.createObjectURL(new Blob([blob],{type:'image/jpeg'}));
    const hero=document.querySelector('.hero');
    if(!hero)return;
    hero.style.backgroundImage='linear-gradient(to bottom, rgba(0,0,0,.23), rgba(0,0,0,.60)), url("'+url+'")';
    hero.classList.add('has-group-photo');
  }catch(error){console.warn('Se mantiene el degradé hasta que estén disponibles las fotos:',error.message)}
})();