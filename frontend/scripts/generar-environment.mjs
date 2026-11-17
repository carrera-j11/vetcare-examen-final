/**
 * Genera src/environments/environment.production.ts a partir de la variable
 * de entorno API_URL (configurada en Vercel o Netlify), para no escribir la
 * URL del Backend dentro del código.
 *
 *   API_URL=https://mi-api.up.railway.app/api npm run build:prod
 */
import { writeFileSync } from 'node:fs';

const apiUrl = (process.env.API_URL || '').trim().replace(/\/$/, '');
if (!apiUrl) {
  console.error('✖ Falta la variable API_URL (ej.: https://mi-api.up.railway.app/api)');
  process.exit(1);
}

const contenido = `// Archivo generado por scripts/generar-environment.mjs — no editar a mano
export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
  intervaloNotificaciones: 60_000,
};
`;

writeFileSync(new URL('../src/environments/environment.production.ts', import.meta.url), contenido);
console.log(`✔ environment.production.ts → apiUrl = ${apiUrl}`);
