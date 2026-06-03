<template>
  <div class="dashboard-page">
    <!-- Header -->
    <header class="dash-header">
      <div class="dash-logo">
        <span>💼</span>
        <h1>My First Wallet</h1>
        <span class="role-badge teacher">Docente</span>
      </div>
      <div class="dash-actions">
        <span class="dash-user">👤 {{ auth.user?.username }}</span>
        <button class="btn-report" @click="generateReport">📄 Generar reporte</button>
        <button class="btn-logout" @click="logout">Cerrar sesión</button>
      </div>
    </header>

    <main class="dash-main">

      <!-- KPIs -->
      <section class="kpi-grid" v-if="kpis">
        <div class="kpi-card primary">
          <span class="kpi-icon">🎒</span>
          <div>
            <p class="kpi-label">Total alumnos</p>
            <p class="kpi-value">{{ kpis.totalStudents }}</p>
          </div>
        </div>
        <div class="kpi-card green">
          <span class="kpi-icon">🎮</span>
          <div>
            <p class="kpi-label">Mayor participación</p>
            <p class="kpi-value">{{ kpis.topParticipation[0]?.username ?? '—' }}</p>
            <p class="kpi-sub" v-if="kpis.topParticipation[0]">{{ kpis.topParticipation[0].games_played }} juegos</p>
          </div>
        </div>
        <div class="kpi-card orange">
          <span class="kpi-icon">🔥</span>
          <div>
            <p class="kpi-label">Mayor racha</p>
            <p class="kpi-value">{{ kpis.topStreak[0]?.username ?? '—' }}</p>
            <p class="kpi-sub" v-if="kpis.topStreak[0]">{{ kpis.topStreak[0].consecutive_days }} días</p>
          </div>
        </div>
        <div class="kpi-card purple">
          <span class="kpi-icon">🏅</span>
          <div>
            <p class="kpi-label">Más logros</p>
            <p class="kpi-value">{{ kpis.topAchievements[0]?.username ?? '—' }}</p>
            <p class="kpi-sub" v-if="kpis.topAchievements[0]">{{ kpis.topAchievements[0].achievements_count }} logros</p>
          </div>
        </div>
      </section>

      <!-- Tabs -->
      <div class="tabs">
        <button :class="['tab-btn', { active: activeTab === 'alumnos' }]" @click="activeTab = 'alumnos'">
          🎒 Mis alumnos
        </button>
        <button :class="['tab-btn', { active: activeTab === 'rankings' }]" @click="activeTab = 'rankings'">
          🏆 Rankings
        </button>
        <button :class="['tab-btn', { active: activeTab === 'crear' }]" @click="activeTab = 'crear'">
          ➕ Crear alumno
        </button>
      </div>

      <transition name="fade" mode="out-in">
        <!-- TAB: ALUMNOS -->
        <div v-if="activeTab === 'alumnos'" key="alumnos" class="tab-content">
          <div class="section-header">
            <h2>🎒 Mis alumnos</h2>
            <span class="count-badge">{{ students.length }}</span>
          </div>
          <div v-if="loading" class="loading-text">Cargando...</div>
          <div v-else-if="students.length === 0" class="empty-state">
            <span>📋</span>
            <p>Aún no has creado alumnos. ¡Ve a "Crear alumno" para comenzar!</p>
          </div>
          <div v-else class="users-table-wrap">
            <table class="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Grado</th>
                  <th>Racha</th>
                  <th>Logros</th>
                  <th>Juegos jugados</th>
                  <th>Último acceso</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in students" :key="s.id">
                  <td><strong>{{ s.username }}</strong></td>
                  <td>{{ gradeLabel(s.grade) }}</td>
                  <td>🔥 {{ s.consecutive_days ?? 0 }}</td>
                  <td>🏅 {{ s.achievements_count ?? 0 }}</td>
                  <td>🎮 {{ s.games_played ?? 0 }}</td>
                  <td>{{ s.last_login ?? 'Nunca' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB: RANKINGS -->
        <div v-else-if="activeTab === 'rankings'" key="rankings" class="tab-content">
          <h2>🏆 Rankings</h2>
          <div v-if="!kpis" class="loading-text">Cargando...</div>
          <div v-else class="rankings-grid">
            <div class="ranking-card">
              <h3>🎮 Mayor participación</h3>
              <ol class="ranking-list">
                <li v-for="(s, i) in kpis.topParticipation" :key="s.username" :class="['ranking-item', podiumClass(i)]">
                  <span class="rank-pos">{{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.` }}</span>
                  <span class="rank-name">{{ s.username }}</span>
                  <span class="rank-value">{{ s.games_played }} juegos</span>
                </li>
              </ol>
            </div>
            <div class="ranking-card">
              <h3>🔥 Mayor racha de días</h3>
              <ol class="ranking-list">
                <li v-for="(s, i) in kpis.topStreak" :key="s.username" :class="['ranking-item', podiumClass(i)]">
                  <span class="rank-pos">{{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.` }}</span>
                  <span class="rank-name">{{ s.username }}</span>
                  <span class="rank-value">{{ s.consecutive_days }} días</span>
                </li>
              </ol>
            </div>
            <div class="ranking-card">
              <h3>🏅 Más logros</h3>
              <ol class="ranking-list">
                <li v-for="(s, i) in kpis.topAchievements" :key="s.username" :class="['ranking-item', podiumClass(i)]">
                  <span class="rank-pos">{{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.` }}</span>
                  <span class="rank-name">{{ s.username }}</span>
                  <span class="rank-value">{{ s.achievements_count }} logros</span>
                </li>
              </ol>
            </div>
          </div>
        </div>

        <!-- TAB: CREAR ALUMNO -->
        <div v-else-if="activeTab === 'crear'" key="crear" class="tab-content">
          <h2>➕ Crear nuevo alumno</h2>
          <div class="create-form">
            <div class="form-group">
              <label>Nombre de usuario</label>
              <input v-model="newStudent.username" type="text" placeholder="Ej: pedro_garcia" />
            </div>
            <div class="form-group">
              <label>Contraseña</label>
              <input v-model="newStudent.password" type="password" placeholder="Mínimo 6 caracteres" />
            </div>
            <div class="form-group">
              <label>Grado</label>
              <select v-model.number="newStudent.grade">
                <option :value="null" disabled>Selecciona el grado</option>
                <option v-for="g in grades" :key="g.value" :value="g.value">{{ g.label }}</option>
              </select>
            </div>

            <p v-if="createError"   class="error-msg">{{ createError }}</p>
            <p v-if="createSuccess" class="success-msg">{{ createSuccess }}</p>

            <button class="btn-primary create-btn" @click="createStudent" :disabled="creating">
              {{ creating ? 'Creando...' : 'Crear alumno' }}
            </button>
          </div>
        </div>
      </transition>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const router = useRouter()
const auth   = useAuthStore()
const API    = 'http://localhost:3000'

const activeTab = ref('alumnos')
const loading   = ref(false)
const students  = ref([])
const kpis      = ref(null)

const newStudent    = ref({ username: '', password: '', grade: null })
const creating      = ref(false)
const createError   = ref('')
const createSuccess = ref('')

const grades = [
  { value: 1, label: '1° Básico' }, { value: 2, label: '2° Básico' },
  { value: 3, label: '3° Básico' }, { value: 4, label: '4° Básico' },
  { value: 5, label: '5° Básico' }, { value: 6, label: '6° Básico' },
  { value: 7, label: '7° Básico' }, { value: 8, label: '8° Básico' }
]

const gradeLabel = (g) => grades.find(x => x.value === g)?.label ?? `Grado ${g}`
const podiumClass = (i) => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''

async function fetchData() {
  loading.value = true
  try {
    const [studRes, kpiRes] = await Promise.all([
      fetch(`${API}/api/teacher/students`, { headers: auth.authHeader() }),
      fetch(`${API}/api/teacher/kpis`,     { headers: auth.authHeader() })
    ])
    students.value = await studRes.json()
    kpis.value     = await kpiRes.json()
  } finally {
    loading.value = false
  }
}

async function createStudent() {
  createError.value   = ''
  createSuccess.value = ''
  if (!newStudent.value.username.trim() || !newStudent.value.password.trim()) {
    createError.value = 'Usuario y contraseña son obligatorios.'
    return
  }
  if (!newStudent.value.grade) {
    createError.value = 'Selecciona el grado del alumno.'
    return
  }
  creating.value = true
  try {
    const res = await fetch(`${API}/api/teacher/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
      body: JSON.stringify(newStudent.value)
    })
    const data = await res.json()
    if (!res.ok) { createError.value = data.error; return }
    createSuccess.value = `Alumno "${data.username}" creado correctamente.`
    newStudent.value = { username: '', password: '', grade: null }
    await fetchData()
  } finally {
    creating.value = false
  }
}

function generateReport() {
  if (!students.value.length) { alert('No hay alumnos para generar el reporte.'); return }

  const lines = [
    'REPORTE DE ALUMNOS — MY FIRST WALLET',
    `Docente: ${auth.user?.username}`,
    `Fecha: ${new Date().toLocaleDateString('es-CL')}`,
    '',
    'RESUMEN',
    `Total alumnos: ${kpis.value?.totalStudents ?? students.value.length}`,
    '',
    'DETALLE POR ALUMNO',
    'Usuario,Grado,Racha (días),Logros,Juegos jugados,Último acceso',
    ...students.value.map(s =>
      `${s.username},${gradeLabel(s.grade)},${s.consecutive_days ?? 0},${s.achievements_count ?? 0},${s.games_played ?? 0},${s.last_login ?? 'Nunca'}`
    ),
    '',
    'TOP 5 PARTICIPACIÓN',
    ...(kpis.value?.topParticipation ?? []).map((s, i) => `${i + 1}. ${s.username} — ${s.games_played} juegos`),
    '',
    'TOP 5 RACHA',
    ...(kpis.value?.topStreak ?? []).map((s, i) => `${i + 1}. ${s.username} — ${s.consecutive_days} días`),
    '',
    'TOP 5 LOGROS',
    ...(kpis.value?.topAchievements ?? []).map((s, i) => `${i + 1}. ${s.username} — ${s.achievements_count} logros`)
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `reporte_mfw_${new Date().toISOString().slice(0,10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

function logout() {
  auth.logout()
  router.push('/login')
}

onMounted(fetchData)
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
.dash-logo { display: flex; align-items: center; gap: 0.75rem; font-size: 1.5rem; }
.dash-logo h1 { font-size: 1.5rem; color: var(--primary-color); margin: 0; }

.role-badge { font-size: 0.75rem; font-weight: 800; padding: 0.3rem 0.8rem; border-radius: 999px; text-transform: uppercase; }
.role-badge.teacher { background: #55efc4; color: #00695c; }

.dash-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.dash-user { font-weight: 700; color: #636e72; }

.btn-report {
  background: var(--secondary-color);
  color: white; border: none;
  padding: 0.5rem 1.2rem;
  border-radius: 999px; font-weight: 700;
  cursor: pointer; transition: background 0.2s;
}
.btn-report:hover { background: #00b894; }

.btn-logout {
  background: #d63031; color: white; border: none;
  padding: 0.5rem 1.2rem; border-radius: 999px;
  font-weight: 700; cursor: pointer;
}
.btn-logout:hover { background: #c0392b; }

.dash-main {
  flex: 1;
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
}

/* KPIs */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}
.kpi-card {
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  color: white;
  box-shadow: var(--shadow-sm);
}
.kpi-card.primary { background: linear-gradient(135deg, #5B5FFB, #a29bfe); }
.kpi-card.green   { background: linear-gradient(135deg, #00b894, #55efc4); }
.kpi-card.orange  { background: linear-gradient(135deg, #e17055, #fdcb6e); }
.kpi-card.purple  { background: linear-gradient(135deg, #6c5ce7, #a29bfe); }
.kpi-icon { font-size: 2.2rem; }
.kpi-label { font-size: 0.8rem; font-weight: 700; opacity: 0.85; text-transform: uppercase; margin: 0; }
.kpi-value { font-family: 'Fredoka', sans-serif; font-size: 1.6rem; font-weight: 700; margin: 0.15rem 0 0; }
.kpi-sub   { font-size: 0.8rem; opacity: 0.85; margin: 0; }

/* Tabs */
.tabs { display: flex; gap: 0.75rem; margin-bottom: 2rem; flex-wrap: wrap; }
.tab-btn {
  background: white; border: 2px solid #dfe6e9;
  padding: 0.65rem 1.4rem; border-radius: 20px;
  font-family: 'Nunito', sans-serif; font-size: 1rem;
  font-weight: 700; color: var(--text-dark);
  cursor: pointer; transition: all 0.2s;
}
.tab-btn:hover { background: #f1f2f6; }
.tab-btn.active { background: var(--primary-color); color: white; border-color: var(--primary-color); }

.tab-content {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: 2rem;
  box-shadow: var(--shadow-sm);
}

.section-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
.section-header h2 { margin: 0; }
.count-badge { background: var(--primary-color); color: white; font-weight: 800; padding: 0.2rem 0.7rem; border-radius: 999px; font-size: 0.9rem; }

.loading-text { color: #636e72; font-style: italic; padding: 1rem 0; }
.empty-state { text-align: center; padding: 3rem; color: #b2bec3; }
.empty-state span { font-size: 2.5rem; display: block; margin-bottom: 1rem; }

.users-table-wrap { overflow-x: auto; }
.users-table { width: 100%; border-collapse: collapse; }
.users-table th, .users-table td { padding: 0.85rem 1rem; text-align: left; border-bottom: 1px solid #f1f2f6; font-size: 0.95rem; }
.users-table th { background: #f8f9fa; font-weight: 800; color: #636e72; font-size: 0.85rem; text-transform: uppercase; }
.users-table tbody tr:hover { background: #f9fafe; }

/* Rankings */
.rankings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-top: 1rem; }
.ranking-card { background: #f8f9fa; border-radius: var(--border-radius-md); padding: 1.5rem; }
.ranking-card h3 { margin: 0 0 1rem; font-size: 1.1rem; color: var(--primary-color); }
.ranking-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.ranking-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.8rem; border-radius: 10px; background: white; }
.ranking-item.gold   { background: linear-gradient(135deg, #ffeaa7, #fdcb6e22); }
.ranking-item.silver { background: linear-gradient(135deg, #dfe6e9, #b2bec322); }
.ranking-item.bronze { background: linear-gradient(135deg, #fab1a0, #e1785322); }
.rank-pos  { font-size: 1.1rem; min-width: 2rem; }
.rank-name { flex: 1; font-weight: 700; }
.rank-value { font-size: 0.85rem; font-weight: 700; color: #636e72; }

/* Crear alumno */
.create-form { max-width: 480px; display: flex; flex-direction: column; gap: 1.25rem; margin-top: 1.5rem; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-group label { font-weight: 700; font-size: 0.95rem; }
.form-group input, .form-group select {
  padding: 0.85rem 1rem; border: 2px solid #dfe6e9;
  border-radius: 12px; font-size: 1rem;
  font-family: 'Nunito', sans-serif; transition: border-color 0.2s;
}
.form-group input:focus, .form-group select:focus { outline: none; border-color: var(--primary-color); }
.error-msg   { background: #ffeaea; color: #d63031; padding: 0.75rem 1rem; border-radius: 10px; font-weight: 600; }
.success-msg { background: #eafff5; color: #00b894; padding: 0.75rem 1rem; border-radius: 10px; font-weight: 600; }
.create-btn { width: 100%; font-size: 1.1rem; padding: 1rem; }
.create-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }
</style>
