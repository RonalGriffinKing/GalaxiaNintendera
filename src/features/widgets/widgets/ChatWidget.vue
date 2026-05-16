<template>
  <div class="flex flex-col items-start gap-2">
    <transition-group name="chat">
      <div
        v-for="(msg, index) in messages"
        :key="msg.id"
        class="shadow-xl flex items-center gap-2"
        :style="messageStyle(index, msg)"
      >
        <span class="font-bold">
          {{ msg.user }}:
        </span>

        <span>
          {{ msg.text }}
        </span>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import tmi from 'tmi.js'
import { socket } from '@/services/socket'

const props = defineProps({
  widget: Object
})

const isEditor = window.location.pathname.includes('editor')
const messages = ref(
  isEditor
    ? [
        {
          id: 'preview1',
          user: 'usuario',
          text: 'Mensaje de prueba',
          platform: 'twitch'
        },
        {
          id: 'preview2',
          user: 'otro',
          text: 'Se vera asi en directo',
          platform: 'tiktok'
        }
      ]
    : []
)

const addMessage = (msg) => {
  messages.value.unshift(msg)

  if (messages.value.length > 4) {
    messages.value.pop()
  }
}

const messageStyle = (index, msg) => {
  const fontSizeBase = props.widget?.data?.fontSize || 18

  const base = {
    background: props.widget?.data?.bgColor || '#1f2937',
    color: props.widget?.data?.textColor || '#ffffff',
    width: (props.widget?.data?.width || 400) + 'px',
    padding: '12px 16px',
    borderRadius: props.widget?.data?.rounded ? '20px' : '0px',
    border: `${props.widget?.data?.borderWidth || 0}px solid ${
      props.widget?.data?.borderColor || '#ffffff'
    }`,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    transition: 'all 0.3s ease'
  }

  if (msg.platform === 'twitch') {
    base.borderColor = '#9146FF'
  }

  if (msg.platform === 'tiktok') {
    base.borderColor = '#FF0050'
  }

  if (index === 0) {
    return {
      ...base,
      fontSize: fontSizeBase + 'px',
      opacity: 1,
      transform: 'scale(1)'
    }
  }

  return {
    ...base,
    fontSize: Math.max(fontSizeBase - 4, 10) + 'px',
    opacity: 0.6,
    transform: 'scale(0.95)'
  }
}

onMounted(() => {
  if (isEditor) return

  const twitchClient = new tmi.Client({
    connection: { secure: true, reconnect: true },
    channels: [props.widget?.data?.channel || 'ibai']
  })

  twitchClient.connect()

  twitchClient.on('message', (channel, tags, message) => {
    addMessage({
      id: Date.now(),
      user: tags.username,
      text: message,
      platform: 'twitch'
    })
  })

  const tiktokUser = props.widget?.data?.tiktokUser || ''

  if (tiktokUser && socket) {
    socket.emit('joinTikTok', tiktokUser)
    socket.off('message')

    socket.on('message', (msg) => {
      if (msg.platform !== 'tiktok') return

      addMessage({
        id: Date.now(),
        user: msg.user,
        text: msg.text,
        platform: 'tiktok'
      })
    })
  }
})
</script>

<style>
.chat-enter-active {
  transition: all 0.3s ease;
}

.chat-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.chat-leave-active {
  transition: all 0.3s ease;
  position: absolute;
}

.chat-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
