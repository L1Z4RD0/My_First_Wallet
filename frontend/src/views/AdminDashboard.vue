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
        <button :class="['tab-btn', { active: activeTab === 'cursos' }]" @click="activeTab = 'cursos'; fetchCourses()">
          📚 Asignar Curso
        </button>
      </div>

      <transition name="fade" mode="out-in">
        <!-- TAB: DOCENTES -->
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
                  <th>Cursos asignados</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in docentes" :key="d.id">
                  <td>{{ d.id }}</td>
                  <td><strong>{{ d.username }}</strong></td>
                  <td>{{ alumnosPorDocente(d.id).length }}</td>
                  <td>{{ cursosPorDocente(d.id).length }}</td>
                  <td>
                    <button class="btn-danger-sm" @click="deleteUser(d)">Eliminar</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB: ALUMNOS (agrupados por curso) -->
        <div v-else-if="activeTab === 'alumnos'" key="alumnos" class="tab-content">
          <div class="section-header">
            <h2>🎒 Alumnos por curso</h2>
            <span class="count-badge">{{ alumnos.length }}</span>
          </div>
          <div v-if="loading" class="loading-text">Cargando...</div>
          <div v-else-if="alumnos.length === 0" class="empty-state">
            <span>📋</span>
            <p>No hay alumnos registrados aún.</p>
          </div>
          <div v-else>
            <!-- Alumnos con curso asignado -->
            <div v-for="course in courses" :key="'c'+course.id" class="grade-section">
              <div v-if="alumnosPorCurso(course.id).length > 0"
                class="grade-header" @click="toggleCourse(course.id)">
                <h3>{{ course.name }}</h3>
                <span class="grade-tag">{{ gradeLabel(course.grade) }}</span>
                <span class="grade-count">{{ alumnosPorCurso(course.id).length }} / 20 alumnos</span>
                <span v-if="course.teacher_name" class="teacher-tag">👨‍🏫 {{ course.teacher_name }}</span>
                <span class="toggle-icon">{{ openCourses.includes(course.id) ? '▲' : '▼' }}</span>
              </div>
              <div v-if="openCourses.includes(course.id) && alumnosPorCurso(course.id).length > 0" class="grade-students">
                <table class="users-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Racha</th>
                      <th>Logros</th>
                      <th>Juegos</th>
                      <th>Último acceso</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="a in alumnosPorCurso(course.id)" :key="a.id">
                      <td><strong>{{ a.username }}</strong></td>
                      <td>🔥 {{ a.consecutive_days ?? 0 }}</td>
                      <td>🏅 {{ a.achievements_count ?? 0 }}</td>
                      <td>🎮 {{ a.games_played ?? 0 }}</td>
                      <td>{{ a.last_login ?? 'Nunca' }}</td>
                      <td><button class="btn-danger-sm" @click="deleteUser(a)">Eliminar</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Alumnos sin curso -->
            <div v-if="alumnosSinCurso.length > 0" class="grade-section">
              <div class="grade-header" @click="toggleCourse(-1)">
                <h3>Sin curso asignado</h3>
                <span class="grade-count">{{ alumnosSinCurso.length }} alumnos</span>
                <span class="toggle-icon">{{ openCourses.includes(-1) ? '▲' : '▼' }}</span>
              </div>
              <div v-if="openCourses.includes(-1)" class="grade-students">
                <table class="users-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Grado</th>
                      <th>Racha</th>
                      <th>Logros</th>
                      <th>Juegos</th>
                      <th>Último acceso</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="a in alumnosSinCurso" :key="a.id">
                      <td><strong>{{ a.username }}</strong></td>
                      <td>{{ gradeLabel(a.grade) }}</td>
                      <td>🔥 {{ a.consecutive_days ?? 0 }}</td>
                      <td>🏅 {{ a.achievements_count ?? 0 }}</td>
                      <td>🎮 {{ a.games_played ?? 0 }}</td>
                      <td>{{ a.last_login ?? 'Nunca' }}</td>
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
                <button :class="['role-opt', { active: newUser.role === 'docente' }]"
                  @click="newUser.role = 'docente'; newUser.grade = null; newUser.course_id = null">
                  👨‍🏫 Docente
                </button>
                <button :class="['role-opt', { active: newUser.role === 'alumno' }]"
                  @click="newUser.role = 'alumno'">
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

            <div v-if="newUser.role === 'alumno'" class="form-group">
              <label>Curso (opcional)</label>
              <select v-model.number="newUser.course_id">
                <option :value="null">Sin curso</option>
                <option v-for="c in courses" :key="c.id" :value="c.id"
                  :disabled="c.student_count >= 20">
                  {{ c.name }} ({{ c.student_count }}/20)
                </option>
              </select>
            </div>

            <p v-if="createError" class="error-msg">{{ createError }}</p>
            <p v-if="createSuccess" class="success-msg">{{ createSuccess }}</p>

            <button class="btn-primary create-btn" @click="createUser" :disabled="creating">
              {{ creating ? 'Creando...' : 'Crear usuario' }}
            </button>
          </div>

          <!-- CSV Import -->
          <div class="csv-section">
            <h3>📂 Carga masiva por CSV</h3>
            <p class="csv-hint">
              El archivo CSV debe tener las columnas: <code>username,password,grade,course_name</code><br>
              <strong>grade</strong>: número del 1 al 8 · <strong>course_name</strong>: opcional (ej: <em>5to Básico A</em>)
            </p>
            <div class="csv-upload-row">
              <label class="btn-csv" for="csvInput">📎 Seleccionar CSV</label>
              <input id="csvInput" type="file" accept=".csv" @change="handleCsvFile" style="display:none" />
              <span v-if="csvFileName" class="csv-filename">{{ csvFileName }}</span>
            </div>
            <div v-if="csvPreview.length > 0" class="csv-preview">
              <p><strong>{{ csvPreview.length }} filas detectadas</strong> — primeras 5:</p>
              <table class="users-table">
                <thead><tr><th>username</th><th>password</th><th>grade</th><th>course_name</th></tr></thead>
                <tbody>
                  <tr v-for="(row, i) in csvPreview.slice(0,5)" :key="i">
                    <td>{{ row.username }}</td><td>••••••</td><td>{{ row.grade }}</td><td>{{ row.course_name || '—' }}</td>
                  </tr>
                </tbody>
              </table>
              <p v-if="csvError" class="error-msg">{{ csvError }}</p>
              <p v-if="csvResult" class="success-msg">{{ csvResult }}</p>
              <button class="btn-primary" @click="importCsv" :disabled="importing">
                {{ importing ? 'Importando...' : `Importar ${csvPreview.length} alumnos` }}
              </button>
            </div>
          </div>
        </div>

        <!-- TAB: ASIGNAR CURSO -->
        <div v-else-if="activeTab === 'cursos'" key="cursos" class="tab-content">
          <div class="section-header">
            <h2>📚 Asignación de cursos a docentes</h2>
            <span class="count-badge">{{ courses.length }}</span>
          </div>

          <!-- Formulario de asignación -->
          <div class="assign-panel">
            <h3>Asignar docente a un curso</h3>
            <div class="assign-form-row">
              <div class="form-group">
                <label>Docente</label>
                <select v-model="assignment.teacherId" class="select-full">
                  <option :value="null" disabled>Seleccionar docente</option>
                  <option v-for="d in docentes" :key="d.id" :value="d.id">{{ d.username }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Curso</label>
                <select v-model="assignment.courseId" class="select-full">
                  <option :value="null" disabled>Seleccionar curso</option>
                  <option v-for="c in courses" :key="c.id" :value="c.id">
                    {{ c.name }} — {{ gradeLabel(c.grade) }} ({{ c.student_count }} alumnos)
                  </option>
                </select>
              </div>
              <div class="form-group form-group-btn">
                <label>&nbsp;</label>
                <button class="btn-primary" @click="doAssign" :disabled="!assignment.teacherId || !assignment.courseId || assigning">
                  {{ assigning ? 'Guardando...' : 'Confirmar asignación' }}
                </button>
              </div>
            </div>
            <p v-if="assignMsg" :class="assignMsgType === 'error' ? 'error-msg' : 'success-msg'" style="margin-top:0.75rem">{{ assignMsg }}</p>
          </div>

          <!-- Tabla de asignaciones actuales -->
          <div v-if="coursesLoading" class="loading-text">Cargando cursos...</div>
          <div v-else-if="courses.length === 0" class="empty-state">
            <span>📚</span><p>No hay cursos aún.</p>
          </div>
          <div v-else class="users-table-wrap" style="margin-top:1.5rem">
            <table class="users-table">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Grado</th>
                  <th>Alumnos</th>
                  <th>Docente asignado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in courses" :key="c.id">
                  <td><strong>{{ c.name }}</strong></td>
                  <td><span class="grade-tag">{{ gradeLabel(c.grade) }}</span></td>
                  <td>👥 {{ c.student_count }} / 20</td>
                  <td>
                    <span v-if="c.teacher_name" class="teacher-chip">👨‍🏫 {{ c.teacher_name }}</span>
                    <span v-else class="no-teacher">Sin asignar</span>
                  </td>
                  <td>
                    <button v-if="c.teacher_id" class="btn-outline-sm" @click="removeTeacher(c)">Quitar docente</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </transition>
    </main>

    <!-- Modal confirmar eliminar -->
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

    <!-- Modal confirmar eliminar curso -->
    <div v-if="courseToDelete" class="modal-overlay" @click.self="courseToDelete = null">
      <div class="modal-content">
        <h3>¿Eliminar curso?</h3>
        <p>¿Estás seguro de eliminar <strong>{{ courseToDelete.name }}</strong>?<br>Los alumnos no serán eliminados.</p>
        <div class="modal-btns">
          <button class="btn-danger" @click="confirmDeleteCourse">Eliminar</button>
          <button class="btn-cancel" @click="courseToDelete = null">Cancelar</button>
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

const newUser = ref({ username: '', password: '', role: 'alumno', grade: null, course_id: null })
const creating      = ref(false)
const createError   = ref('')
const createSuccess = ref('')

const userToDelete = ref(null)

// Cursos
const courses        = ref([])
const coursesLoading = ref(false)
const courseToDelete = ref(null)

// CSV
const csvFileName = ref('')
const csvPreview  = ref([])
const csvError    = ref('')
const csvResult   = ref('')
const importing   = ref(false)
let csvRows = []

// Mapa curso_id → lista de alumnos (para tab Alumnos)
const courseStudentsMap = ref({})
const openCourses = ref([])

// Formulario de asignación docente–curso
const assignment   = ref({ teacherId: null, courseId: null })
const assigning    = ref(false)
const assignMsg    = ref('')
const assignMsgType = ref('success')

const grades = [
  { value: 1, label: '1° Básico' }, { value: 2, label: '2° Básico' },
  { value: 3, label: '3° Básico' }, { value: 4, label: '4° Básico' },
  { value: 5, label: '5° Básico' }, { value: 6, label: '6° Básico' },
  { value: 7, label: '7° Básico' }, { value: 8, label: '8° Básico' }
]

const gradeLabel = (g) => grades.find(x => x.value === g)?.label ?? `Grado ${g}`

const docentes = computed(() => users.value.filter(u => u.role === 'docente'))
const alumnos  = computed(() => users.value.filter(u => u.role === 'alumno'))

const alumnosPorDocente = (id) => alumnos.value.filter(a => a.created_by === id)
const cursosPorDocente  = (id) => courses.value.filter(c => c.teacher_id === id)

const alumnosEnCurso = computed(() => {
  const ids = new Set()
  for (const list of Object.values(courseStudentsMap.value))
    for (const s of list) ids.add(s.id)
  return ids
})
const alumnosPorCurso = (courseId) => courseStudentsMap.value[courseId] ?? []
const alumnosSinCurso = computed(() => alumnos.value.filter(a => !alumnosEnCurso.value.has(a.id)))

const toggleCourse = (id) => {
  const idx = openCourses.value.indexOf(id)
  if (idx >= 0) openCourses.value.splice(idx, 1)
  else openCourses.value.push(id)
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

async function fetchCourses() {
  coursesLoading.value = true
  try {
    const res = await fetch(`${API}/api/admin/courses`, { headers: auth.authHeader() })
    const data = await res.json()
    courses.value = data
    // Cargar alumnos por curso para la tab Alumnos
    const maps = {}
    await Promise.all(data.map(async c => {
      const r = await fetch(`${API}/api/admin/courses/${c.id}/students`, { headers: auth.authHeader() })
      maps[c.id] = await r.json()
    }))
    courseStudentsMap.value = maps
    openCourses.value = data.map(c => c.id)
  } finally {
    coursesLoading.value = false
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

    if (newUser.value.role === 'alumno' && newUser.value.course_id) {
      await fetch(`${API}/api/admin/courses/${newUser.value.course_id}/assign-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
        body: JSON.stringify({ student_id: data.id })
      })
    }

    createSuccess.value = `Usuario "${data.username}" creado correctamente.`
    newUser.value = { username: '', password: '', role: 'alumno', grade: null, course_id: null }
    await fetchUsers()
    await fetchCourses()
  } finally {
    creating.value = false
  }
}

async function doAssign() {
  assigning.value = true
  assignMsg.value = ''
  try {
    const res = await fetch(`${API}/api/admin/courses/${assignment.value.courseId}/teacher`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
      body: JSON.stringify({ teacher_id: assignment.value.teacherId })
    })
    const data = await res.json()
    if (!res.ok) {
      assignMsg.value = data.error
      assignMsgType.value = 'error'
      return
    }
    const teacher = docentes.value.find(d => d.id === assignment.value.teacherId)
    const course  = courses.value.find(c => c.id === assignment.value.courseId)
    assignMsg.value = `✅ ${teacher.username} asignado a ${course.name}`
    assignMsgType.value = 'success'
    assignment.value = { teacherId: null, courseId: null }
    await fetchCourses()
  } finally {
    assigning.value = false
    setTimeout(() => { assignMsg.value = '' }, 4000)
  }
}

async function removeTeacher(course) {
  await fetch(`${API}/api/admin/courses/${course.id}/teacher`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
    body: JSON.stringify({ teacher_id: null })
  })
  await fetchCourses()
}

function deleteCourse(course) { courseToDelete.value = course }

async function confirmDeleteCourse() {
  const id = courseToDelete.value.id
  courseToDelete.value = null
  await fetch(`${API}/api/admin/courses/${id}`, { method: 'DELETE', headers: auth.authHeader() })
  await fetchCourses()
}

function deleteUser(user) { userToDelete.value = user }

async function confirmDelete() {
  const id = userToDelete.value.id
  userToDelete.value = null
  await fetch(`${API}/api/admin/users/${id}`, { method: 'DELETE', headers: auth.authHeader() })
  await fetchUsers()
  await fetchCourses()
}

// CSV
function handleCsvFile(event) {
  const file = event.target.files[0]
  if (!file) return
  csvFileName.value = file.name
  csvError.value = ''
  csvResult.value = ''
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target.result
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) { csvError.value = 'El archivo CSV está vacío o no tiene datos.'; return }
    const header = lines[0].split(',').map(h => h.trim().toLowerCase())
    const requiredCols = ['username', 'password', 'grade']
    if (!requiredCols.every(c => header.includes(c))) {
      csvError.value = `Columnas requeridas: ${requiredCols.join(', ')} (también puede incluir course_name)`
      return
    }
    const getIdx = (col) => header.indexOf(col)
    csvRows = lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim())
      return {
        username:    cols[getIdx('username')]    ?? '',
        password:    cols[getIdx('password')]    ?? '',
        grade:       cols[getIdx('grade')]       ?? '',
        course_name: getIdx('course_name') >= 0 ? (cols[getIdx('course_name')] ?? '') : ''
      }
    })
    csvPreview.value = csvRows
  }
  reader.readAsText(file)
}

async function importCsv() {
  importing.value = true
  csvError.value  = ''
  csvResult.value = ''
  try {
    const res = await fetch(`${API}/api/admin/bulk-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
      body: JSON.stringify({ rows: csvRows })
    })
    const data = await res.json()
    if (!res.ok) { csvError.value = data.error; return }
    csvResult.value = `✅ ${data.created} creados, ${data.skipped} omitidos.`
    if (data.errors.length > 0) csvError.value = data.errors.slice(0, 5).join('\n')
    csvPreview.value = []
    csvFileName.value = ''
    csvRows = []
    await fetchUsers()
    await fetchCourses()
  } finally {
    importing.value = false
  }
}

function logout() {
  auth.logout()
  router.push('/login')
}

onMounted(async () => {
  await fetchUsers()
  await fetchCourses()
})
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
.role-badge.admin { background: #fdcb6e; color: #6c4b00; }

.dash-actions { display: flex; align-items: center; gap: 1rem; }
.dash-user { font-weight: 700; color: #636e72; }

.btn-logout {
  background: #d63031; color: white; border: none;
  padding: 0.5rem 1.2rem; border-radius: 999px; font-weight: 700;
  cursor: pointer; transition: background 0.2s;
}
.btn-logout:hover { background: #c0392b; }

.dash-main { flex: 1; max-width: 1200px; margin: 0 auto; padding: 2rem; width: 100%; }

.tabs { display: flex; gap: 0.75rem; margin-bottom: 2rem; flex-wrap: wrap; }

.tab-btn {
  background: white; border: 2px solid #dfe6e9;
  padding: 0.65rem 1.4rem; border-radius: 20px;
  font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700;
  color: var(--text-dark); cursor: pointer; transition: all 0.2s;
}
.tab-btn:hover { background: #f1f2f6; }
.tab-btn.active { background: var(--primary-color); color: white; border-color: var(--primary-color); }

.tab-content { background: white; border-radius: var(--border-radius-lg); padding: 2rem; box-shadow: var(--shadow-sm); }

.section-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.section-header h2 { margin: 0; }

.count-badge { background: var(--primary-color); color: white; font-weight: 800; padding: 0.2rem 0.7rem; border-radius: 999px; font-size: 0.9rem; }

.loading-text { color: #636e72; font-style: italic; padding: 1rem 0; }
.empty-state { text-align: center; padding: 3rem; color: #b2bec3; }
.empty-state span { font-size: 2.5rem; display: block; margin-bottom: 1rem; }

.users-table-wrap { overflow-x: auto; }
.users-table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
.users-table th, .users-table td { padding: 0.85rem 1rem; text-align: left; border-bottom: 1px solid #f1f2f6; font-size: 0.95rem; }
.users-table th { background: #f8f9fa; font-weight: 800; color: #636e72; font-size: 0.85rem; text-transform: uppercase; }
.users-table tbody tr:hover { background: #f9fafe; }

.btn-danger-sm { background: #ff7675; color: white; border: none; padding: 0.35rem 0.85rem; border-radius: 8px; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: background 0.2s; }
.btn-danger-sm:hover { background: #d63031; }

.btn-sm { padding: 0.45rem 1rem; font-size: 0.9rem; }

/* Grade/Course sections */
.grade-section { margin-bottom: 1.5rem; }
.grade-header { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1.2rem; background: #f8f9fa; border-radius: 12px; cursor: pointer; user-select: none; transition: background 0.2s; flex-wrap: wrap; }
.grade-header:hover { background: #edf2f7; }
.grade-header h3 { margin: 0; font-size: 1.1rem; color: var(--primary-color); }
.grade-count { margin-left: auto; font-size: 0.85rem; font-weight: 700; color: #636e72; }
.grade-tag { background: var(--secondary-color); color: white; font-size: 0.75rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 999px; }
.teacher-tag { background: #fdcb6e; color: #6c4b00; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px; }
.toggle-icon { font-size: 0.75rem; color: #b2bec3; }
.grade-students { padding: 0.75rem 0; overflow-x: auto; }

/* Formulario crear */
.create-form { max-width: 520px; display: flex; flex-direction: column; gap: 1.25rem; margin-top: 1.5rem; }
.section-desc { color: #636e72; font-size: 0.95rem; margin-bottom: 1.5rem; margin-top: -0.5rem; }

/* Panel asignación */
.assign-panel { background: #f8f9fa; border-radius: 16px; padding: 1.5rem; margin-bottom: 0.5rem; }
.assign-panel h3 { margin: 0 0 1rem; font-size: 1.05rem; color: var(--primary-color); }
.assign-form-row { display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap; }
.assign-form-row .form-group { flex: 1; min-width: 180px; }
.form-group-btn { flex: 0 0 auto; }
.select-full { width: 100%; padding: 0.85rem 1rem; border: 2px solid #dfe6e9; border-radius: 12px; font-size: 1rem; font-family: 'Nunito', sans-serif; }
.select-full:focus { outline: none; border-color: var(--primary-color); }

.teacher-chip { background: #fdcb6e; color: #6c4b00; font-size: 0.85rem; font-weight: 700; padding: 0.25rem 0.7rem; border-radius: 999px; }
.no-teacher { color: #b2bec3; font-size: 0.9rem; font-style: italic; }
.btn-outline-sm { background: white; border: 2px solid #dfe6e9; color: #636e72; padding: 0.3rem 0.8rem; border-radius: 8px; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.btn-outline-sm:hover { border-color: #d63031; color: #d63031; }
.form-row { display: flex; gap: 1rem; flex-wrap: wrap; }
.form-row .form-group { flex: 1; min-width: 180px; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-group label { font-weight: 700; font-size: 0.95rem; }
.form-group input, .form-group select {
  padding: 0.85rem 1rem; border: 2px solid #dfe6e9; border-radius: 12px;
  font-size: 1rem; font-family: 'Nunito', sans-serif; transition: border-color 0.2s;
}
.form-group input:focus, .form-group select:focus { outline: none; border-color: var(--primary-color); }
.mt-1 { margin-top: 0.75rem; }

.role-selector { display: flex; gap: 0.75rem; }
.role-opt { flex: 1; padding: 0.75rem; border: 2px solid #dfe6e9; border-radius: 12px; background: white; font-family: 'Nunito', sans-serif; font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.role-opt:hover { border-color: var(--primary-color); }
.role-opt.active { background: var(--primary-color); color: white; border-color: var(--primary-color); }

.error-msg   { background: #ffeaea; color: #d63031; padding: 0.75rem 1rem; border-radius: 10px; font-weight: 600; white-space: pre-line; }
.success-msg { background: #eafff5; color: #00b894; padding: 0.75rem 1rem; border-radius: 10px; font-weight: 600; }

.create-btn { width: 100%; font-size: 1.1rem; padding: 1rem; }
.create-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

/* CSV */
.csv-section { margin-top: 2.5rem; padding-top: 2rem; border-top: 2px dashed #dfe6e9; }
.csv-section h3 { margin-bottom: 0.5rem; }
.csv-hint { font-size: 0.9rem; color: #636e72; margin-bottom: 1rem; line-height: 1.7; }
.csv-hint code { background: #f1f2f6; padding: 0.1rem 0.4rem; border-radius: 4px; font-family: monospace; }
.csv-upload-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
.btn-csv { background: var(--primary-color); color: white; padding: 0.6rem 1.2rem; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 0.95rem; transition: background 0.2s; }
.btn-csv:hover { background: #4a4ee0; }
.csv-filename { font-size: 0.9rem; color: #636e72; font-style: italic; }
.csv-preview { background: #f8f9fa; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }

/* Cursos grid */
.courses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; margin-top: 1rem; }
.course-card { background: #f8f9fa; border-radius: 16px; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; border: 2px solid #edf2f7; }
.course-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.5rem; }
.course-card-header h3 { margin: 0 0 0.3rem 0; font-size: 1.1rem; color: var(--primary-color); }
.course-info { font-size: 0.9rem; color: #636e72; font-weight: 600; }

.assign-row { display: flex; gap: 0.5rem; align-items: center; }
.select-sm { flex: 1; padding: 0.6rem 0.75rem; border: 2px solid #dfe6e9; border-radius: 10px; font-size: 0.9rem; font-family: 'Nunito', sans-serif; }
.btn-assign { background: var(--primary-color); color: white; border: none; padding: 0.6rem 1rem; border-radius: 10px; font-size: 0.85rem; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background 0.2s; }
.btn-assign:hover { background: #4a4ee0; }
.btn-assign:disabled { opacity: 0.5; cursor: not-allowed; }
.current-teacher { color: #636e72; font-size: 0.8rem; margin-top: 0.25rem; }
.warn-text { color: #e17055; font-size: 0.8rem; font-weight: 600; margin-top: 0.25rem; }
.card-msg { font-size: 0.85rem; padding: 0.5rem 0.75rem; margin-top: 0.25rem; }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.45); display: flex; justify-content: center; align-items: center; z-index: 999; backdrop-filter: blur(4px); }
.modal-content { background: white; border-radius: var(--border-radius-lg); padding: 2rem; width: min(95%, 400px); box-shadow: var(--shadow-md); text-align: center; }
.modal-content h3 { margin-bottom: 1rem; }
.modal-content p { color: #636e72; margin-bottom: 1.5rem; line-height: 1.6; }
.modal-btns { display: flex; gap: 1rem; justify-content: center; }
.btn-danger  { background: #d63031; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 999px; font-weight: 700; cursor: pointer; }
.btn-cancel  { background: #f1f2f6; color: var(--text-dark); border: none; padding: 0.75rem 1.5rem; border-radius: 999px; font-weight: 700; cursor: pointer; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }
</style>
