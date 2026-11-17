<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'

const router = useRouter()
const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')

const verifyStudioRole = async user => {
  const snapshot = await getDoc(doc(db, 'users', user.uid))
  const profile = snapshot.data() || {}
  if (!snapshot.exists() || profile.isBlocked === true || !['admin', 'publisher'].includes(profile.role)) {
    await signOut(auth)
    throw new Error('Esta cuenta no tiene acceso al gestor global.')
  }
  await router.replace('/admin/dashboard')
}

const authenticate = async action => {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const credential = await action()
    await verifyStudioRole(credential.user)
  } catch (cause) {
    error.value = cause.message || 'No se pudo iniciar sesión. Revisa tus credenciales.'
  } finally {
    busy.value = false
  }
}

const signIn = () => authenticate(() => signInWithEmailAndPassword(auth, email.value.trim(), password.value))
const signInGoogle = () => authenticate(() => signInWithPopup(auth, new GoogleAuthProvider()))
</script>

<template>
  <main class="studio-login">
    <form class="login-card" @submit.prevent="signIn">
      <div class="brand-mark" aria-hidden="true">✦</div>
      <p class="eyebrow">GALAXIA NINTENDERA</p>
      <h1>Galaxia Studio</h1>
      <p class="intro">Acceso privado al gestor global del sitio.</p>
      <button class="google" type="button" :disabled="busy" @click="signInGoogle">Continuar con Google</button>
      <div class="divider"><span />o con tu cuenta<span /></div>
      <label>Correo electrónico<input v-model="email" type="email" autocomplete="username" required /></label>
      <label>Contraseña<input v-model="password" type="password" autocomplete="current-password" required /></label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button class="submit" type="submit" :disabled="busy">{{ busy ? 'Comprobando acceso…' : 'Entrar al gestor' }}</button>
      <p class="access-note">Solo pueden acceder cuentas admin o publisher activas.</p>
    </form>
  </main>
</template>

<style scoped>
.studio-login{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at 20% 15%,#6236a640,transparent 40%),radial-gradient(ellipse at 85% 85%,#007f9c30,transparent 42%),#080d18;color:#eef3ff;font-family:Inter,system-ui,sans-serif}.login-card{width:min(100%,420px);padding:34px;border:1px solid #303b55;border-radius:22px;background:#111a2cee;box-shadow:0 28px 90px #0008}.brand-mark{width:46px;height:46px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(135deg,#a78bfa,#67e8f9);color:#111827;font-size:25px}.eyebrow{margin:23px 0 8px;color:#baa5ff;font-size:11px;font-weight:800;letter-spacing:.16em}.login-card h1{margin:0;font-size:32px;letter-spacing:-.04em}.intro,.access-note{color:#98a7bf;font-size:14px}.intro{margin:9px 0 25px}.login-card label{display:grid;gap:7px;margin:15px 0;color:#cbd5e1;font-size:13px;font-weight:650}.login-card input{width:100%;box-sizing:border-box;padding:12px 13px;border:1px solid #34415b;border-radius:10px;background:#0b1322;color:#f8fafc;font:inherit}.google,.submit{width:100%;margin-top:15px;padding:12px;border-radius:10px;font:inherit;font-weight:750;cursor:pointer}.google{border:1px solid #34415b;background:#172238;color:#eff6ff}.submit{border:0;background:linear-gradient(100deg,#8b5cf6,#22d3ee);color:#07111c}.google:disabled,.submit:disabled{opacity:.6;cursor:wait}.divider{display:flex;align-items:center;gap:12px;margin:20px 0;color:#74839d;font-size:12px}.divider span{flex:1;height:1px;background:#303b55}.error{padding:10px 12px;border-radius:9px;background:#321c28;color:#fecdd3;font-size:13px}.access-note{margin:16px 0 0;text-align:center;font-size:12px}@media(max-width:480px){.login-card{padding:26px 21px}}
</style>
