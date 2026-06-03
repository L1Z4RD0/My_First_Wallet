<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">
        <span class="logo-icon">💼</span>
        <h1>My First Wallet</h1>
        <p class="tagline">Aprende a manejar tu dinero jugando</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Usuario</label>
          <input
            v-model="username"
            type="text"
            placeholder="Ingresa tu nombre de usuario"
            autocomplete="username"
            required
          />
        </div>

        <div class="form-group">
          <label>Contraseña</label>
          <div class="password-wrapper">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Ingresa tu contraseña"
              autocomplete="current-password"
              required
            />
            <button type="button" class="toggle-pw" @click="showPassword = !showPassword">
              {{ showPassword ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

        <button type="submit" class="btn-primary login-btn" :disabled="loading">
          <span v-if="loading">Entrando...</span>
          <span v-else>Ingresar 🚀</span>
        </button>
      </form>
    </div>

    <div class="login-deco">
      <div class="deco-card" v-for="item in decoItems" :key="item.icon">
        <span class="deco-icon">{{ item.icon }}</span>
        <span class="deco-label">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { usePlayerStore } from '../store/player'
import { useAvatarStore } from '../store/avatar'

const router   = useRouter()
const auth     = useAuthStore()
const playerStore = usePlayerStore()
const avatarStore = useAvatarStore()

const username     = ref('')
const password     = ref('')
const showPassword = ref(false)
const loading      = ref(false)
const errorMsg     = ref('')

const decoItems = [
  { icon: '🎮', label: 'Juega y aprende' },
  { icon: '💰', label: 'Gana monedas' },
  { icon: '🏦', label: 'Ahorra en el banco' },
  { icon: '🏆', label: 'Gana logros' },
  { icon: '👾', label: 'Personaliza tu avatar' },
  { icon: '📈', label: 'Invierte y crece' },
]

async function handleLogin() {
  errorMsg.value = ''
  loading.value  = true
  try {
    const user = await auth.login(username.value.trim(), password.value)

    // Recargar el estado del jugador con el userId correcto
    if (user.role === 'alumno') {
      playerStore.reloadForUser(user.id)
      avatarStore.init()
      playerStore.checkLoginStreak()
      playerStore.evaluateAchievements()
    }

    if (user.role === 'admin')   router.push('/admin')
    else if (user.role === 'docente') router.push('/teacher')
    else router.push('/app')
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3rem;
  flex-wrap: wrap;
  padding: 2rem;
  background: var(--background-color);
  animation: popIn 0.5s ease-out;
}

.login-card {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: 2.5rem;
  width: min(100%, 420px);
  box-shadow: var(--shadow-md);
}

.login-logo {
  text-align: center;
  margin-bottom: 2rem;
}

.logo-icon {
  font-size: 3.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.login-logo h1 {
  font-size: 2rem;
  color: var(--primary-color);
  margin: 0;
}

.tagline {
  color: #636e72;
  margin-top: 0.4rem;
  font-size: 0.95rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-dark);
}

.form-group input {
  padding: 0.85rem 1rem;
  border: 2px solid #dfe6e9;
  border-radius: 12px;
  font-size: 1rem;
  font-family: 'Nunito', sans-serif;
  transition: border-color 0.2s;
  width: 100%;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.password-wrapper {
  position: relative;
}

.password-wrapper input {
  padding-right: 3rem;
}

.toggle-pw {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0;
}

.error-msg {
  background: #ffeaea;
  color: #d63031;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
}

.login-btn {
  width: 100%;
  padding: 1rem;
  font-size: 1.15rem;
  margin-top: 0.5rem;
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

/* Decoración lateral */
.login-deco {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  max-width: 280px;
}

.deco-card {
  background: white;
  border-radius: var(--border-radius-md);
  padding: 1.25rem;
  text-align: center;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  transition: transform 0.2s;
}

.deco-card:hover {
  transform: translateY(-4px);
}

.deco-icon {
  font-size: 1.8rem;
}

.deco-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #636e72;
}

@media (max-width: 700px) {
  .login-deco { display: none; }
}
</style>
