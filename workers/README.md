# IA real en Juegos → M · Modificar

Este repositorio es una web estática alojada en GitHub Pages. El formulario ya permite escribir cualquier juego, pero para obtener respuestas originales de OpenAI **en la misma página** se necesita desplegar el backend adjunto.

## Configuración segura
1. Crear un **Cloudflare Worker** y usar el archivo `workers/juegos-ia.js` como código del Worker.
2. En Cloudflare, configurar un secreto de entorno llamado `OPENAI_API_KEY` con una clave de API de OpenAI, **solo en Cloudflare**. Alternativamente, desde la carpeta correspondiente de Wrangler: `npx wrangler secret put OPENAI_API_KEY`.
3. Publicar el Worker y obtener su URL HTTPS (por ejemplo `https://tojnit-juegos-ia.<tu-subdominio>.workers.dev`).
4. En el archivo `juegos-ia-config.js` de GitHub reemplazar la URL vacía por la URL del Worker: `window.JUEGOS_IA_ENDPOINT = "https://...workers.dev/";`.
5. Probar desde la página `juegos.html?grupo=jaza`. Abrir con un juego cualquiera y pedir las ideas.

## Seguridad y costos
- Nunca colocar `OPENAI_API_KEY` en HTML, JS público, commits ni GitHub Actions sin protección.
- **Antes de publicar ampliamente**, activar protección antiabuso / límites de solicitudes en Cloudflare. La comprobación de Origin del Worker y CORS **no son autenticación** y por sí solos no impiden que alguien haga peticiones con scripts externos.
- La API de OpenAI se cobra según uso; la suscripción personal de ChatGPT no sustituye la facturación de API.
- Si se necesita un endpoint solo para madrijim, agregar autenticación / controles de acceso al Worker.
- El botón de copiar consulta permite usar ChatGPT manualmente si todavía no hay backend publicado.

El código usa la API Responses con un modelo configurable mediante la variable `OPENAI_MODEL` (predeterminado `gpt-5-mini`). Si ese modelo no está disponible en la cuenta, elegir uno permitido por el proyecto.
