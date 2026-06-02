<template>
  <div class="shop-view">
    <div class="shop-header">
      <h2>Tienda de Estilo 🛍️</h2>
      <p>Personaliza tu outfit con los mejores artículos</p>
    </div>

    <div class="shop-container">
      <div class="category-tabs">
        <button 
          v-for="cat in categories" 
          :key="cat.id"
          :class="{ active: activeCategory === cat.id }"
          @click="activeCategory = cat.id"
        >
          {{ cat.name }}
        </button>
      </div>

      <div class="items-grid">
        <div 
          v-for="item in filteredItems" 
          :key="item.id" 
          class="shop-item"
          :class="{ owned: store.isItemOwned(item.id) }"
        >
          <div class="item-icon">{{ item.icon }}</div>
          <div class="item-info">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-price" v-if="!store.isItemOwned(item.id)">💰 {{ item.price }}</span>
            <span class="owned-badge" v-else>Comprado ✅</span>
          </div>
          <button 
            v-if="!store.isItemOwned(item.id)"
            class="buy-btn"
            @click="handleBuy(item)"
          >
            Comprar
          </button>
          <button v-else class="owned-btn" disabled>En Inventario</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAvatarStore } from '../../store/avatar'
import { showNotification } from '../../composables/useNotification'

const store = useAvatarStore()
const activeCategory = ref('clothing')

const categories = [
  { id: 'clothing', name: 'Ropa' },
  { id: 'shoes', name: 'Calzado' },
  { id: 'accessory', name: 'Accesorios' },
  { id: 'epic', name: 'Skins Épicas ✨' }
]

const items = [
  // EPIC SKINS
  { 
    id: 's_cyber', 
    name: 'Neon Hacker', 
    type: 'skin', 
    value: { 
      shirtColor: '#00f2ff', 
      pantsColor: '#7000ff', 
      shoesColor: '#000000', 
      specialEffect: 'cyberpunk',
      hairColor: '#00f2ff'
    }, 
    icon: '🧪', 
    price: 500, 
    category: 'epic' 
  },
  { 
    id: 's_galaxy', 
    name: 'Astro Viajero', 
    type: 'skin', 
    value: { 
      shirtColor: '#1a1a2e', 
      pantsColor: '#16213e', 
      shoesColor: '#0f3460', 
      specialEffect: 'galaxy',
      hairColor: '#e94560'
    }, 
    icon: '🌌', 
    price: 750, 
    category: 'epic' 
  },
  { 
    id: 's_stealth', 
    name: 'Leyenda Urbana', 
    type: 'skin', 
    value: { 
      shirtColor: '#111111', 
      pantsColor: '#222222', 
      shoesColor: '#000000', 
      specialEffect: 'none',
      hairColor: '#555555'
    }, 
    icon: '🕶️', 
    price: 400, 
    category: 'epic' 
  },

  // Shirts / Poleras
  { id: 's_red', name: 'Polera Roja', type: 'shirtColor', value: '#e74c3c', icon: '👕', price: 30, category: 'clothing' },
  { id: 's_green', name: 'Polera Esmeralda', type: 'shirtColor', value: '#2ecc71', icon: '👕', price: 45, category: 'clothing' },
  { id: 's_black', name: 'Polera Formal Negra', type: 'shirtColor', value: '#2c3e50', icon: '👔', price: 60, category: 'clothing' },
  { id: 's_gold', name: 'Polera de Oro', type: 'shirtColor', value: '#f1c40f', icon: '✨', price: 250, category: 'clothing' },

  // Pants
  { id: 'p_jean', name: 'Jean Clásico', type: 'pantsColor', value: '#3498db', icon: '👖', price: 50, category: 'clothing' },
  { id: 'p_dark', name: 'Pantalón Cargo', type: 'pantsColor', value: '#34495e', icon: '👖', price: 65, category: 'clothing' },
  { id: 'p_white', name: 'Pantalón de Lino', type: 'pantsColor', value: '#ecf0f1', icon: '👖', price: 80, category: 'clothing' },
  { id: 'p_purple', name: 'Pantalón Real', type: 'pantsColor', value: '#9b59b6', icon: '👑', price: 150, category: 'clothing' },
  
  // Shoes / Zapatillas
  { id: 'z_white', name: 'Zapatillas Urbanas', type: 'shoesColor', value: '#ffffff', icon: '👟', price: 40, category: 'shoes' },
  { id: 'z_sport', name: 'Zapatillas Deportivas', type: 'shoesColor', value: '#e67e22', icon: '👟', price: 70, category: 'shoes' },
  { id: 'z_leather', name: 'Zapatos de Cuero', type: 'shoesColor', value: '#4b2c20', icon: '👞', price: 100, category: 'shoes' },
  { id: 'z_neon', name: 'Zapatillas Neón', type: 'shoesColor', value: '#00ff00', icon: '⚡', price: 180, category: 'shoes' },
  
  // Accessories
  { id: 'a_glasses', name: 'Lentes de Sol', type: 'accessory', value: 'glasses', icon: '🕶️', price: 50, category: 'accessory' },
  { id: 'a_cap', name: 'Gorra Deportiva', type: 'accessory', value: 'cap', icon: '🧢', price: 55, category: 'accessory' },
  { id: 'a_none', name: 'Sin Accesorios', type: 'accessory', value: 'none', icon: '❌', price: 0, category: 'accessory' }
]

const filteredItems = computed(() => {
  return items.filter(item => item.category === activeCategory.value)
})

const handleBuy = (item) => {
  if (item.price === 0) {
    // Treat "None" as a free item if not owned
    if (!store.isItemOwned(item.id)) {
      store.buyItem(item)
    }
    return
  }
  
  const result = store.buyItem(item)
  if (!result.success) {
    showNotification('error', result.msg)
  } else {
    showNotification('success', `¡Has comprado ${item.name}! Pruébatelo en tu Perfil.`)
  }
}
</script>

<style scoped>
.shop-view {
  animation: slideUp 0.5s ease-out;
}

.shop-header {
  text-align: center;
  margin-bottom: 2rem;
}

.shop-header h2 {
  font-size: 2.5rem;
  color: var(--primary-color);
  font-family: 'Fredoka', sans-serif;
}

.shop-container {
  background: white;
  padding: 2.5rem;
  border-radius: 32px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.05);
  border: 1px solid #f1f5f9;
}

.category-tabs {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2.5rem;
  justify-content: center;
}

.category-tabs button {
  padding: 1rem 2rem;
  border: 2px solid #f1f5f9;
  background: #f8fafc;
  border-radius: 16px;
  font-weight: 800;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.category-tabs button.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
  transform: translateY(-3px);
  box-shadow: 0 10px 20px rgba(78, 108, 231, 0.2);
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 2rem;
}

.shop-item {
  background: white;
  border: 2px solid #f1f5f9;
  padding: 1.5rem;
  border-radius: 24px;
  text-align: center;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.shop-item:hover {
  border-color: var(--accent-color);
  transform: translateY(-8px);
  box-shadow: 0 15px 30px rgba(0,0,0,0.05);
}

.shop-item.owned {
  background: #f8fafc;
  border-style: dashed;
}

.item-icon {
  font-size: 3.5rem;
  background: #f1f5f9;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  margin: 0 auto;
  transition: transform 0.3s;
}

.shop-item:hover .item-icon {
  transform: rotate(5deg) scale(1.1);
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.item-name {
  font-weight: 800;
  font-size: 1.2rem;
  color: #1e293b;
}

.item-price {
  color: #10b981;
  font-weight: 900;
  font-size: 1.1rem;
}

.owned-badge {
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.buy-btn {
  background: linear-gradient(135deg, var(--primary-color), #6366f1);
  color: white;
  border: none;
  padding: 1rem;
  border-radius: 16px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.buy-btn:hover {
  filter: brightness(1.1);
  box-shadow: 0 8px 15px rgba(99, 102, 241, 0.3);
}

.owned-btn {
  background: #f1f5f9;
  color: #94a3b8;
  border: none;
  padding: 1rem;
  border-radius: 16px;
  font-weight: 800;
  font-size: 1rem;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 640px) {
  .items-grid {
    grid-template-columns: 1fr;
  }
}
</style>
