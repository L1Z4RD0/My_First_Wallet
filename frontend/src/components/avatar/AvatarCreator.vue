<template>
  <div class="avatar-creator">
    <div class="preview-panel">
      <AvatarPreview :config="store.avatarConfig" />
      <div class="user-info">
        <label>Nombre de Usuario</label>
        <input 
          type="text" 
          v-model="username" 
          placeholder="Escribe tu nombre..."
          class="name-input"
        />
        <p class="user-id">ID: {{ store.userId }}</p>
      </div>
    </div>

    <div class="controls-panel">
      <h3>Personalización</h3>
      
      <div class="control-group">
        <label>Estilo de Cabello</label>
        <div class="option-buttons">
          <button 
            v-for="style in hairStyles" 
            :key="style.id"
            :class="{ active: store.avatarConfig.hairStyle === style.id }"
            @click="store.updateConfig('hairStyle', style.id)"
          >
            {{ style.name }}
          </button>
        </div>
      </div>

      <div class="control-group">
        <label>Color de Cabello</label>
        <div class="color-grid">
          <button 
            v-for="color in hairColors" 
            :key="color"
            :style="{ backgroundColor: color }"
            :class="{ active: store.avatarConfig.hairColor === color }"
            @click="store.updateConfig('hairColor', color)"
            class="color-btn"
          ></button>
        </div>
      </div>

      <div class="control-group">
        <label>Tono de Piel</label>
        <div class="color-grid">
          <button 
            v-for="color in skinColors" 
            :key="color"
            :style="{ backgroundColor: color }"
            :class="{ active: store.avatarConfig.skinColor === color }"
            @click="store.updateConfig('skinColor', color)"
            class="color-btn"
          ></button>
        </div>
      </div>

      <div class="control-group">
        <label>Camiseta</label>
        <input 
          type="color" 
          :value="store.avatarConfig.shirtColor" 
          @input="e => store.updateConfig('shirtColor', e.target.value)"
        />
      </div>

      <div class="control-group">
        <label>Pantalón</label>
        <input 
          type="color" 
          :value="store.avatarConfig.pantsColor" 
          @input="e => store.updateConfig('pantsColor', e.target.value)"
        />
      </div>

      <div class="control-group">
        <label>Zapatillas</label>
        <input 
          type="color" 
          :value="store.avatarConfig.shoesColor" 
          @input="e => store.updateConfig('shoesColor', e.target.value)"
        />
      </div>

      <div class="control-group">
        <label>Accesorios</label>
        <div class="option-buttons">
          <button 
            v-for="acc in accessories" 
            :key="acc.id"
            :class="{ active: store.avatarConfig.accessory === acc.id }"
            @click="store.updateConfig('accessory', acc.id)"
          >
            {{ acc.name }}
          </button>
        </div>
      </div>

      <button class="save-btn" @click="handleSave">
        Guardar Perfil ✅
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useAvatarStore } from '../../store/avatar'
import AvatarPreview from './AvatarPreview.vue'

const store = useAvatarStore()
const username = ref(store.username)

const hairStyles = [
  { id: 'classic', name: 'Clásico' },
  { id: 'spiky', name: 'Pinchos' },
  { id: 'bob', name: 'Bob' },
  { id: 'punk', name: 'Punk' }
]

const hairColors = ['#4B2C20', '#2d3436', '#d63031', '#f1c40f', '#ecf0f1']
const skinColors = ['#FFDBAC', '#F1C27D', '#E0AC69', '#8D5524', '#C68642']
const accessories = [
  { id: 'none', name: 'Ninguno' },
  { id: 'glasses', name: 'Lentes' },
  { id: 'cap', name: 'Gorra' }
]

watch(username, (newVal) => {
  store.updateUsername(newVal)
})

const handleSave = () => {
  store.saveProfile()
  alert('¡Perfil guardado correctamente!')
}
</script>

<style scoped>
.avatar-creator {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 3rem;
  padding: 1rem;
  max-width: 1000px;
  margin: 0 auto;
}

.preview-panel {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  position: sticky;
  top: 2rem;
}

.user-info {
  background: white;
  padding: 2rem;
  border-radius: 24px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.05);
  border: 1px solid #f0f0f0;
}

.user-info label {
  display: block;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: var(--primary-color);
}

.name-input {
  width: 100%;
  padding: 0.8rem;
  border: 2px solid #eee;
  border-radius: 10px;
  font-size: 1.1rem;
  font-family: inherit;
}

.user-id {
  font-size: 0.8rem;
  color: #999;
  margin-top: 0.5rem;
}

.controls-panel {
  background: white;
  padding: 2rem;
  border-radius: 20px;
  box-shadow: var(--shadow-md);
  max-height: 70vh;
  overflow-y: auto;
}

.control-group {
  margin-bottom: 1.5rem;
}

.control-group label {
  display: block;
  font-weight: 800;
  margin-bottom: 0.8rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  color: #666;
}

.option-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.option-buttons button {
  padding: 0.5rem 1rem;
  border: 2px solid #eee;
  border-radius: 20px;
  background: white;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.option-buttons button.active {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: white;
}

.color-grid {
  display: flex;
  gap: 0.5rem;
}

.color-btn {
  width: 35px;
  height: 35px;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 0 5px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.2s;
}

.color-btn.active {
  transform: scale(1.2);
  border-color: var(--primary-color);
}

.save-btn {
  width: 100%;
  padding: 1rem;
  background: var(--accent-color);
  color: var(--text-dark);
  border: none;
  border-radius: 12px;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  margin-top: 1rem;
  transition: var(--transition);
}

.save-btn:hover {
  transform: translateY(-3px);
  filter: brightness(1.1);
}

@media (max-width: 768px) {
  .avatar-creator {
    grid-template-columns: 1fr;
  }
}
</style>
