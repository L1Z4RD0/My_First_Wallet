<template>
  <div class="game-card" @click="$emit('play', game)">
    <div class="game-image" :style="{ backgroundColor: game.bgColor }">
      <span class="game-icon">{{ game.icon }}</span>
      <div class="level-badge">Nivel {{ game.level }}</div>
    </div>
    
    <div class="game-info">
      <h3>{{ game.title }}</h3>
      <p>{{ game.description }}</p>
      
      <button class="btn-primary play-btn">¡Jugar Ahora!</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  game: {
    type: Object,
    required: true
  }
})

defineEmits(['play'])
</script>

<style scoped>
.game-card {
  background: var(--card-bg);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  flex-direction: column;
}

.game-card:hover {
  transform: translateY(-10px);
  box-shadow: var(--shadow-hover);
}

.game-image {
  height: 180px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.game-icon {
  font-size: 5rem;
  transition: var(--transition);
}

.game-card:hover .game-icon {
  transform: scale(1.1) rotate(5deg);
}

.level-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: white;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  font-family: 'Fredoka', sans-serif;
  font-weight: 700;
  color: var(--text-dark);
  box-shadow: var(--shadow-sm);
}

.game-info {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.game-info h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.game-info p {
  color: #636e72;
  margin-bottom: 1.5rem;
  flex: 1;
}

.play-btn {
  width: 100%;
}
</style>
