# sin mucha nota

App local para tomar notas con Markdown, Excalidraw, carpetas anidadas, sonidos suaves y configuracion inicial.

## Comandos

```bash
npm install
npm run dev
npm run build
npm test
npm run benchmark
```

## Imágenes y copias de sesión

Puedes pegar imágenes con `Ctrl+V` (o `Cmd+V`) en Markdown y Excalidraw.
Las imágenes de Markdown quedan incrustadas en la nota y se muestran en Preview;
las de Excalidraw se guardan junto con el dibujo. Ambas viajan con la sincronización
de GitHub y con las copias ZIP, sin depender del portapapeles ni de URLs temporales.

En **Configuración → Copia de la sesión** están **Exportar sesión (.zip)** e
**Importar sesión (.zip)**, también cuando GitHub está conectado. El ZIP incluye
todas las notas y carpetas, los dibujos con sus imágenes, las preferencias, la
vista activa y el historial de partidas. La exportación guarda automáticamente los
cambios pendientes. Las credenciales de GitHub no se incluyen.

La importación muestra el nombre del archivo y el número de notas y carpetas antes
de reemplazar la sesión local. También está disponible en la pantalla inicial.
Valida el archivo antes de restaurar los datos y pausa la sincronización de GitHub;
vuelve a elegir el repositorio para decidir cómo sincronizar la sesión restaurada.
El límite de importación es de 512 MB, tanto comprimidos como descomprimidos.

`npm run benchmark` genera un workspace sintetico con miles de notas y archivos pesados para medir filtros, conteos de carpetas, snapshot de sync y base64 de GitHub.
Ejemplo: `npm run benchmark -- --notes=12000 --folders=2400 --markdownKb=12 --drawingKb=6 --compare-legacy`.

## Publicar en Netlify

Este repo incluye `netlify.toml` para publicar la app y activar el proxy OAuth de GitHub en Netlify.

1. En Netlify crea un sitio nuevo desde este repositorio.
2. Deja que Netlify use la configuracion del repo: `command = npm run build` y `publish = dist`.
3. En `Site configuration` > `Environment variables`, agrega `VITE_GITHUB_CLIENT_ID` con el Client ID de tu GitHub OAuth App.
4. No agregues `VITE_GITHUB_OAUTH_PROXY_URL` en Netlify, salvo que quieras sobreescribirlo; el valor del repo ya es `/github-oauth`.
5. Publica el sitio.

En Netlify, `/github-oauth/device/code` y `/github-oauth/access_token` se reescriben hacia GitHub con redirects proxy, asi el navegador no llama directamente a `github.com` ni a GitHub Pages.

## Publicar en GitHub Pages

Este repo usa GitHub Actions para publicar el build de Vite en GitHub Pages.

1. En GitHub ve a `Settings` > `Pages`.
2. En `Build and deployment`, elige `Source: GitHub Actions`.
3. Haz push a `main`.
4. La app quedara publicada en `https://bryan-herrera-dev.github.io/sin-mucha-nota/`.

Si quieres que el Sync con GitHub funcione en Pages, agrega `VITE_GITHUB_CLIENT_ID` y
`VITE_GITHUB_OAUTH_PROXY_URL` en `Settings` > `Secrets and variables` > `Actions` > `Secrets`:

```env
VITE_GITHUB_CLIENT_ID=tu_client_id_de_oauth_app
VITE_GITHUB_OAUTH_PROXY_URL=https://tu-dominio.com/github-oauth
```

El workflow accede al Client ID con el contexto `secrets`; los valores guardados en
`Secrets` no estan disponibles mediante el contexto `vars`. Ten en cuenta que Vite
incluye cualquier variable con prefijo `VITE_` en el bundle del navegador, por lo que
el Client ID no debe considerarse confidencial. No configures el Client Secret de la
OAuth App como una variable `VITE_`.

Para probar el build de Pages localmente ejecuta:

```bash
npm run build:pages
```

## GitHub OAuth

Para desarrollo local configura solo el Client ID:

```env
VITE_GITHUB_CLIENT_ID=tu_client_id_de_oauth_app
```

`npm run dev` usa el proxy de Vite en `/github-oauth` para evitar CORS con los endpoints OAuth de GitHub.

En produccion necesitas publicar un proxy/serverless equivalente y configurar:

```env
VITE_GITHUB_OAUTH_PROXY_URL=https://tu-dominio.com/github-oauth
```

Si no configuras el proxy en produccion, la app seguira funcionando y solo desactivara la conexion con GitHub para evitar errores de OAuth en el front.
