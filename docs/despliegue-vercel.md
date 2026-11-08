# Despliegue en Vercel

**Estado:** listo para importar desde GitHub. No requiere backend, variables de entorno, base de datos ni `vercel.json`.

## Por qué no necesita configuración especial

| Aspecto | Estado |
|---|---|
| Framework | Next.js 14.2.35 (App Router) |
| Rutas generadas | `/` y `/_not-found`, ambas estáticas |
| API routes / server actions | Ninguna |
| Variables de entorno | Ninguna |
| Servicios externos | Ninguno |
| Persistencia | `localStorage` del navegador de cada visitante |
| Build verificado | `npm run build` correcto en local |

Vercel detecta Next.js automáticamente. La carpeta `.next` y `.vercel` están en `.gitignore`, así que no deben subirse al repositorio.

## Opción recomendada: importar desde GitHub

1. Entrar a <https://vercel.com/new>.
2. Importar el repositorio `BuhoNegro5000/Landfill-Green-owl-labs`.
3. Confirmar los valores detectados:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Install Command:** `npm install`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next` (valor por defecto)
   - **Node.js Version:** 20.x
4. No agregar variables de entorno.
5. Pulsar **Deploy**.

Con la integración de Git activa, cada `push` a `main` genera un despliegue de producción y cada rama o pull request genera una vista previa.

## Alternativa: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel          # despliegue de vista previa
vercel --prod   # despliegue de producción
```

La CLI crea la carpeta local `.vercel` (ignorada por Git).

## Verificación posterior al despliegue

1. La pantalla de arranque muestra el logo y completa las comprobaciones.
2. Se puede entrar al laboratorio y crear un proyecto.
3. Al recargar, el proyecto sigue disponible (persistencia local).
4. El visor 3D renderiza y permite abrir la vista ampliada.
5. El informe PDF se genera en el navegador.
6. La consola del navegador no muestra errores.

## Comportamiento esperado en producción

- **Datos por navegador:** cada visitante parte de los proyectos demostrativos y guarda sus cambios en su propio `localStorage`. No hay cuentas ni sincronización.
- **Sin recuperación remota:** borrar los datos del navegador elimina el trabajo; usar la exportación de respaldo.
- **Sin telemetría:** no se envían datos a Vercel ni a terceros.
- **Primer despliegue:** los datos demostrativos se crean en el cliente; no se requiere migración de servidor.

## Actualizaciones y reversión

- Para publicar cambios: `git push origin main`.
- Vercel conserva despliegues anteriores; se puede promover o revertir desde **Deployments**.
- Antes de subir cambios de esquema, revisar la migración de `localStorage` en `lib/store.ts` (`version: 4`).

## Límites del despliegue

Publicar en Vercel no cambia el alcance técnico de la aplicación: sigue siendo una herramienta de diseño preliminar y trazabilidad. No sustituye levantamientos, estudios de sitio, diseño de detalle ni revisión profesional habilitada. Véase [`que-puede-y-no-puede-hacer.md`](que-puede-y-no-puede-hacer.md).
