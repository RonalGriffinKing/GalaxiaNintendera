<template>
  <div class="login-page">
    <div class="login-bg"></div>

    <form @submit.prevent="submit" class="login-card">
      <button type="button" class="home-link" @click="goHome">
        <i class="fas fa-arrow-left"></i>
        Volver al home
      </button>

      <div class="brand">
        <img src="/src/iconos/logo.png" alt="Galaxia Nintendera" />
      </div>

      <h1>Bienvenido a la Galaxia</h1>
      <p>{{ isRegister ? 'Crea tu cuenta para guardar tus posts favoritos.' : 'Entra para continuar tu aventura nintendera.' }}</p>

      <button
        type="button"
        class="google-btn"
        :disabled="loading"
        @click="loginWithGoogle"
      >
        <span>G</span>
        Continuar con Google
      </button>

      <div class="login-divider">
        <span></span>
        <small>o usa tu email</small>
        <span></span>
      </div>

      <input
        v-if="isRegister"
        v-model="name"
        class="app-input"
        placeholder="Nombre"
      />

      <input
        v-model="email"
        type="email"
        placeholder="Email"
        class="app-input"
      />

      <input
        v-model="password"
        type="password"
        placeholder="Password"
        class="app-input"
      />

      <p v-if="error" class="error-text">
        {{ error }}
      </p>

      <button
        type="submit"
        :disabled="loading"
        class="btn-primary-galaxy w-full py-3 disabled:opacity-50"
      >
        {{ loading ? (isRegister ? 'Creando cuenta...' : 'Iniciando sesion...') : (isRegister ? 'Crear cuenta' : 'Entrar') }}
      </button>

      <button type="button" class="mode-link" @click="toggleMode">
        {{ isRegister ? 'Ya tengo cuenta' : 'Crear cuenta normal' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'

const route = useRoute()
const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const isRegister = computed(() => route.query.mode === 'register')

onMounted(() => {
  document.body.classList.add('auth-page-open')
})

onUnmounted(() => {
  document.body.classList.remove('auth-page-open')
})

const toggleMode = () => {
  router.push(isRegister.value ? '/login' : '/login?mode=register')
}

const goHome = () => {
  router.push('/')
}

const redirectAfterLogin = () => {
  router.push(route.query.redirect ? decodeURIComponent(route.query.redirect) : '/')
}

const loginWithGoogle = async () => {
  error.value = ''
  loading.value = true

  try {
    const provider = new GoogleAuthProvider()
    const credential = await signInWithPopup(auth, provider)
    const user = credential.user
    const userRef = doc(db, 'users', user.uid)
    const userSnap = await getDoc(userRef)

    const profile = {
      name: user.displayName || user.email || 'Usuario',
      email: user.email || '',
      description: 'lector',
      imageUrl: user.photoURL || '',
      provider: 'google',
      emailVerified: user.emailVerified,
      emailOptIn: true,
      updatedAt: Date.now()
    }

    if (!userSnap.exists()) {
      profile.role = 'user'
      profile.stars = 0
      profile.readPostsCount = 0
      profile.unlockedIcons = ['kirby-01']
      profile.selectedIcon = 'kirby-01'
      profile.createdAt = Date.now()
    }

    await setDoc(userRef, profile, { merge: true })

    redirectAfterLogin()
  } catch (e) {
    console.error('Google login error:', e)
    error.value = getAuthErrorMessage(e, 'No se pudo iniciar sesion con Google')
  } finally {
    loading.value = false
  }
}

const getAuthErrorMessage = (e, fallback) => {
  if (e?.code === 'auth/unauthorized-domain') {
    return 'Este dominio no esta autorizado en Firebase Authentication'
  }

  if (e?.code === 'auth/popup-blocked') {
    return 'El navegador bloqueo la ventana de Google'
  }

  if (e?.code === 'auth/popup-closed-by-user') {
    return 'Se cerro la ventana de Google antes de terminar'
  }

  return fallback
}

const submit = async () => {
  error.value = ''

  if (!email.value || !password.value || (isRegister.value && !name.value)) {
    error.value = 'Completa todos los campos'
    return
  }

  try {
    loading.value = true

    if (isRegister.value) {
      const credential = await createUserWithEmailAndPassword(auth, email.value, password.value)

      await updateProfile(credential.user, {
        displayName: name.value.trim()
      })

      await setDoc(doc(db, 'users', credential.user.uid), {
        name: name.value.trim(),
        email: email.value.trim(),
        description: 'lector',
        imageUrl: '',
        provider: 'password',
        emailVerified: credential.user.emailVerified,
        emailOptIn: true,
        role: 'user',
        stars: 0,
        readPostsCount: 0,
        unlockedIcons: ['kirby-01'],
        selectedIcon: 'kirby-01',
        selectedIconUrl: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    } else {
      await signInWithEmailAndPassword(auth, email.value, password.value)
    }

    redirectAfterLogin()
  } catch (e) {
    error.value = isRegister.value ? 'No se pudo crear la cuenta' : 'Email o contrasena incorrectos'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  align-items: center;
  background: #050816;
  box-sizing: border-box;
  display: flex;
  height: 100dvh;
  justify-content: center;
  min-height: 100dvh;
  overflow-x: hidden;
  overflow-y: hidden;
  padding: 24px;
  position: relative;
  width: 100%;
}

.login-bg {
  background:
    radial-gradient(circle at 18% 22%, rgba(168, 85, 247, 0.45), transparent 28%),
    radial-gradient(circle at 76% 72%, rgba(236, 72, 153, 0.38), transparent 25%),
    url('/src/iconos/Banner.png');
  background-position: center;
  background-size: cover;
  inset: 0;
  opacity: 0.75;
  position: absolute;
}

.login-bg::after {
  background: rgba(5, 8, 22, 0.62);
  content: '';
  inset: 0;
  position: absolute;
}

.login-card {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 24px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.28);
  display: grid;
  gap: 14px;
  max-width: 430px;
  max-height: calc(100dvh - 48px);
  min-width: 0;
  overflow-y: auto;
  padding: 30px;
  position: relative;
  scrollbar-width: none;
  width: 100%;
}

.login-card::-webkit-scrollbar {
  display: none;
}

.brand {
  display: flex;
  justify-content: center;
}

.home-link {
  align-items: center;
  color: #7c3aed;
  display: inline-flex;
  font-size: 12px;
  font-weight: 900;
  gap: 8px;
  justify-self: start;
  text-transform: uppercase;
}

.brand img {
  max-height: 88px;
  max-width: 100%;
  object-fit: contain;
}

.login-card h1 {
  color: #111827;
  font-size: 28px;
  font-weight: 900;
  line-height: 1.05;
  text-align: center;
}

.login-card p {
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
  text-align: center;
}

.google-btn {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  color: #111827;
  display: flex;
  font-size: 13px;
  font-weight: 900;
  gap: 10px;
  justify-content: center;
  min-height: 44px;
  min-width: 0;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  width: 100%;
}

.google-btn:hover:not(:disabled) {
  border-color: #c084fc;
  box-shadow: 0 10px 22px rgba(147, 51, 234, 0.12);
  transform: translateY(-1px);
}

.google-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.google-btn span {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #4285f4;
  display: flex;
  font-size: 15px;
  height: 28px;
  justify-content: center;
  width: 28px;
}

.login-divider {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr auto 1fr;
}

.login-divider span {
  background: #e5e7eb;
  height: 1px;
}

.login-divider small {
  color: #94a3b8;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}

.error-text {
  color: #ef4444 !important;
  text-align: left !important;
}

.mode-link {
  color: #7c3aed;
  font-size: 13px;
  font-weight: 900;
  margin-top: 2px;
}

.login-card :deep(input),
.login-card button {
  max-width: 100%;
  min-width: 0;
}

@media (max-width: 520px) {
  .login-page {
    align-items: center;
    height: 100dvh;
    min-height: 100svh;
    overflow: hidden;
    padding: 16px;
  }

  .login-card {
    border-radius: 18px;
    gap: 12px;
    max-height: calc(100dvh - 32px);
    padding: 20px;
  }

  .brand img {
    max-height: 68px;
  }

  .login-card h1 {
    font-size: 23px;
  }

  .login-card p {
    font-size: 12px;
  }
}
</style>
