# Notas Crema

App local para tomar notas calidas con Markdown, Excalidraw, carpetas anidadas, sonidos suaves y configuracion inicial.

## Comandos

```bash
npm install
npm run dev
npm run build
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
