<template>
  <div class="fauna-game">
    <div class="game-header">
      <h2>🦊 Fauna Chilena</h2>
      <p>Adivina el animal de la descripción</p>
    </div>

    <div v-if="!isWon && currentAnimal" class="game-content">
      <div class="animal-card">
        <div class="emoji-hint">{{ currentAnimal.emoji }}</div>
        <p class="description">"{{ currentAnimal.description }}"</p>
      </div>

      <div class="options">
        <button 
          v-for="option in options" 
          :key="option"
          class="btn-secondary option-btn"
          @click="checkAnswer(option)"
          :class="{ 'wrong-shake': wrongAnswer === option }"
        >
          {{ option }}
        </button>
      </div>
    </div>
    
    <div v-else class="victory-screen">
      <div class="animal-reveal">{{ currentAnimal.emoji }}</div>
      <h3>¡Correcto! Es el {{ currentAnimal.name }}</h3>
      <p>Has aprendido algo nuevo sobre nuestra fauna.</p>
      <button class="btn-primary" @click="$emit('game-completed')">
        Reclamar Recompensa
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const animals = [
  { name: 'Pudú', emoji: '🦌', description: 'Soy el ciervo más pequeño del mundo y vivo en los bosques del sur.' },
  { name: 'Cóndor', emoji: '🦅', description: 'Vuelo muy alto en la Cordillera de los Andes y soy parte del escudo nacional.' },
  { name: 'Huemul', emoji: '🦌', description: 'Soy un ciervo endémico de la Patagonia y acompaño al cóndor en el escudo.' },
  { name: 'Zorro Culpeo', emoji: '🦊', description: 'Soy un zorro de tamaño mediano y me puedes encontrar desde el norte hasta Tierra del Fuego.' },
  { name: 'Puma', emoji: '🐆', description: 'Soy el felino más grande de Chile y un excelente cazador en la montaña.' },
  { name: 'Monito del Monte', emoji: '🐒', description: 'Soy un pequeño marsupial que vive en los árboles de los bosques templados del sur.' },
  { name: 'Ranita de Darwin', emoji: '🐸', description: 'Soy una pequeña rana muy especial; los papás incuban a sus crías en su boca.' },
  { name: 'Guanaco', emoji: '🦙', description: 'Soy pariente de las llamas y las alpacas, y vivo libremente en el norte y la Patagonia.' }
]

const currentAnimal = ref(null)
const options = ref([])
const isWon = ref(false)
const wrongAnswer = ref(null)

const generateGame = () => {
  const randomIndex = Math.floor(Math.random() * animals.length)
  currentAnimal.value = animals[randomIndex]
  
  let newOptions = [currentAnimal.value.name]
  
  while(newOptions.length < 3) {
    let wrongAnimal = animals[Math.floor(Math.random() * animals.length)].name
    if(!newOptions.includes(wrongAnimal)) {
      newOptions.push(wrongAnimal)
    }
  }
  
  // Shuffle array
  options.value = newOptions.sort(() => Math.random() - 0.5)
}

// Inicializar el juego inmediatamente
generateGame()

const checkAnswer = (answer) => {
  if (answer === currentAnimal.value.name) {
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
.fauna-game {
  text-align: center;
  padding: 2rem;
}

.game-header h2 {
  color: var(--secondary-color);
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.game-header p {
  color: #636e72;
  font-size: 1.2rem;
  margin-bottom: 3rem;
}

.animal-card {
  background: #f1f2f6;
  border-radius: var(--border-radius-lg);
  padding: 3rem 2rem;
  margin: 0 auto 3rem auto;
  max-width: 500px;
  box-shadow: inset 0 0 20px rgba(0,0,0,0.05);
}

.emoji-hint {
  font-size: 6rem;
  margin-bottom: 1rem;
}

.description {
  font-size: 1.3rem;
  font-family: 'Fredoka', sans-serif;
  color: var(--text-dark);
  line-height: 1.5;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 400px;
  margin: 0 auto;
}

.option-btn {
  padding: 1.2rem;
  font-size: 1.3rem;
  border-radius: 12px;
}

.victory-screen {
  animation: popIn 0.5s;
}

.animal-reveal {
  font-size: 8rem;
  margin-bottom: 1rem;
  animation: bounce 2s infinite;
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
  background: #ff4757 !important;
  box-shadow: 0 4px 15px rgba(255, 71, 87, 0.4) !important;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}
</style>
