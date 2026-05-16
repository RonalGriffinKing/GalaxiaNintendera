import { io } from 'socket.io-client'

const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')

export const socket = socketUrl
  ? io(socketUrl, {
      autoConnect: true
    })
  : null
