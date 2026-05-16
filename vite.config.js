import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { handler as igdbHandler } from './netlify/functions/igdb.js'
import { handler as youtubeFeedHandler } from './netlify/functions/youtube-feed.js'

const readRequestBody = (req) => {
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
      res.end(result.body || '')
    }

    server.middlewares.use('/.netlify/functions/igdb', async (req, res) => {
      try {
        await runFunction(igdbHandler, req, res)
      } catch (error) {
        server.config.logger.error(error)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'No se pudo ejecutar la funcion local' }))
      }
    })

    server.middlewares.use('/.netlify/functions/youtube-feed', async (req, res) => {
      try {
        await runFunction(youtubeFeedHandler, req, res)
      } catch (error) {
        server.config.logger.error(error)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'No se pudo ejecutar la funcion local' }))
      }
    })
  }
})

export default defineConfig({
  plugins: [netlifyFunctionsDev(), vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
