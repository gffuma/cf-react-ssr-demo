// @ts-check
import { Log, LogLevel, Miniflare } from 'miniflare'
import express from 'express'
import react from '@vitejs/plugin-react'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { build, createServer as createViteServer } from 'vite'

const MINIFLARE_PORT = 3099

process.env.NODE_ENV = 'development'

/**
 * @param {string} html
 */
function parseHeadFromHTML(html) {
  const start = '<head>'
  const end = '</head>'
  return html.slice(html.indexOf(start) + start.length, html.indexOf(end))
}

/**
 * @param {string} html
 */
function parseRunTimeScriptFromHTML(html) {
  const start = '<body>'
  const end = '</body>'
  return html.slice(html.indexOf(start) + start.length, html.indexOf(end))
}

/**
 * CF Worker Build Dev ... Resolve After First Bundle OK!
 * @returns {Promise<import('rollup').RollupWatcher>}
 */
async function buildWorkerDev() {
  // @ts-ignore
  return build({
    plugins: [react()],
    configFile: false,
    mode: 'development',
    build: {
      watch: {},
      minify: false,
      outDir: 'dist/worker',
      sourcemap: true,
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

async function start() {
  // Build worker bundle and watch...
  const watcher = await buildWorkerDev()

  // Wait First Compilation ...
  await new Promise((resolve) => {
    /**
     * @param {import('rollup').RollupWatcherEvent} e
     */
    function ready(e) {
      if (e.code == 'END') {
        watcher.off('event', ready)
        resolve(null)
      }
    }
    watcher.on('event', ready)
  })

  // Mutable assets map
  const assetsMap = {}

  // Start Miniflare!
  const mf = new Miniflare({
    scriptPath: 'dist/worker/index.js',
    log: new Log(LogLevel.INFO),
    sourceMap: true,
    buildCommand: false,
    compatibilityFlags: ['streams_enable_constructors'],
    port: MINIFLARE_PORT,
    logUnhandledRejections: true,
    globals: {
      __ASSETS__: assetsMap,
    },
  })

  await mf.startServer()

  // Reload Miniflare on worker compilation end
  watcher.on('event', (e) => {
    if (e.code === 'END') {
      mf.reload()
    }
  })

  // Start Vite Dev Server
  const app = express()

  const vite = await createViteServer({
    plugins: [react()],
    build: {
      rollupOptions: {
        input: ['./src/client.tsx'],
      },
    },
    configFile: false,
    server: { middlewareMode: true },
    appType: 'custom',
  })

  app.use(vite.middlewares)

  app.use(async (req, _, next) => {
    const entry = '/src/client.tsx'
    const fakeHtml = `<html><head></head><body><script type="module" src="${entry}"></script></body></html>`
    const html = await vite.transformIndexHtml(req.originalUrl, fakeHtml)
    assetsMap.head = parseHeadFromHTML(html)
    assetsMap.endOfBody = parseRunTimeScriptFromHTML(html)
    next()
  })

  app.use(
    createProxyMiddleware({
      logLevel: 'silent',
      target: `http://127.0.0.1:${MINIFLARE_PORT}`,
      changeOrigin: true,
    })
  )

  app.listen(3000)
}

start()
