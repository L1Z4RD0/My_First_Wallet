<template>
  <div class="quiz-game">
    <div v-if="gameState === 'start'" class="screen start-screen">
      <div class="icon">📝</div>
      <h2>Quiz Educativo</h2>
      <p>Demuestra cuánto sabes sobre finanzas y gana monedas.</p>
      <div class="rules">
        <ul>
          <li>3 preguntas por partida</li>
          <li>✅ Correcta: +3 monedas</li>
          <li>❌ Incorrecta: -3 monedas</li>
          <li>🌟 Bonus: +5 monedas si aciertas todas</li>
        </ul>
      </div>
      
      <div v-if="alreadyPlayed" class="limit-msg">
        ⚠️ Ya jugaste hoy, vuelve mañana.
      </div>
      <button v-else class="btn-play" @click="startGame">Jugar Quiz</button>
    </div>

    <div v-else-if="gameState === 'playing'" class="screen playing-screen">
      <div class="progress-bar">
        <div class="fill" :style="{ width: ((currentQuestionIndex + 1) / 3) * 100 + '%' }"></div>
      </div>
      
      <div class="question-container" :key="currentQuestion.id">
        <span class="question-count">Pregunta {{ currentQuestionIndex + 1 }} de 3</span>
        <h3>{{ currentQuestion.pregunta }}</h3>
        
        <div class="options-grid">
          <button 
            v-for="(option, index) in currentQuestion.opciones" 
            :key="index"
            class="option-btn"
            :class="{ 
              correct: showFeedback && index === currentQuestion.correcta,
              wrong: showFeedback && selectedOption === index && index !== currentQuestion.correcta,
              disabled: showFeedback
            }"
            @click="handleAnswer(index)"
            :disabled="showFeedback"
          >
            {{ option }}
          </button>
        </div>

        <div v-if="showFeedback" class="feedback-msg" :class="isCorrect ? 'msg-correct' : 'msg-wrong'">
          {{ isCorrect ? '¡Correcto! ✨' : 'Incorrecto 😢' }}
          <span v-if="!isCorrect">La respuesta era: {{ currentQuestion.opciones[currentQuestion.correcta] }}</span>
        </div>
      </div>
    </div>

    <div v-else-if="gameState === 'results'" class="screen results-screen">
      <h2>¡Fin del Quiz!</h2>
      <div class="stats-grid">
        <div class="stat">
          <span class="label">Correctas</span>
          <span class="val">{{ score.correct }}</span>
        </div>
        <div class="stat">
          <span class="label">Incorrectas</span>
          <span class="val">{{ score.wrong }}</span>
        </div>
      </div>

      <div class="reward-box">
        <h3>Resultado de Monedas</h3>
        <div class="coins-list">
          <p>Aciertos: +{{ score.correct * 3 }}</p>
          <p v-if="score.wrong > 0">Errores: -{{ score.wrong * 3 }}</p>
          <p v-if="score.correct === 3" class="bonus">🌟 Bonus Perfecto: +5</p>
          <hr />
          <p class="total-reward" :class="{ negative: totalCoins < 0 }">
            Total: {{ totalCoins > 0 ? '+' : '' }}{{ totalCoins }} 💰
          </p>
        </div>
      </div>

      <button class="btn-finish" @click="$emit('game-completed', { recompensa: totalCoins, title: 'Quiz Completado', msg: 'Has terminado el quiz educativo.' })">
        Volver
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePlayerStore } from '../../store/player'

const playerStore = usePlayerStore()
const emit = defineEmits(['game-completed'])

const gameState = ref('start')
const currentQuestionIndex = ref(0)
const selectedOption = ref(null)
const showFeedback = ref(false)
const isCorrect = ref(false)
const sessionQuestions = ref([])
const score = ref({ correct: 0, wrong: 0 })

const alreadyPlayed = computed(() => {
  return playerStore.juegosJugadosHoy.quiz >= 1
})

const totalCoins = computed(() => {
  let total = (score.value.correct * 3) - (score.value.wrong * 3)
  if (score.value.correct === 3) total += 5
  return total
})

const currentQuestion = computed(() => {
  return sessionQuestions.value[currentQuestionIndex.value]
})

const preguntas = [
  { id: 1, pregunta: "¿Qué significa ahorrar?", opciones: ["Gastar todo", "Guardar dinero para el futuro", "Pedir prestado"], correcta: 1 },
  { id: 2, pregunta: "¿Qué es un gasto?", opciones: ["Dinero que recibes", "Dinero que usas para comprar algo", "Dinero guardado"], correcta: 1 },
  { id: 3, pregunta: "¿Qué es un ingreso?", opciones: ["Dinero que ganas", "Dinero que pierdes", "Dinero que gastas"], correcta: 0 },
  { id: 4, pregunta: "¿Qué es mejor hacer con el dinero?", opciones: ["Gastarlo todo", "Ahorrar una parte", "Perderlo"], correcta: 1 },
  { id: 5, pregunta: "¿Qué es un presupuesto?", opciones: ["Un plan para gastar dinero", "Un juego", "Un banco"], correcta: 0 },
  { id: 6, pregunta: "¿Qué pasa si gastas más de lo que tienes?", opciones: ["Ahorras", "Tienes deuda", "Ganas dinero"], correcta: 1 },
  { id: 7, pregunta: "¿Para qué sirve ahorrar?", opciones: ["Para el futuro", "Para gastar más", "Para perder dinero"], correcta: 0 },
  { id: 8, pregunta: "¿Qué es una deuda?", opciones: ["Dinero que debes", "Dinero que ganas", "Dinero guardado"], correcta: 0 },
  { id: 9, pregunta: "¿Qué es un banco?", opciones: ["Un lugar para guardar dinero", "Una tienda", "Un juego"], correcta: 0 },
  { id: 10, pregunta: "¿Qué es invertir?", opciones: ["Gastar dinero", "Usar dinero para generar más dinero", "Perder dinero"], correcta: 1 },
  { id: 11, pregunta: "¿Qué debes hacer antes de comprar algo?", opciones: ["Pensar si lo necesitas", "Comprarlo rápido", "Pedir dinero"], correcta: 0 },
  { id: 12, pregunta: "¿Qué es un ahorro?", opciones: ["Dinero guardado", "Dinero gastado", "Dinero perdido"], correcta: 0 },
  { id: 13, pregunta: "¿Qué pasa si ahorras constantemente?", opciones: ["Tienes más dinero", "Pierdes dinero", "Nada cambia"], correcta: 0 },
  { id: 14, pregunta: "¿Qué es un objetivo financiero?", opciones: ["Una meta de dinero", "Un juego", "Un gasto"], correcta: 0 },
  { id: 15, pregunta: "¿Qué es gastar inteligentemente?", opciones: ["Comprar todo", "Elegir bien en qué gastar", "No pensar"], correcta: 1 },
  { id: 16, pregunta: "¿Qué es necesario para ahorrar?", opciones: ["Controlar gastos", "Gastar más", "Perder dinero"], correcta: 0 },
  { id: 17, pregunta: "¿Qué pasa si no controlas tus gastos?", opciones: ["Ahorras más", "Te quedas sin dinero", "Ganas dinero"], correcta: 1 },
  { id: 18, pregunta: "¿Qué es un gasto innecesario?", opciones: ["Algo que no necesitas", "Comida básica", "Ahorro"], correcta: 0 },
  { id: 19, pregunta: "¿Qué es planificar?", opciones: ["Pensar antes de actuar", "Gastar sin pensar", "No hacer nada"], correcta: 0 },
  { id: 20, pregunta: "¿Qué es administrar dinero?", opciones: ["Organizar ingresos y gastos", "Perder dinero", "Gastar todo"], correcta: 0 }
]

const startGame = () => {
  if (alreadyPlayed.value) return
  
  // Select 3 random unique questions
  const shuffled = [...preguntas].sort(() => 0.5 - Math.random())
  sessionQuestions.value = shuffled.slice(0, 3)
  
  playerStore.juegosJugadosHoy.quiz = 1
  playerStore.save()
  
  gameState.ref = 'playing'
  gameState.value = 'playing'
}

const handleAnswer = (index) => {
  selectedOption.value = index
  showFeedback.value = true
  isCorrect.value = index === currentQuestion.value.correcta
  
  if (isCorrect.value) {
    score.value.correct++
  } else {
    score.value.wrong++
  }
  
  setTimeout(() => {
    if (currentQuestionIndex.value < 2) {
      currentQuestionIndex.value++
      selectedOption.value = null
      showFeedback.value = false
    } else {
      gameState.value = 'results'
      // Apply money changes to player store
      playerStore.ganarDinero(totalCoins.value)
    }
  }, 2000)
}
</script>

<style scoped>
.quiz-game {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}

.screen {
  animation: fadeIn 0.4s ease-out;
}

.icon { font-size: 4rem; margin-bottom: 1rem; }

.rules {
  background: #f8fafc;
  padding: 1.5rem;
  border-radius: 16px;
  margin: 2rem 0;
  text-align: left;
}

.rules ul { margin: 0.5rem 0 0 1.5rem; }

.limit-msg {
  color: #e74c3c;
  font-weight: bold;
  background: #fdf2f2;
  padding: 1rem;
  border-radius: 12px;
}

.btn-play, .btn-finish {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 1rem 3rem;
  border-radius: 50px;
  font-weight: 800;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-play:hover { transform: scale(1.05); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }

/* Playing Screen */
.progress-bar {
  background: #edf2f7;
  height: 10px;
  border-radius: 5px;
  margin-bottom: 2rem;
  overflow: hidden;
}

.progress-bar .fill {
  background: var(--accent-color);
  height: 100%;
  transition: width 0.3s ease;
}

.question-container {
  background: white;
  padding: 2rem;
  border-radius: 24px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
}

.question-count {
  color: #94a3b8;
  font-weight: 700;
  font-size: 0.9rem;
  text-transform: uppercase;
}

h3 { font-size: 1.5rem; margin: 1.5rem 0; }

.options-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.option-btn {
  padding: 1.2rem;
  border: 2px solid #edf2f7;
  background: white;
  border-radius: 16px;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.option-btn:hover:not(.disabled) {
  border-color: var(--primary-color);
  background: #f8fafc;
}

.option-btn.correct { background: #d1fae5; border-color: #10b981; color: #065f46; }
.option-btn.wrong { background: #fee2e2; border-color: #ef4444; color: #991b1b; }

.feedback-msg {
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 12px;
  font-weight: 800;
  display: flex;
  flex-direction: column;
}

.msg-correct { color: #10b981; }
.msg-wrong { color: #ef4444; }

/* Results Screen */
.stats-grid {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin: 2rem 0;
}

.stat {
  display: flex;
  flex-direction: column;
  background: white;
  padding: 1.5rem;
  border-radius: 20px;
  width: 120px;
  box-shadow: var(--shadow-sm);
}

.stat .label { font-size: 0.8rem; color: #64748b; font-weight: 700; }
.stat .val { font-size: 2rem; font-weight: 800; color: var(--primary-color); }

.reward-box {
  background: white;
  padding: 2rem;
  border-radius: 24px;
  box-shadow: var(--shadow-md);
  margin-bottom: 2rem;
}

.coins-list { text-align: left; max-width: 200px; margin: 1.5rem auto 0; }
.coins-list p { font-weight: 700; display: flex; justify-content: space-between; }
.total-reward { font-size: 1.5rem; color: #10b981; margin-top: 1rem; }
.total-reward.negative { color: #ef4444; }
.bonus { color: var(--accent-color); font-weight: 900; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
