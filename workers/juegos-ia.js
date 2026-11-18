/**
 * API privada para M · Modificar. Se despliega como Cloudflare Worker.
 * La clave de OpenAI se guarda como secreto del Worker, nunca en GitHub Pages.
 * Protección recomendada: activar Turnstile (TURNSTILE_SECRET) y rate limiting en Cloudflare.
 */
const SITE_ORIGIN='https://abrusztainberg.github.io';
const originHeaders={
 'Access-Control-Allow-Origin':SITE_ORIGIN,
 'Access-Control-Allow-Methods':'POST, OPTIONS',
 'Access-Control-Allow-Headers':'Content-Type',
 'Vary':'Origin',
 'Cache-Control':'no-store',
 'Content-Type':'application/json; charset=utf-8'
};
const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:originHeaders});
const validText=(x,max)=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin');
  if(origin!==SITE_ORIGIN)return new Response('Origen no permitido',{status:403});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:originHeaders});
  if(request.method!=='POST')return send({error:'Método no permitido'},405);
  if(!env.OPENAI_API_KEY)return send({error:'Falta configurar el servicio de IA'},503);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return send({error:'Se esperaba JSON'},415);
  if(Number(request.headers.get('Content-Length')||0)>4000)return send({error:'Solicitud demasiado grande'},413);
  let data;try{data=await request.json()}catch(e){return send({error:'JSON inválido'},400)}
  if(!data||!validText(data.game,120)||typeof data.context!=='string'||data.context.length>600)return send({error:'Falta indicar un juego válido'},400);
  const group=String(data.group||'Grupo').slice(0,40);
  const space=String(data.space||'Sin especificar').slice(0,50);
  const energy=String(data.energy||'Sin especificar').slice(0,50);
  const goal=String(data.goal||'Sin especificar').slice(0,55);
  const age=String(data.ageGuidance||'').slice(0,400);
  const instructions=[
   'Sos un especialista en jinuj y juegos de peulá para un majané juvenil de Orja en Argentina.',
   'Debés proponer EXACTAMENTE 3 modificaciones realizables y distintas del MISMO juego que indica el usuario, no inventar otros juegos.',
   'Cada variante debe conservar una mecánica reconocible del juego original y explicar qué se modifica.',
   'Pensá para janijim de distintas edades, con participación inclusiva y reglas claras.',
   'Evitá castigos, humillaciones, desafíos peligrosos, eliminación de personas, privaciones o contacto físico obligatorio.',
   'Si el juego se realiza con agua o de noche, incorporá precauciones y supervisión.',
   'No asumas información específica del grupo que no haya sido proporcionada.',
   'Devolvé únicamente JSON válido, sin bloques Markdown, con la forma {"ideas":[{"nombre":"...","cambio":"...","pasos":["...","...","..."],"materiales":"...","por_que":"..."}]}',
   'Cada idea debe incluir entre 3 y 5 pasos concretos, nombres variados y textos claros en español rioplatense. Máximo 120 palabras por idea.'
  ].join(' ');
  const prompt=JSON.stringify({juego:data.game.trim(),contexto:data.context.trim(),grupo:group,espacio:space,energia:energy,objetivo:goal,recomendaciones_de_edad:age});
  const timeout=AbortSignal.timeout(26000);
  let api;
  try{
   api=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{'Authorization':'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({model:env.OPENAI_MODEL||'gpt-5-mini',instructions,input:prompt,max_output_tokens:1700,text:{format:{type:'json_object'}}}),
    signal:timeout
   });
  }catch(e){return send({error:'No se pudo conectar a la IA en este momento'},502)}
  if(!api.ok){
   // Nunca reenvíes errores de OpenAI que puedan contener información privada.
   return send({error:api.status===429?'La IA está ocupada. Probá más tarde.':'Error al generar las ideas'},502);
  }
  let response;try{response=await api.json()}catch(e){return send({error:'Respuesta inválida del servicio'},502)}
  const text=(response.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
  let parsed;try{parsed=JSON.parse(text)}catch(e){return send({error:'La IA devolvió un formato inesperado'},502)}
  if(!Array.isArray(parsed.ideas)||parsed.ideas.length!==3||parsed.ideas.some(x=>typeof x.nombre!=='string'||typeof x.cambio!=='string'||!Array.isArray(x.pasos)||x.pasos.length<2||typeof x.materiales!=='string'||typeof x.por_que!=='string'))return send({error:'Las ideas llegaron incompletas'},502);
  const ideas=parsed.ideas.map(x=>({
   nombre:x.nombre.slice(0,140),cambio:x.cambio.slice(0,850),
   pasos:x.pasos.slice(0,6).map(v=>String(v).slice(0,450)),
   materiales:x.materiales.slice(0,500),por_que:x.por_que.slice(0,600)
  }));
  return send({ideas});
 }
};
