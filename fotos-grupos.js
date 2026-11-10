/* Las tarjetas de la portada siguen con los degradés originales. */
(async function(){
  const key=new URLSearchParams(location.search).get('grupo')?.toLowerCase();
  const valid=['jaza','mega','nifla','leitza','mabri','kasu','mebu','shingsha','jamu','shoja','metu','shalu','netza','ofna','lojamuza'];
  if(!valid.includes(key))return;
  try{
    if(!window.JSZip)throw new Error('No está disponible el lector de fotografías');
    const response=await fetch('fotos-grupos-majane.zip?v=13');
    if(!response.ok)throw new Error('Todavía falta subir fotos-grupos-majane.zip al repositorio');
    const zip=await window.JSZip.loadAsync(await response.arrayBuffer());
    const entry=zip.file(key+'.jpeg');
    if(!entry)throw new Error('Falta la foto del grupo '+key);
    const blob=await entry.async('blob');
    const url=URL.createObjectURL(new Blob([blob],{type:'image/jpeg'}));
    const hero=document.querySelector('.hero');
    if(!hero)return;
    const image=document.createElement('img');
    image.className='group-photo';
    image.alt='Foto completa del grupo '+key;
    image.src=url;
    image.addEventListener('load',()=>hero.classList.add('has-group-photo'),{once:true});
    hero.prepend(image);
  }catch(error){console.warn('Se mantiene el degradé hasta que estén disponibles las fotos:',error.message)}
})();