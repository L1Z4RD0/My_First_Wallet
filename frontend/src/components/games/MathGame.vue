<template>
  <div class="math-game">
    <div class="game-header">
      <h2>🧮 Aventura Matemática</h2>
      <p>Resuelve la operación para ganar monedas</p>
    </div>

    <div v-if="!isWon" class="game-content">
      <div class="equation">
        <span>{{ num1 }}</span>
        <span class="operator">+</span>
        <span>{{ num2 }}</span>
        <span>=</span>
        <span>?</span>
      </div>

      <div class="options">
        <button 
          v-for="option in options" 
          :key="option"
          class="option-btn"
          @click="checkAnswer(option)"
          :class="{ 'wrong-shake': wrongAnswer === option }"
        >
          {{ option }}
        </button>
      </div>
    </div>
    
    <div v-else class="victory-screen">
      <div class="stars">🌟🌟🌟</div>
      <h3>¡Respuesta Correcta!</h3>
      <p>{{ num1 }} + {{ num2 }} = {{ num1 + num2 }}</p>
      <button class="btn-primary" @click="$emit('game-completed')">
        Reclamar Recompensa
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const num1 = ref(0)
const num2 = ref(0)
const options = ref([])
const isWon = ref(false)
const wrongAnswer = ref(null)

const generateGame = () => {
  num1.value = Math.floor(Math.random() * 10) + 1
  num2.value = Math.floor(Math.random() * 10) + 1
  
  const correctAnswer = num1.value + num2.value
  let newOptions = [correctAnswer]
  
  while(newOptions.length < 3) {
    let wrong = correctAnswer + Math.floor(Math.random() * 10) - 5
    if(wrong !== correctAnswer && wrong > 0 && !newOptions.includes(wrong)) {
      newOptions.push(wrong)
    }
  }
  
  // Shuffle array
  options.value = newOptions.sort(() => Math.random() - 0.5)
}

// Inicializar juego inmediatamente
generateGame()

const checkAnswer = (answer) => {
  if (answer === num1.value + num2.value) {
    isWon.value = true
  } else {
    wrongAnswer.value = answer
    setTimeout(() => {
      wrongAnswer.value = null
    }, 500)
  }
}

defineEmits(['game-completed'])
</script>

<style scoped>
.math-game {
  text-align: center;
  padding: 2rem;
}

.game-header h2 {
  color: var(--primary-color);
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.game-header p {
  color: #636e72;
  font-size: 1.2rem;
  margin-bottom: 3rem;
}

.equation {
  font-size: 4rem;
  font-family: 'Fredoka', sans-serif;
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 4rem;
  color: var(--text-dark);
}

.operator {
  color: var(--primary-color);
}

.options {
  display: flex;
  justify-content: center;
  gap: 2rem;
}

.option-btn {
  background: var(--card-bg);
  border: 4px solid var(--secondary-color);
  color: var(--text-dark);
  font-family: 'Fredoka', sans-serif;
  font-size: 2.5rem;
  width: 100px;
  height: 100px;
  border-radius: 20px;
  cursor: pointer;
  box-shadow: 0 8px 0 var(--secondary-color);
  transition: all 0.1s;
}

.option-btn:active {
  transform: translateY(8px);
  box-shadow: 0 0 0 var(--secondary-color);
}

.victory-screen {
  animation: popIn 0.5s;
}

.stars {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.victory-screen h3 {
  font-size: 2.5rem;
  color: #2ed573;
  margin-bottom: 1rem;
}

.victory-screen p {
  font-size: 1.5rem;
  margin-bottom: 2rem;
}

.wrong-shake {
  animation: shake 0.5s;
  border-color: #ff4757;
  box-shadow: 0 8px 0 #ff4757;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}
</style>
