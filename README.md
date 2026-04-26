# BundleLens

Herramienta de línea de comandos **agnóstica al framework**: ejecuta tu build (o analiza una carpeta que ya exista), mide tamaños de artefactos (raw, gzip, brotli), clasifica archivos, genera rankings y un informe HTML/JSON. Opcionalmente integra **auditoría de dependencias** según tu gestor (npm, pnpm, Yarn, Bun) y permite **comparar dos ramas de Git** en entornos aislados (worktrees).

---

## Tabla de contenidos

1. [Requisitos](#requisitos)
2. [Instalación](#instalación)
3. [Primeros pasos (5 minutos)](#primeros-pasos-5-minutos)
4. [Comandos del CLI](#comandos-del-cli)
   - [`bundlelens init`](#bundlelens-init)
   - [`bundlelens run`](#bundlelens-run)
   - [`bundlelens analyze`](#bundlelens-analyze)
   - [`bundlelens compare`](#bundlelens-compare)
5. [Archivo de configuración](#archivo-de-configuración-bundlelensconfigjson)
6. [Salidas e informes](#salidas-e-informes)
7. [Precedencia: archivo vs flags](#precedencia-archivo-vs-flags)
8. [Uso en CI/CD](#uso-en-cicd)
9. [Comparar ramas con Git](#comparar-ramas-con-git)
10. [Solución de problemas](#solución-de-problemas)
11. [Desarrollo y publicación en npm](#desarrollo-y-publicación-en-npm)
12. [Licencia](#licencia)

---

## Requisitos

| Requisito | Detalle |
|-----------|---------|
| **Node.js** | **18 o superior** (`engines` en `package.json`) |
| **Git** | Solo obligatorio para el comando **`compare`** |
| **Red** | Necesaria si activas **`audit: true`** (consulta al registro de paquetes) |

---

## Instalación

Elige **una** de estas formas según tu flujo de trabajo.

### Opción A: `npx` (sin instalar globalmente)

Ideal para probar o para scripts puntuales en CI:

```bash
npx bundlelens@latest --help
```

La primera ejecución descarga el paquete; las siguientes pueden usar caché de npm.

### Opción B: Dependencia del proyecto (`devDependencies`)

Recomendado para equipos y pipelines reproducibles:

```bash
npm install --save-dev bundlelens
```

Luego invoca el binario con `npx` o desde `package.json`:

```json
{
  "scripts": {
    "bundlelens": "bundlelens run",
    "bundlelens:analyze": "bundlelens analyze"
  }
}
```

```bash
npm run bundlelens
```

### Opción C: Instalación global

```bash
npm install -g bundlelens
bundlelens --help
```

### Opción D: Clonar el repositorio y compilar

Si contribuyes al código fuente:

```bash
git clone <url-del-repo>
cd bundlelens
npm install
npm run build
node ./dist/cli/index.js --help
```

Para usar el comando `bundlelens` desde el árbol local sin publicar:

```bash
npm link
# o
npx bundlelens --help   # tras npm pack / npm install ./ruta
```

---

## Primeros pasos (5 minutos)

### Paso 1: Generar configuración

En la raíz de tu proyecto (donde está `package.json`):

```bash
npx bundlelens init
```

Esto crea **`bundlelens.config.json`** con valores por defecto y, si existe **`.gitignore`**, añade una entrada para la carpeta de informes (por defecto `bundlelens/`), salvo que uses `--skip-gitignore`.

### Paso 2: Ajustar `buildDir` y `buildCommand`

Abre `bundlelens.config.json` y comprueba:

- **`buildCommand`**: el mismo comando que usarías en terminal para producir el build (p. ej. `npm run build`, `pnpm run build`).
- **`buildDir`**: carpeta **relativa al archivo de config** donde quedan los artefactos (p. ej. `dist`, `build`, `.next/out` según tu stack).

### Paso 3: Ejecutar un análisis completo

```bash
npx bundlelens run
```

Si no pusiste `buildCommand` en el archivo, la herramienta puede pedírtelo de forma interactiva (necesita una terminal TTY).

### Paso 4: Abrir el informe

Tras un `run` o `analyze` correcto, abre en el navegador:

- **`./bundlelens/index.html`** (ruta relativa a tu proyecto; el nombre de carpeta depende de `outputDir` en la config).

---

## Comandos del CLI

Invocación general:

```bash
bundlelens <comando> [argumentos] [opciones]
```

Si ejecutas **`bundlelens`** sin argumentos, se muestra la ayuda y el proceso termina con código distinto de cero (para que los scripts fallen de forma explícita).

---

### `bundlelens init`

Crea **`bundlelens.config.json`** en el directorio actual y opcionalmente actualiza **`.gitignore`**.

| Opción | Descripción |
|--------|-------------|
| `--force` | Sobrescribe `bundlelens.config.json` si ya existe. |
| `--skip-gitignore` | No modifica `.gitignore`. |
| `--output <dir>` | Escribe en la config el valor de **`outputDir`** (por defecto en el JSON: `bundlelens`). |

**Ejemplos:**

```bash
bundlelens init
bundlelens init --output reports/bundlelens
bundlelens init --force --skip-gitignore
```

---

### `bundlelens run`

1. Opcionalmente ajusta **`.npmrc`** si hace falta coherencia con `package-lock` (misma lógica que en `compare`).
2. Si no hay **`node_modules`** pero sí `package.json`, puede ejecutar o preguntar el comando de instalación (según config y TTY).
3. Ejecuta el **comando de build** en el directorio del proyecto.
4. Analiza **`buildDir`** y escribe informes en **`outputDir`**.

| Argumento / opción | Descripción |
|--------------------|-------------|
| `[buildCommand]` | Comando de build (posicional). Si omites y no está en la config, se puede pedir en interactivo. |
| `--build-dir <dir>` | Carpeta de salida del build a analizar. |
| `--output <dir>` | Carpeta donde escribir informes (por defecto `./bundlelens` si no configuras otra). |
| `--config <file>` | Ruta a un JSON de configuración distinto del predeterminado. |
| `--audit` | Fuerza auditoría de dependencias aunque en config esté `audit: false`. |
| `--no-audit` | Omite la auditoría aunque en config esté `audit: true`. |
| `--fail-on-build` | Si el build termina con código ≠ 0, el proceso de Node hereda ese código de salida (según política de flags vs config). |
| `--no-fail-on-build` | No propagar el código de error del build aunque `failOnBuild` esté en `true` en la config. |

**Ejemplos:**

```bash
bundlelens run
bundlelens run "npm run build"
bundlelens run --build-dir dist --no-audit
bundlelens run --config ./config/bundlelens.config.json
```

---

### `bundlelens analyze`

Analiza una carpeta de build **ya generada** (no ejecuta el comando de build).

| Argumento / opción | Descripción |
|--------------------|-------------|
| `[buildDir]` | Ruta del build (posicional). Equivalente práctico a indicar `--build-dir`. |
| `--build-dir <dir>` | Misma idea que el posicional; útil en scripts. |
| `--output <dir>` | Carpeta de informes. |
| `--config <file>` | Archivo de configuración. |
| `--audit` / `--no-audit` | Igual que en `run`. |

**Ejemplos:**

```bash
bundlelens analyze dist
bundlelens analyze --build-dir .next
```

---

### `bundlelens compare`

Construye y analiza **dos refs de Git** (ramas, tags o commits) usando **worktrees** temporales y genera un informe comparativo.

**Requisitos:** estar dentro de un repositorio Git; refs distintas para base y head.

| Opción | Descripción |
|--------|-------------|
| `--base <ref>` | Ref “base” (referencia). |
| `--head <ref>` | Ref “cambios” / comparación. |
| `--build-command <cmd>` | Override del comando de build (por lado; se fusiona como en `run`). |
| `--build-dir <dir>` | Override de carpeta de build. |
| `--install-command <cmd>` | Comando de instalación cuando falta `node_modules` (después de lo definido en config). |
| `--output <dir>` | Raíz de informes; el compare se escribe en **`<output>/compare/`** (tras fusionar con `outputDir` de la config). |
| `--config <file>` | Configuración. |
| `--audit` / `--no-audit` | Control explícito de auditoría. |
| `--fail-on-build` / `--no-fail-on-build` | Propagar fallo de build en uno o ambos lados. |

Si no pasas `--base` / `--head`, puedes definir **`compare.baseBranch`** y **`compare.headBranch`** en la config, o elegir refs de forma interactiva si hay TTY.

**Ejemplo:**

```bash
bundlelens compare --base main --head feature/metrics
```

---

## Archivo de configuración (`bundlelens.config.json`)

El archivo por defecto se llama **`bundlelens.config.json`** en la raíz del proyecto. Puedes validarlo y obtener autocompletado en el editor apuntando el campo **`$schema`** al esquema incluido en el paquete:

```json
{
  "$schema": "./node_modules/bundlelens/bundlelens.schema.json",
  "buildCommand": "npm run build",
  "buildDir": "dist",
  "outputDir": "bundlelens",
  "audit": true,
  "failOnBuild": false,
  "compression": {
    "gzip": true,
    "brotli": true
  },
  "thresholds": {
    "enabled": false,
    "categories": {}
  },
  "compare": {
    "baseBranch": "main",
    "headBranch": "develop"
  },
  "install": {
    "command": "npm ci"
  }
}
```

### Propiedades resumidas

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| **`$schema`** | string | URI del JSON Schema (recomendado para el IDE). |
| **`buildCommand`** | string | Comando de shell para `bundlelens run`. |
| **`buildDir`** | string | Directorio de salida del build. **Rutas relativas** se resuelven desde **la ubicación del archivo de config**. |
| **`outputDir`** | string | Carpeta de salida de informes (relativa al **cwd** del proyecto al ejecutar el CLI). |
| **`audit`** | boolean | Si es `true`, se ejecuta el audit del gestor detectado por lockfile. Por defecto en la herramienta suele tratarse como `true` si no se indica lo contrario en archivo/flags. |
| **`failOnBuild`** | boolean | Si es `true`, propagar código de salida del build cuando falle. |
| **`compression`** | object | `gzip` y `brotli`: calcular tamaños comprimidos por archivo durante el indexado. |
| **`thresholds`** | object | `enabled` y `categories` con límites por tipo de archivo (`maxFileRawBytes`, `maxFileGzipBytes`, `maxTotalRawBytes`, `maxTotalGzipBytes`). |
| **`compare`** | object | `baseBranch` y `headBranch` por defecto para `bundlelens compare`. |
| **`install`** | object | `command`: instalación no interactiva cuando falta `node_modules` (útil en CI). |

La lista exacta de claves y tipos está en **`bundlelens.schema.json`** dentro del paquete publicado.

---

## Salidas e informes

Tras **`run`** o **`analyze`**, en **`outputDir`** (p. ej. `./bundlelens/`) encontrarás típicamente:

| Archivo / carpeta | Contenido |
|-------------------|-----------|
| **`index.html`** | Informe principal (métricas y enlaces a otras vistas). |
| **`rankings.html`** | Rankings por tamaño. |
| **`files.html`** | Detalle por archivo (solo si hubo archivos indexados). |
| **`report.json`** | Misma información en JSON (útil para pipelines). |
| **Activos estáticos** | CSS/JS compartidos generados junto al HTML. |

Tras **`compare`**, bajo **`<outputDir>/compare/`** (donde `outputDir` es el valor **resuelto** de tu config + carpeta `compare`):

| Archivo | Contenido |
|---------|-----------|
| **`compare.html`** | Vista comparativa base vs head. |
| **`compare-report.json`** | Payload JSON del compare. |

La CLI imprime al final rutas absolutas o relativas útiles para abrir o archivar esos archivos.

---

## Precedencia: archivo vs flags

Así está implementada la fusión hoy (importante en CI y scripts):

1. Se busca y lee **`bundlelens.config.json`** (o la ruta de **`--config`**).
2. **`buildCommand`**: si en el archivo hay `buildCommand`, **ese valor gana**; si no, se usa el del CLI (posicional en `run` u opciones equivalentes en `compare`). Misma idea con **`??`**: archivo primero, CLI como respaldo.
3. **`outputDir`**: si el archivo define **`outputDir`**, **gana** sobre `--output`; si el archivo no lo define, cuenta el flag y por último el valor por defecto (`bundlelens`).
4. **`buildDir`**: si el archivo define **`buildDir`**, **gana** sobre `--build-dir`; si solo viene del CLI, la ruta relativa se resuelve respecto al **directorio del archivo de config** cuando existe config en disco, y si no, respecto al **cwd** del proyecto.
5. **`audit` y `failOnBuild`**: si la clave **existe en el JSON** (sea `true` o `false`), **el archivo gana** y los flags **`--audit` / `--no-audit`** y **`--fail-on-build` / `--no-fail-on-build`** solo aplican cuando esa clave **no** está definida en el archivo.

Si necesitas que el CLI mande siempre (por ejemplo `--no-audit` en CI) y tu JSON fija `audit: true`, tendrás que **quitar u omitir** la clave `audit` del JSON o generar la config sin esa propiedad.

---

## Uso en CI/CD

### Principios

- **Sin TTY:** no habrá prompts interactivos. Debes proveer **`buildCommand`**, **`buildDir`** y, si aplica, **`install.command`** en la config o en flags.
- **`analyze`** es ideal cuando otro job ya ejecutó el build y solo quieres medir artefactos.
- **`--no-audit`** acelera y evita dependencia de red si no te interesa el informe de vulnerabilidades en esa job.

### Ejemplo mínimo (GitHub Actions)

```yaml
name: BundleLens
on: [push, pull_request]
jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - run: npx bundlelens@latest analyze dist --output bundlelens --no-audit
      - uses: actions/upload-artifact@v4
        with:
          name: bundlelens-report
          path: bundlelens/
```

Sustituye `dist` por tu `buildDir` real (`build`, `out`, etc.).

---

## Comparar ramas con Git

`bundlelens compare`:

1. Crea **worktrees** de Git en un directorio temporal.
2. En cada worktree puede instalar dependencias y ejecutar el build.
3. Escribe el informe bajo **`…/compare/`**.

**Buenas prácticas:**

- Asegúrate de que **`buildDir`** y **`buildCommand`** sean válidos en **ambas** refs (o usa flags).
- Si **`bundlelens.config.json`** no está **trackeado** en Git, el código intenta **reutilizar** la config del árbol principal para no perder `buildCommand` / `buildDir` en el worktree.

---

## Solución de problemas

| Síntoma | Qué revisar |
|---------|-------------|
| **0 archivos indexados** | `buildDir` incorrecto, carpeta vacía, o permisos de lectura (en macOS a veces hace falta “Full Disk Access” para la app de terminal). |
| **Fallo de `compare`** | ¿Estás en un repo Git? ¿`base` y `head` son distintos? ¿Hay red si usas `audit`? |
| **Audit vacío o error** | Conectividad; lockfile correcto; gestor instalado (`pnpm`, `yarn`, etc.). |
| **Config no encontrada** | Ruta de `--config` o cwd desde el que lanzas el comando. |
| **`ENOENT` en buildDir** | El build no generó salida o la ruta es relativa al sitio equivocado (config vs cwd). |

Para depuración rápida: abre **`report.json`** o **`compare-report.json`** y revisa `metadata.analysisNotices` si existen.

---

## Desarrollo y publicación en npm

Dirigido a **mantenedores** del paquete.

### Scripts del repositorio

| Script | Acción |
|--------|--------|
| `npm run build` | Compila TypeScript a **`dist/`** (`tsc`). |
| `npm run dev` | `tsc --watch` para desarrollo. |
| `prepublishOnly` | Antes de publicar, npm ejecuta **`npm run build`** automáticamente. |

### Contenido que se publica (`files` en `package.json`)

- **`dist/`** (código compilado).
- **`bundlelens.schema.json`** (esquema para editores y documentación).

### Checklist antes de `npm publish`

1. Versión actualizada en **`package.json`** (`npm version patch|minor|major`).
2. **`npm run build`** sin errores.
3. Probar el binario localmente: `node dist/cli/index.js run` en un proyecto de prueba.
4. Login en npm: `npm login`.
5. Publicar: `npm publish` (añade `--access public` si el scope lo requiere).

Los usuarios finales suelen consumir el paquete ya compilado; **no** hace falta TypeScript en sus proyectos para usar el CLI.

---

## Licencia

**MIT** — ver el archivo `LICENSE` del repositorio si existe, o el campo `license` en `package.json`.

---

## Enlaces útiles

- **Repositorio (código e issues):** [github.com/alejandrorodrom/bundlelens](https://github.com/alejandrorodrom/bundlelens)
- **Autor (LinkedIn):** [Alejandro Rodriguez Romero](https://www.linkedin.com/in/alejandro-rodriguez-romero/)
- **JSON Schema del config:** `bundlelens.schema.json` (en la raíz del paquete instalado o del repo).
- **Ayuda en terminal:** `bundlelens --help`, `bundlelens run --help`, etc.

Si algo del README no coincide con tu versión instalada, comprueba la versión con:

```bash
bundlelens --version
```
