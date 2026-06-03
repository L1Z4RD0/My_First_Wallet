<template>
  <div class="dashboard-page">
    <!-- Header -->
    <header class="dash-header">
      <div class="dash-logo">
        <span>💼</span>
        <h1>My First Wallet</h1>
        <span class="role-badge admin">Administrador</span>
      </div>
      <div class="dash-actions">
        <span class="dash-user">👤 {{ auth.user?.username }}</span>
        <button class="btn-logout" @click="logout">Cerrar sesión</button>
      </div>
    </header>

    <main class="dash-main">
      <!-- Tabs -->
      <div class="tabs">
        <button :class="['tab-btn', { active: activeTab === 'docentes' }]" @click="activeTab = 'docentes'">
          👨‍🏫 Docentes
        </button>
        <button :class="['tab-btn', { active: activeTab === 'alumnos' }]" @click="activeTab = 'alumnos'">
          🎒 Alumnos
        </button>
        <button :class="['tab-btn', { active: activeTab === 'crear' }]" @click="activeTab = 'crear'">
          ➕ Crear usuario
        </button>
      </div>

      <!-- TAB: DOCENTES -->
      <transition name="fade" mode="out-in">
        <div v-if="activeTab === 'docentes'" key="docentes" class="tab-content">
          <div class="section-header">
            <h2>👨‍🏫 Docentes registrados</h2>
            <span class="count-badge">{{ docentes.length }}</span>
          </div>
          <div v-if="loading" class="loading-text">Cargando...</div>
          <div v-else-if="docentes.length === 0" class="empty-state">
            <span>📋</span>
            <p>No hay docentes registrados aún.</p>
          </div>
          <div v-else class="users-table-wrap">
            <table class="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Usuario</th>
                  <th>Alumnos creados</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in docentes" :key="d.id">
                  <td>{{ d.id }}</td>
                  <td><strong>{{ d.username }}</strong></td>
                  <td>{{ alumnosPorDocente(d.id).length }}</td>
                  <td>
                    <button class="btn-danger-sm" @click="deleteUser(d)">Eliminar</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB: ALUMNOS -->
        <div v-else-if="activeTab === 'alumnos'" key="alumnos" class="tab-content">
          <div class="section-header">
            <h2>🎒 Alumnos registrados</h2>
            <span class="count-badge">{{ alumnos.length }}</span>
          </div>
          <div v-if="loading" class="loading-text">Cargando...</div>
          <div v-else-if="alumnos.length === 0" class="empty-state">
            <span>📋</span>
            <p>No hay alumnos registrados aún.</p>
          </div>
          <div v-else>
            <div v-for="grado in grades" :key="grado.value" class="grade-section">
              <div
                v-if="alumnosPorGrado(grado.value).length > 0"
                class="grade-header"
                @click="toggleGrade(grado.value)"
              >
                <h3>{{ grado.label }}</h3>
                <span class="grade-count">{{ alumnosPorGrado(grado.value).length }} alumnos</span>
                <span class="toggle-icon">{{ openGrades.includes(grado.value) ? '▲' : '▼' }}</span>
              </div>
              <div v-if="openGrades.includes(grado.value) && alumnosPorGrado(grado.value).length > 0" class="grade-students">
                <table class="users-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Racha</th>
                      <th>Logros</th>
                      <th>Juegos</th>
                      <th>Último acceso</th>
                      <th>Creado por</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="a in alumnosPorGrado(grado.value)" :key="a.id">
                      <td><strong>{{ a.username }}</strong></td>
                      <td>🔥 {{ a.consecutive_days ?? 0 }}</td>
                      <td>🏅 {{ a.achievements_count ?? 0 }}</td>
                      <td>🎮 {{ a.games_played ?? 0 }}</td>
                      <td>{{ a.last_login ?? 'Nunca' }}</td>
                      <td>{{ docenteNombre(a.created_by) }}</td>
                      <td><button class="btn-danger-sm" @click="deleteUser(a)">Eliminar</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB: CREAR -->
        <div v-else-if="activeTab === 'crear'" key="crear" class="tab-content">
          <h2>➕ Crear nuevo usuario</h2>
          <div class="create-form">
            <div class="form-group">
              <label>Rol</label>
              <div class="role-selector">
                <button
                  :class="['role-opt', { active: newUser.role === 'docente' }]"
                  @click="newUser.role = 'docente'; newUser.grade = null"
                >
                  👨‍🏫 Docente
                </button>
                <button
                  :class="['role-opt', { active: newUser.role === 'alumno' }]"
                  @click="newUser.role = 'alumno'"
                >
                  🎒 Alumno
                </button>
              </div>
            </div>

            <div class="form-group">
              <label>Nombre de usuario</label>
              <input v-model="newUser.username" type="text" placeholder="Ej: profe_garcia" />
            </div>

            <div class="form-group">
              <label>Contraseña</label>
              <input v-model="newUser.password" type="password" placeholder="Mínimo 6 caracteres" />
            </div>

            <div v-if="newUser.role === 'alumno'" class="form-group">
              <label>Grado</label>
              <select v-model.number="newUser.grade">
                <option :value="null" disabled>Selecciona el grado</option>
                <option v-for="g in grades" :key="g.value" :value="g.value">{{ g.label }}</option>
              </select>
            </div>

            <p v-if="createError" class="error-msg">{{ createError }}</p>
            <p v-if="createSuccess" class="success-msg">{{ createSuccess }}</p>

            <button class="btn-primary create-btn" @click="createUser" :disabled="creating">
              {{ creating ? 'Creando...' : 'Crear usuario' }}
            </button>
          </div>
        </div>
      </transition>
    </main>

    <!-- Confirm Delete Modal -->
    <div v-if="userToDelete" class="modal-overlay" @click.self="userToDelete = null">
      <div class="modal-content">
        <h3>¿Eliminar usuario?</h3>
        <p>¿Estás seguro de eliminar a <strong>{{ userToDelete.username }}</strong>?<br>Esta acción no se puede deshacer.</p>
        <div class="modal-btns">
          <button class="btn-danger" @click="confirmDelete">Eliminar</button>
          <button class="btn-cancel" @click="userToDelete = null">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const router = useRouter()
const auth   = useAuthStore()

const API = 'http://localhost:3000'
const activeTab = ref('docentes')
const loading   = ref(false)
const users     = ref([])
const openGrades = ref([1, 2, 3, 4, 5, 6, 7, 8])

const newUser = ref({ username: '', password: '', role: 'alumno', grade: null })
const creating      = ref(false)
const createError   = ref('')
const createSuccess = ref('')

const userToDelete = ref(null)

const grades = [
  { value: 1, label: '1° Básico' }, { value: 2, label: '2° Básico' },
  { value: 3, label: '3° Básico' }, { value: 4, label: '4° Básico' },
  { value: 5, label: '5° Básico' }, { value: 6, label: '6° Básico' },
  { value: 7, label: '7° Básico' }, { value: 8, label: '8° Básico' }
]

const docentes = computed(() => users.value.filter(u => u.role === 'docente'))
const alumnos  = computed(() => users.value.filter(u => u.role === 'alumno'))

const alumnosPorGrado   = (g)  => alumnos.value.filter(a => a.grade === g)
const alumnosPorDocente = (id) => alumnos.value.filter(a => a.created_by === id)
const docenteNombre     = (id) => {
  if (!id) return 'Admin'
  const d = docentes.value.find(d => d.id === id)
  return d ? d.username : `ID ${id}`
}

const toggleGrade = (g) => {
  const idx = openGrades.value.indexOf(g)
  if (idx >= 0) openGrades.value.splice(idx, 1)
  else openGrades.value.push(g)
}

async function fetchUsers() {
  loading.value = true
  try {
    const res = await fetch(`${API}/api/admin/users`, { headers: auth.authHeader() })
    users.value = await res.json()
  } finally {
    loading.value = false
  }
}

async function createUser() {
  createError.value   = ''
  createSuccess.value = ''
  if (!newUser.value.username.trim() || !newUser.value.password.trim()) {
    createError.value = 'Usuario y contraseña son obligatorios.'
    return
  }
  if (newUser.value.role === 'alumno' && !newUser.value.grade) {
    createError.value = 'Selecciona el grado del alumno.'
    return
  }
  creating.value = true
  try {
    const res = await fetch(`${API}/api/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
      body: JSON.stringify(newUser.value)
    })
    const data = await res.json()
    if (!res.ok) { createError.value = data.error; return }
    createSuccess.value = `Usuario "${data.username}" creado correctamente.`
    newUser.value = { username: '', password: '', role: 'alumno', grade: null }
    await fetchUsers()
  } finally {
    creating.value = false
  }
}

function deleteUser(user) {
  userToDelete.value = user
}

async function confirmDelete() {
  const id = userToDelete.value.id
  userToDelete.value = null
  await fetch(`${API}/api/admin/users/${id}`, { method: 'DELETE', headers: auth.authHeader() })
  await fetchUsers()
}

function logout() {
  auth.logout()
  router.push('/login')
}

onMounted(fetchUsers)
</script>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  background: var(--background-color);
  display: flex;
  flex-direction: column;
}

.dash-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 2rem;
  background: white;
  box-shadow: var(--shadow-sm);
  flex-wrap: wrap;
  gap: 1rem;
}

.dash-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.5rem;
}

.dash-logo h1 {
  font-size: 1.5rem;
  color: var(--primary-color);
  margin: 0;
}

.role-badge {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  text-transform: uppercase;
}
.role-badge.admin { background: #fdcb6e; color: #6c4b00; }

.dash-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.dash-user { font-weight: 700; color: #636e72; }

.btn-logout {
  background: #d63031;
  color: white;
  border: none;
  padding: 0.5rem 1.2rem;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-logout:hover { background: #c0392b; }

.dash-main {
  flex: 1;
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
}

.tabs {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.tab-btn {
  background: white;
  border: 2px solid #dfe6e9;
  padding: 0.65rem 1.4rem;
  border-radius: 20px;
  font-family: 'Nunito', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-dark);
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn:hover { background: #f1f2f6; }
.tab-btn.active { background: var(--primary-color); color: white; border-color: var(--primary-color); }

.tab-content {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: 2rem;
  box-shadow: var(--shadow-sm);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.section-header h2 { margin: 0; }

.count-badge {
  background: var(--primary-color);
  color: white;
  font-weight: 800;
  padding: 0.2rem 0.7rem;
  border-radius: 999px;
  font-size: 0.9rem;
}

.loading-text { color: #636e72; font-style: italic; padding: 1rem 0; }

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #b2bec3;
}
.empty-state span { font-size: 2.5rem; display: block; margin-bottom: 1rem; }

.users-table-wrap { overflow-x: auto; }

.users-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.5rem;
}
.users-table th, .users-table td {
  padding: 0.85rem 1rem;
  text-align: left;
  border-bottom: 1px solid #f1f2f6;
  font-size: 0.95rem;
}
.users-table th { background: #f8f9fa; font-weight: 800; color: #636e72; font-size: 0.85rem; text-transform: uppercase; }
.users-table tbody tr:hover { background: #f9fafe; }

.btn-danger-sm {
  background: #ff7675;
  color: white;
  border: none;
  padding: 0.35rem 0.85rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-danger-sm:hover { background: #d63031; }

/* Grados */
.grade-section { margin-bottom: 1.5rem; }
.grade-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1.2rem;
  background: #f8f9fa;
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}
.grade-header:hover { background: #edf2f7; }
.grade-header h3 { margin: 0; font-size: 1.1rem; color: var(--primary-color); }
.grade-count { margin-left: auto; font-size: 0.85rem; font-weight: 700; color: #636e72; }
.toggle-icon { font-size: 0.75rem; color: #b2bec3; }
.grade-students { padding: 0.75rem 0; overflow-x: auto; }

/* Formulario crear */
.create-form {
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-top: 1.5rem;
}
.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-group label { font-weight: 700; font-size: 0.95rem; }
.form-group input, .form-group select {
  padding: 0.85rem 1rem;
  border: 2px solid #dfe6e9;
  border-radius: 12px;
  font-size: 1rem;
  font-family: 'Nunito', sans-serif;
  transition: border-color 0.2s;
}
.form-group input:focus, .form-group select:focus { outline: none; border-color: var(--primary-color); }

.role-selector { display: flex; gap: 0.75rem; }
.role-opt {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #dfe6e9;
  border-radius: 12px;
  background: white;
  font-family: 'Nunito', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.role-opt:hover { border-color: var(--primary-color); }
.role-opt.active { background: var(--primary-color); color: white; border-color: var(--primary-color); }

.error-msg   { background: #ffeaea; color: #d63031; padding: 0.75rem 1rem; border-radius: 10px; font-weight: 600; }
.success-msg { background: #eafff5; color: #00b894; padding: 0.75rem 1rem; border-radius: 10px; font-weight: 600; }

.create-btn { width: 100%; font-size: 1.1rem; padding: 1rem; }
.create-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

/* Modal */
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.45); display: flex;
  justify-content: center; align-items: center;
  z-index: 999; backdrop-filter: blur(4px);
}
.modal-content {
  background: white; border-radius: var(--border-radius-lg);
  padding: 2rem; width: min(95%, 400px);
  box-shadow: var(--shadow-md); text-align: center;
}
.modal-content h3 { margin-bottom: 1rem; }
.modal-content p  { color: #636e72; margin-bottom: 1.5rem; line-height: 1.6; }
.modal-btns { display: flex; gap: 1rem; justify-content: center; }
.btn-danger  { background: #d63031; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 999px; font-weight: 700; cursor: pointer; }
.btn-cancel  { background: #f1f2f6; color: var(--text-dark); border: none; padding: 0.75rem 1.5rem; border-radius: 999px; font-weight: 700; cursor: pointer; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }
</style>
