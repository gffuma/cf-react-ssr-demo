// @ts-check
import process from 'process'
import fs from 'fs'
import { build } from 'vite'
import react from '@vitejs/plugin-react'

process.env.NODE_ENV = 'production'

async function buildClientProd() {
  await build({
    plugins: [react()],
    configFile: false,
    build: {
      manifest: 'assets_manifest.json',
      emptyOutDir: true,
      outDir: 'dist/client',
      sourcemap: true,
      rollupOptions: {
        input: ['./src/client.tsx'],
      },
    },
  })
}

/**
 * @param manifest {Record<string, Record<string, any>>}
 */
function parseManifest(manifest) {
  const css = new Set()
  const scripts = new Set()
  Object.keys(manifest).forEach((k) => {
    if (manifest[k].isEntry === true) {
      scripts.add(manifest[k].file)
      ;(manifest[k].css ?? []).forEach((/** @type {any} */ f) => css.add(f))
    }
  })

  const cssHTML = Array.from(css)
    .map((f) => `<link rel="stylesheet" href="/${f}">`)
    .join('')
  const scriptsHtml = Array.from(scripts)
    .map((f) => `<script type="module" crossorigin src="/${f}"></script>`)
    .join('')

  return {
    head: cssHTML,
    endOfBody: scriptsHtml,
  }
}

async function buildWorkerProd() {
  const assetsClientManifest = JSON.parse(
    fs.readFileSync('dist/client/assets_manifest.json', 'utf-8')
  )

  await build({
    plugins: [react()],
    configFile: false,
    define: {
      __ASSETS__: JSON.stringify(parseManifest(assetsClientManifest)),
    },
    build: {
      copyPublicDir: false,
      emptyOutDir: true,
      outDir: 'dist/worker',
      // Supported in prod? I don't think so...
      sourcemap: false,
      rollupOptions: {
        output: {
          entryFileNames: '[name].js',
        },
        input: ['./worker/index.tsx'],
      },
    },
    ssr: {
      target: 'webworker',
      noExternal: true,
    },
  })
}

async function buildAll() {
  await buildClientProd()
  await buildWorkerProd()
}

buildAll()
