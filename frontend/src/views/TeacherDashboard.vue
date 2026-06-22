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
        <button class="btn-report" @click="generateReport">📄 Descargar reporte</button>
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
        <button :class="['tab-btn', { active: activeTab === 'rankings' }]" @click="switchToRankings">
          📊 Rankings
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
          <div v-else-if="courses.length === 0 && students.length === 0" class="empty-state">
            <span>📋</span>
            <p>No tienes cursos asignados aún. Contacta al administrador.</p>
          </div>
          <div v-else>
            <div v-for="course in courses" :key="course.id" class="course-section">
              <div class="course-header" @click="toggleCourse(course.id)">
                <div class="course-header-left">
                  <h3>{{ course.name }}</h3>
                  <span class="grade-tag-sm">{{ gradeLabel(course.grade) }}</span>
                </div>
                <div class="course-header-right">
                  <span class="student-count">{{ studentsInCourse(course.id).length }} alumnos</span>
                  <span class="toggle-icon">{{ openCourses.includes(course.id) ? '▲' : '▼' }}</span>
                </div>
              </div>
              <div v-if="openCourses.includes(course.id)" class="users-table-wrap">
                <table class="users-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Racha</th>
                      <th>Logros</th>
                      <th>Juegos jugados</th>
                      <th>Último acceso</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="s in studentsInCourse(course.id)" :key="s.id">
                      <td><strong>{{ s.username }}</strong></td>
                      <td>🔥 {{ s.consecutive_days ?? 0 }}</td>
                      <td>🏅 {{ s.achievements_count ?? 0 }}</td>
                      <td>🎮 {{ s.games_played ?? 0 }}</td>
                      <td>{{ s.last_login ?? 'Nunca' }}</td>
                    </tr>
                    <tr v-if="studentsInCourse(course.id).length === 0">
                      <td colspan="5" style="text-align:center;color:#b2bec3;font-style:italic;">Sin alumnos en este curso</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB: RANKINGS con gráficos -->
        <div v-else-if="activeTab === 'rankings'" key="rankings" class="tab-content">
          <h2>📊 Rankings del curso</h2>
          <div v-if="!kpis" class="loading-text">Cargando datos...</div>
          <div v-else>
            <!-- Gráficos -->
            <div class="charts-grid">
              <div class="chart-card">
                <h3>🎮 Juegos jugados — Top 10</h3>
                <div class="chart-wrap"><canvas ref="chartGames"></canvas></div>
              </div>
              <div class="chart-card">
                <h3>🔥 Racha de días — Top 10</h3>
                <div class="chart-wrap"><canvas ref="chartStreak"></canvas></div>
              </div>
              <div class="chart-card">
                <h3>🏅 Logros obtenidos — Top 10</h3>
                <div class="chart-wrap"><canvas ref="chartAchievements"></canvas></div>
              </div>
              <div class="chart-card">
                <h3>📅 Actividad reciente</h3>
                <div class="chart-wrap"><canvas ref="chartActivity"></canvas></div>
              </div>
            </div>

            <!-- Tabla resumen debajo de los gráficos -->
            <div class="rankings-grid" style="margin-top:1.5rem">
              <div class="ranking-card">
                <h3>🎮 Mayor participación</h3>
                <ol class="ranking-list">
                  <li v-for="(s, i) in kpis.topParticipation" :key="s.username" :class="['ranking-item', podiumClass(i)]">
                    <span class="rank-pos">{{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.` }}</span>
                    <span class="rank-name">{{ s.username }}</span>
                    <span class="rank-value">{{ s.games_played }} juegos</span>
                  </li>
                </ol>
              </div>
              <div class="ranking-card">
                <h3>🔥 Mayor racha de días</h3>
                <ol class="ranking-list">
                  <li v-for="(s, i) in kpis.topStreak" :key="s.username" :class="['ranking-item', podiumClass(i)]">
                    <span class="rank-pos">{{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.` }}</span>
                    <span class="rank-name">{{ s.username }}</span>
                    <span class="rank-value">{{ s.consecutive_days }} días</span>
                  </li>
                </ol>
              </div>
              <div class="ranking-card">
                <h3>🏅 Más logros</h3>
                <ol class="ranking-list">
                  <li v-for="(s, i) in kpis.topAchievements" :key="s.username" :class="['ranking-item', podiumClass(i)]">
                    <span class="rank-pos">{{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.` }}</span>
                    <span class="rank-name">{{ s.username }}</span>
                    <span class="rank-value">{{ s.achievements_count }} logros</span>
                  </li>
                </ol>
              </div>
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
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import {
  Chart, BarController, CategoryScale, LinearScale, BarElement,
  Tooltip, Legend, DoughnutController, ArcElement
} from 'chart.js'

Chart.register(BarController, CategoryScale, LinearScale, BarElement, Tooltip, Legend, DoughnutController, ArcElement)

const router = useRouter()
const auth   = useAuthStore()
const API    = 'http://localhost:3000'

const activeTab   = ref('alumnos')
const loading     = ref(false)
const students    = ref([])
const courses     = ref([])
const openCourses = ref([])
const kpis        = ref(null)

const newStudent    = ref({ username: '', password: '', grade: null })
const creating      = ref(false)
const createError   = ref('')
const createSuccess = ref('')

// Chart refs
const chartGames        = ref(null)
const chartStreak       = ref(null)
const chartAchievements = ref(null)
const chartActivity     = ref(null)
let chartInstances = {}

const grades = [
  { value: 1, label: '1° Básico' }, { value: 2, label: '2° Básico' },
  { value: 3, label: '3° Básico' }, { value: 4, label: '4° Básico' },
  { value: 5, label: '5° Básico' }, { value: 6, label: '6° Básico' },
  { value: 7, label: '7° Básico' }, { value: 8, label: '8° Básico' }
]

const gradeLabel  = (g) => grades.find(x => x.value === g)?.label ?? `Grado ${g}`
const podiumClass = (i) => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''

const studentsInCourse = (courseId) => students.value.filter(s => s.course_id === courseId)

const toggleCourse = (id) => {
  const idx = openCourses.value.indexOf(id)
  if (idx >= 0) openCourses.value.splice(idx, 1)
  else openCourses.value.push(id)
}

async function fetchData() {
  loading.value = true
  try {
    const [studRes, kpiRes, courseRes] = await Promise.all([
      fetch(`${API}/api/teacher/students`, { headers: auth.authHeader() }),
      fetch(`${API}/api/teacher/kpis`,     { headers: auth.authHeader() }),
      fetch(`${API}/api/teacher/courses`,  { headers: auth.authHeader() })
    ])
    students.value = await studRes.json()
    kpis.value     = await kpiRes.json()
    courses.value  = await courseRes.json()
    openCourses.value = courses.value.map(c => c.id)
  } finally {
    loading.value = false
  }
}

function switchToRankings() {
  activeTab.value = 'rankings'
}

// Espera que el tab esté activo Y los datos cargados Y la transición termine
watch([activeTab, kpis], ([tab, data]) => {
  if (tab === 'rankings' && data) {
    setTimeout(buildCharts, 320) // 320ms > duración fade (250ms)
  }
})

function destroyCharts() {
  for (const c of Object.values(chartInstances)) c.destroy()
  chartInstances = {}
}

function buildCharts() {
  if (!kpis.value) return
  destroyCharts()

  const COLORS = {
    blue:   'rgba(91,95,251,0.85)',
    green:  'rgba(0,184,148,0.85)',
    orange: 'rgba(225,112,85,0.85)',
    purple: 'rgba(108,92,231,0.85)',
  }
  const borderRadius = 6

  // ── Juegos jugados (top 10) ─────────────────────────────
  const top10Games = [...kpis.value.topParticipation].slice(0, 10)
  chartInstances.games = new Chart(chartGames.value, {
    type: 'bar',
    data: {
      labels: top10Games.map(s => s.username),
      datasets: [{
        label: 'Juegos jugados',
        data: top10Games.map(s => s.games_played),
        backgroundColor: COLORS.blue,
        borderRadius,
      }]
    },
    options: barOptions('Juegos', COLORS.blue)
  })

  // ── Racha de días (top 10) ──────────────────────────────
  const top10Streak = [...kpis.value.topStreak].slice(0, 10)
  chartInstances.streak = new Chart(chartStreak.value, {
    type: 'bar',
    data: {
      labels: top10Streak.map(s => s.username),
      datasets: [{
        label: 'Días de racha',
        data: top10Streak.map(s => s.consecutive_days),
        backgroundColor: COLORS.orange,
        borderRadius,
      }]
    },
    options: barOptions('Días', COLORS.orange)
  })

  // ── Logros (top 10) ─────────────────────────────────────
  const top10Ach = [...kpis.value.topAchievements].slice(0, 10)
  chartInstances.achievements = new Chart(chartAchievements.value, {
    type: 'bar',
    data: {
      labels: top10Ach.map(s => s.username),
      datasets: [{
        label: 'Logros',
        data: top10Ach.map(s => s.achievements_count),
        backgroundColor: COLORS.purple,
        borderRadius,
      }]
    },
    options: barOptions('Logros', COLORS.purple)
  })

  // ── Actividad reciente: distribución de niveles ─────────
  const all = students.value
  const segments = [
    { label: 'Muy activo (≥15 juegos)',    count: all.filter(s => (s.games_played ?? 0) >= 15).length, color: '#00b894' },
    { label: 'Activo (8–14 juegos)',        count: all.filter(s => (s.games_played ?? 0) >= 8 && (s.games_played ?? 0) < 15).length, color: '#5B5FFB' },
    { label: 'Poco activo (1–7 juegos)',    count: all.filter(s => (s.games_played ?? 0) >= 1 && (s.games_played ?? 0) < 8).length, color: '#fdcb6e' },
    { label: 'Sin actividad (0 juegos)',    count: all.filter(s => (s.games_played ?? 0) === 0).length, color: '#b2bec3' },
  ]
  chartInstances.activity = new Chart(chartActivity.value, {
    type: 'doughnut',
    data: {
      labels: segments.map(s => s.label),
      datasets: [{
        data: segments.map(s => s.count),
        backgroundColor: segments.map(s => s.color),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Nunito', size: 12 }, padding: 12 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw} alumnos` } }
      }
    }
  })
}

function barOptions(yLabel, color) {
  return {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.raw} ${yLabel.toLowerCase()}` } }
    },
    scales: {
      x: { ticks: { font: { family: 'Nunito', size: 11 }, maxRotation: 35 }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { font: { family: 'Nunito', size: 11 }, stepSize: 1 }, grid: { color: '#f1f2f6' } }
    }
  }
}

// ── Reporte HTML ─────────────────────────────────────────────────────────────
function generateReport() {
  if (!students.value.length) { alert('No hay alumnos para generar el reporte.'); return }
  const all = [...students.value].sort((a, b) => (b.games_played ?? 0) - (a.games_played ?? 0))
  const date = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })

  const svgBar = (items, valueKey, color, maxVal) => {
    const barH = 22, gap = 6, labelW = 130, maxW = 280
    const total = items.length * (barH + gap)
    const bars = items.map((s, i) => {
      const val = s[valueKey] ?? 0
      const w = maxVal > 0 ? Math.round((val / maxVal) * maxW) : 0
      const y = i * (barH + gap)
      return `
        <text x="0" y="${y + 15}" font-size="11" fill="#636e72" font-family="Arial">${s.username}</text>
        <rect x="${labelW}" y="${y}" width="${w}" height="${barH}" rx="4" fill="${color}" opacity="0.85"/>
        <text x="${labelW + w + 6}" y="${y + 15}" font-size="11" fill="#2d3436" font-family="Arial" font-weight="bold">${val}</text>`
    }).join('')
    return `<svg width="${labelW + maxW + 60}" height="${total}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`
  }

  const top10G = [...kpis.value.topParticipation].slice(0,10)
  const top10S = [...kpis.value.topStreak].slice(0,10)
  const top10A = [...kpis.value.topAchievements].slice(0,10)
  const maxG = Math.max(...top10G.map(s => s.games_played ?? 0), 1)
  const maxS = Math.max(...top10S.map(s => s.consecutive_days ?? 0), 1)
  const maxA = Math.max(...top10A.map(s => s.achievements_count ?? 0), 1)

  const rows = all.map((s, i) => `
    <tr style="background:${i % 2 === 0 ? '#f9fafe' : 'white'}">
      <td style="padding:8px 10px;font-weight:700">${s.username}</td>
      <td style="padding:8px 10px;text-align:center">🔥 ${s.consecutive_days ?? 0}</td>
      <td style="padding:8px 10px;text-align:center">🏅 ${s.achievements_count ?? 0}</td>
      <td style="padding:8px 10px;text-align:center">🎮 ${s.games_played ?? 0}</td>
      <td style="padding:8px 10px;text-align:center">${s.last_login ?? 'Nunca'}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte — My First Wallet</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 30px; color: #2d3436; background: #fff; }
  h1 { color: #5B5FFB; margin: 0 0 4px; } h2 { color: #5B5FFB; margin: 30px 0 10px; font-size:1.1rem; }
  .header { border-bottom: 3px solid #5B5FFB; padding-bottom: 16px; margin-bottom: 24px; }
  .meta { color: #636e72; font-size: 0.9rem; margin-top: 4px; }
  .kpi-row { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
  .kpi-box { background: #f8f9fa; border-radius: 10px; padding: 14px 20px; min-width: 130px; }
  .kpi-box .v { font-size: 2rem; font-weight: 800; color: #5B5FFB; }
  .kpi-box .l { font-size: 0.75rem; color: #636e72; text-transform: uppercase; font-weight: 700; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; }
  th { background: #5B5FFB; color: white; padding: 10px 12px; font-size: 0.8rem; text-transform: uppercase; text-align: left; }
  .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 30px; }
  .chart-box { background: #f8f9fa; border-radius: 12px; padding: 16px 20px; }
  .chart-box h3 { margin: 0 0 14px; font-size: 0.95rem; color: #5B5FFB; }
  @media print { body { padding: 10px; } }
</style>
</head>
<body>
<div class="header">
  <h1>📊 Reporte de Rendimiento — My First Wallet</h1>
  <div class="meta">Docente: <strong>${auth.user?.username}</strong> &nbsp;|&nbsp; Fecha: ${date}</div>
</div>

<div class="kpi-row">
  <div class="kpi-box"><div class="v">${kpis.value.totalStudents}</div><div class="l">Total alumnos</div></div>
  <div class="kpi-box"><div class="v">${top10G[0]?.games_played ?? 0}</div><div class="l">Máx. juegos</div></div>
  <div class="kpi-box"><div class="v">${top10S[0]?.consecutive_days ?? 0}</div><div class="l">Máx. racha</div></div>
  <div class="kpi-box"><div class="v">${top10A[0]?.achievements_count ?? 0}</div><div class="l">Máx. logros</div></div>
  <div class="kpi-box"><div class="v">${all.filter(s => (s.games_played ?? 0) >= 15).length}</div><div class="l">Muy activos</div></div>
  <div class="kpi-box"><div class="v">${all.filter(s => (s.last_login ?? '') >= new Date(Date.now()-7*86400000).toISOString().slice(0,10)).length}</div><div class="l">Activos 7 días</div></div>
</div>

<h2>📈 Gráficos de Rendimiento</h2>
<div class="chart-grid">
  <div class="chart-box"><h3>🎮 Juegos jugados — Top 10</h3>${svgBar(top10G, 'games_played', '#5B5FFB', maxG)}</div>
  <div class="chart-box"><h3>🔥 Racha de días — Top 10</h3>${svgBar(top10S, 'consecutive_days', '#e17055', maxS)}</div>
  <div class="chart-box"><h3>🏅 Logros obtenidos — Top 10</h3>${svgBar(top10A, 'achievements_count', '#6c5ce7', maxA)}</div>
</div>

<h2>📋 Detalle completo de alumnos</h2>
<table>
  <thead><tr><th>Usuario</th><th>Racha (días)</th><th>Logros</th><th>Juegos jugados</th><th>Último acceso</th></tr></thead>
  <tbody>${rows}</tbody>
</table>

<p style="color:#b2bec3;font-size:0.8rem;margin-top:30px;text-align:center">
  Generado por My First Wallet · ${date}
</p>
</body></html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `reporte_mfw_${new Date().toISOString().slice(0,10)}.html`
  a.click()
  URL.revokeObjectURL(url)
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

function logout() {
  auth.logout()
  router.push('/login')
}

onMounted(fetchData)
</script>

<style scoped>
.dashboard-page { min-height: 100vh; background: var(--background-color); display: flex; flex-direction: column; }

.dash-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 2rem; background: white; box-shadow: var(--shadow-sm); flex-wrap: wrap; gap: 1rem; }
.dash-logo { display: flex; align-items: center; gap: 0.75rem; font-size: 1.5rem; }
.dash-logo h1 { font-size: 1.5rem; color: var(--primary-color); margin: 0; }

.role-badge { font-size: 0.75rem; font-weight: 800; padding: 0.3rem 0.8rem; border-radius: 999px; text-transform: uppercase; }
.role-badge.teacher { background: #55efc4; color: #00695c; }

.dash-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.dash-user { font-weight: 700; color: #636e72; }

.btn-report { background: var(--secondary-color); color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 999px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
.btn-report:hover { background: #00b894; }
.btn-logout { background: #d63031; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 999px; font-weight: 700; cursor: pointer; }
.btn-logout:hover { background: #c0392b; }

.dash-main { flex: 1; max-width: 1200px; margin: 0 auto; padding: 2rem; width: 100%; }

/* KPIs */
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem; margin-bottom: 2rem; }
.kpi-card { border-radius: var(--border-radius-lg); padding: 1.5rem; display: flex; align-items: center; gap: 1rem; color: white; box-shadow: var(--shadow-sm); }
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
.tab-btn { background: white; border: 2px solid #dfe6e9; padding: 0.65rem 1.4rem; border-radius: 20px; font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700; color: var(--text-dark); cursor: pointer; transition: all 0.2s; }
.tab-btn:hover { background: #f1f2f6; }
.tab-btn.active { background: var(--primary-color); color: white; border-color: var(--primary-color); }

.tab-content { background: white; border-radius: var(--border-radius-lg); padding: 2rem; box-shadow: var(--shadow-sm); }

.section-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
.section-header h2 { margin: 0; }
.count-badge { background: var(--primary-color); color: white; font-weight: 800; padding: 0.2rem 0.7rem; border-radius: 999px; font-size: 0.9rem; }

.loading-text { color: #636e72; font-style: italic; padding: 1rem 0; }
.empty-state { text-align: center; padding: 3rem; color: #b2bec3; }
.empty-state span { font-size: 2.5rem; display: block; margin-bottom: 1rem; }

/* Tabla */
.users-table-wrap { overflow-x: auto; }
.users-table { width: 100%; border-collapse: collapse; }
.users-table th, .users-table td { padding: 0.85rem 1rem; text-align: left; border-bottom: 1px solid #f1f2f6; font-size: 0.95rem; }
.users-table th { background: #f8f9fa; font-weight: 800; color: #636e72; font-size: 0.85rem; text-transform: uppercase; }
.users-table tbody tr:hover { background: #f9fafe; }

/* Cursos */
.course-section { margin-bottom: 1.5rem; }
.course-header { display: flex; justify-content: space-between; align-items: center; padding: 0.9rem 1.2rem; background: #f8f9fa; border-radius: 12px; cursor: pointer; user-select: none; transition: background 0.2s; }
.course-header:hover { background: #edf2f7; }
.course-header-left { display: flex; align-items: center; gap: 0.75rem; }
.course-header-left h3 { margin: 0; font-size: 1.1rem; color: var(--primary-color); }
.course-header-right { display: flex; align-items: center; gap: 1rem; }
.grade-tag-sm { background: var(--secondary-color); color: white; font-size: 0.75rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 999px; }
.student-count { font-size: 0.85rem; font-weight: 700; color: #636e72; }
.toggle-icon { font-size: 0.75rem; color: #b2bec3; }

/* Gráficos */
.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.5rem; margin-top: 1rem; }
.chart-card { background: #f8f9fa; border-radius: 16px; padding: 1.5rem; }
.chart-card h3 { margin: 0 0 1rem; font-size: 1rem; color: var(--primary-color); }
.chart-wrap { position: relative; height: 220px; }
.chart-wrap canvas { max-height: 220px; }

/* Rankings */
.rankings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
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
.form-group input, .form-group select { padding: 0.85rem 1rem; border: 2px solid #dfe6e9; border-radius: 12px; font-size: 1rem; font-family: 'Nunito', sans-serif; transition: border-color 0.2s; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: var(--primary-color); }
.error-msg   { background: #ffeaea; color: #d63031; padding: 0.75rem 1rem; border-radius: 10px; font-weight: 600; }
.success-msg { background: #eafff5; color: #00b894; padding: 0.75rem 1rem; border-radius: 10px; font-weight: 600; }
.create-btn { width: 100%; font-size: 1.1rem; padding: 1rem; }
.create-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }
</style>
