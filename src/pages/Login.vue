<template>
  <div class="h-screen flex items-center justify-center bg-gray-900 text-white">
    <div class="bg-gray-800 p-6 rounded-xl w-80">

      <h2 class="text-xl mb-4">Login</h2>

      <input v-model="email" placeholder="Email" class="w-full p-2 mb-3 bg-gray-700 rounded" />
      <input v-model="password" type="password" placeholder="Password" class="w-full p-2 mb-3 bg-gray-700 rounded" />

      <button @click="login" class="w-full bg-purple-500 p-2 rounded">
        Entrar
      </button>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const router = useRouter()

const login = async () => {
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)
    router.push('/dashboard')
  } catch (e) {
    alert('Error login')
  }
}
</script>