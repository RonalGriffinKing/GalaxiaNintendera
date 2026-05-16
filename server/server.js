const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const { WebcastPushConnection } = require('tiktok-live-connector')

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*'
  }
})

let tiktokConnection = null

io.on('connection', (socket) => {
  console.log('Cliente conectado')

  socket.on('joinTikTok', async (username) => {
    console.log('Conectando a TikTok:', username)

    if (tiktokConnection) {
      tiktokConnection.disconnect()
    }

    tiktokConnection = new WebcastPushConnection(username)

    try {
      await tiktokConnection.connect()
      console.log('TikTok conectado')

      tiktokConnection.on('chat', data => {
        socket.emit('message', {
          platform: 'tiktok',
          user: data.nickname,
          text: data.comment
        })
      })
    } catch (err) {
      console.error('Error TikTok:', err)
    }
  })

  socket.on('disconnect', () => {
    console.log('Cliente desconectado')
  })
})

const port = process.env.PORT || 3001

server.listen(port, () => {
  console.log(`Server corriendo en http://localhost:${port}`)
})
