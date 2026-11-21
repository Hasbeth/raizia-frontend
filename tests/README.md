# Verificación local

`npm test` ejecuta pruebas con Node 26, sin navegador ni servicios externos.
Comprueba limpieza y división de texto para voz, cancelación de lecturas,
detección de dictado, respuestas cortadas y las reglas reales de `public/sw.js`.
`npm run typecheck`, `npm run lint` y `npm run build` completan la verificación.

Para un build sin archivos de entorno, usar desde este repositorio
`node ../raizia-backend/tests/support/prepare-offline-build.mjs` y compilar en
la carpeta que imprime, con la precarga offline descrita en las pruebas del backend.

Los íconos se reproducen con `node scripts/generate-icons.mjs`, usando `sharp`
incluido con Next. No requiere instalar dependencias.

La lectura y el dictado se prueban con stubs. La voz concreta y el permiso del
micrófono dependen del navegador y del equipo. El service worker se registra
solo en producción; al cambiar la página sin conexión o los íconos, incrementar
su versión. Las navegaciones no se guardan; `/api`, `/admin` y las respuestas
privadas quedan excluidas.
