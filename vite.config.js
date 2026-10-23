import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { handler as xboxProfileHandler } from './netlify/functions/xbox-profile.js'
import { handler as nintendoPresenceHandler } from './netlify/functions/nintendo-presence.js'
import { handler as igdbHandler } from './netlify/functions/igdb.js'
import { handler as imageProxyHandler } from './netlify/functions/image-proxy.js'
import { handler as youtubeFeedHandler } from './netlify/functions/youtube-feed.js'
import { createVacationHandler } from './netlify/functions/vacations.js'
import { createVacationDevStore } from './scripts/vacation-dev-store.mjs'

const readRequestBody = req => {
  return new Promise((resolve, reject) => {
    let body = ''

    req.on('data', chunk => {
      body += chunk
    })

    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

const netlifyFunctionsDev = () => ({
  name: 'netlify-functions-dev',

  configureServer(server) {
    const vacationStore = createVacationDevStore(path.join(server.config.root, '.netlify', 'vacation-dev-data'))
    const vacationHandler = createVacationHandler(() => vacationStore)
    const runFunction = async (handler, req, res) => {
      const body = await readRequestBody(req)
      const requestUrl = new URL(req.url, 'http://localhost')

      const result = await handler({
        httpMethod: req.method,
        headers: req.headers,
        body,
        queryStringParameters: Object.fromEntries(requestUrl.searchParams.entries())
      })

      res.statusCode = result.statusCode || 200

      Object.entries(result.headers || {}).forEach(([key, value]) => {
        res.setHeader(key, value)
      })

      if (result.isBase64Encoded) {
        res.end(Buffer.from(result.body || '', 'base64'))
        return
      }

      res.end(result.body || '')
    }

    server.middlewares.use('/.netlify/functions/vacations', async (req, res) => {
      try { await runFunction(vacationHandler, req, res) }
      catch { res.statusCode = 503; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'No se pudo abrir el calendario local. Inténtalo de nuevo.' })) }
    })

    server.middlewares.use('/.netlify/functions/xbox-profile', async (req,res) => {
      try { await runFunction(xboxProfileHandler,req,res) } catch { res.statusCode=502;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'No se pudo consultar Xbox.'})) }
    })

    server.middlewares.use('/.netlify/functions/nintendo-presence', async (req, res) => {
      try { await runFunction(nintendoPresenceHandler, req, res) }
      catch { res.statusCode = 502; res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({error:'No se pudo consultar nxapi.'})) }
    })

    server.middlewares.use('/.netlify/functions/igdb', async (req, res) => {
      try {
        await runFunction(igdbHandler, req, res)
      } catch (error) {
        server.config.logger.error(error)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          error: 'No se pudo ejecutar la funcion local'
        }))
      }
    })

    server.middlewares.use('/.netlify/functions/image-proxy', async (req, res) => {
      try {
        await runFunction(imageProxyHandler, req, res)
      } catch (error) {
        server.config.logger.error(error)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          error: 'No se pudo ejecutar el proxy de imagen local'
        }))
      }
    })

    server.middlewares.use('/.netlify/functions/youtube-feed', async (req, res) => {
      try {
        await runFunction(youtubeFeedHandler, req, res)
      } catch (error) {
        server.config.logger.error(error)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          error: 'No se pudo ejecutar la funcion local'
        }))
      }
    })
  }
})

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    const vacationEnv = loadEnv(mode, process.cwd(), 'VACATION_')
    for (const key of ['VACATION_MANAGER_PASSWORD', 'VACATION_SESSION_SECRET']) {
      if (!process.env[key] && vacationEnv[key]) process.env[key] = vacationEnv[key]
    }
  }
  // Private local credential for the function proxy, never a VITE_ browser variable.
  // loadEnv reads .env.local too; production Functions use Netlify's environment.
  if (command === 'serve' && !process.env.OPENXBL_API_KEY) {
    const { OPENXBL_API_KEY } = loadEnv(mode, process.cwd(), 'OPENXBL_API_KEY')
    if (OPENXBL_API_KEY) process.env.OPENXBL_API_KEY = OPENXBL_API_KEY
  }
  return {
    optimizeDeps: { include: ['mediabunny'] },
    plugins: [
      netlifyFunctionsDev(),
      vue()
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  }
})
