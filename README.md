# RAIZIA · Frontend

**Nuestras raíces, nuestros derechos.**
Interfaz de la plataforma de orientación jurídica y protección de derechos colectivos, desarrollada en el marco de ALUNA IA (Universidad del Magdalena).

Esta aplicación usa Next.js 16.4.6 (App Router), React 19, TypeScript y Tailwind v4. Conserva el inicio, la biblioteca, el asistente, las herramientas y el panel de administración. Consulta los datos por HTTP al backend; SQLite, la autenticación y las claves de IA viven en `../raizia-backend`.

## Cómo iniciarlo junto con el backend (Windows)

Usa Node.js 26. Si faltan las dependencias, ejecuta `npm ci` dentro de cada aplicación.

1. Inicia `../raizia-backend` con `npm run dev` o `iniciar-backend.bat`: escucha en `http://localhost:4000`.
2. En esta carpeta, copia `.env.example` a `.env.local` si necesitas cambiar la dirección del backend.
3. Ejecuta `npm run dev` o abre `iniciar-frontend.bat`.
4. Abre `http://localhost:3000`.

El archivo `.bat` compila si falta `.next/BUILD_ID` y luego ejecuta `npx next start -p 3000`. Después de cambiar código o `BACKEND_URL`, ejecuta `npm run build` antes de volver a iniciarlo. `npm start` usa la compilación existente.

## Configuración

```dotenv
BACKEND_URL=http://localhost:4000
```

Este es también el valor predeterminado si no defines la variable. La dirección debe ser accesible desde el servidor que ejecuta el frontend. Se lee en los Server Components y al compilar los rewrites; mantenla igual durante la compilación y la ejecución. No necesita el prefijo `NEXT_PUBLIC_`.

Los componentes del navegador siguen usando `/api/*`. El rewrite de `next.config.ts` reenvía esas solicitudes al backend: chat NDJSON, herramientas, cookie `raizia_admin`, archivos multipart de hasta 30 MB por archivo y descargas. No hay `proxy.ts` ni middleware. El panel reenvía la cookie del request al consultar la sesión del backend.

Next.js 16.4.6 también aplica su límite de cuerpo a los rewrites externos. Por eso se configura `experimental.proxyClientMaxBodySize: "32mb"`, con margen para los delimitadores multipart. Las selecciones múltiples se envían archivo por archivo y mantienen un resultado individual por documento.

Las consultas de servidor usan `cache: "no-store"`. Si el backend no responde, aparece un mensaje en español con una opción para volver a intentar. Los documentos inexistentes o no aprobados muestran la página de documento no encontrado.

## Dónde cambiar cada cosa

| Qué | Dónde |
| --- | --- |
| Páginas públicas | `src/app/(site)/` |
| Asistente y administración | `src/app/asistente/` y `src/app/admin/` |
| Interfaz reutilizable | `src/components/` |
| Nombre, marca y navegación | `src/brand/brand.ts` |
| Colores y tipografías | `src/app/globals.css` |
| Consultas HTTP desde el servidor | `src/lib/api.ts` (solo servidor) |
| Tipos de datos recibidos | `src/lib/types.ts` y `src/lib/constants.ts` |
| Formularios y configuración de herramientas | `src/lib/tools-config.ts` |
| Mensaje de error y reintento | `src/app/error.tsx` |
| Archivos públicos | `public/` |

Para comprobar el frontend: `npx tsc --noEmit`, `npx eslint` y `npm run build`. Las pruebas de lógica e importaciones se ejecutan en el backend.

`node_modules/`, `.next/`, `data/` y `.env*` no se versionan; `.env.example` sí se conserva. El frontend no necesita una carpeta de datos ni contraseñas de administración o claves de Gemini.
