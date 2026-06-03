import { defineStore } from 'pinia'
import { usePlayerStore } from './player'

function storageKey(userId) {
  return userId ? `user_profile_${userId}` : 'user_profile'
}

function getSessionUserId() {
  try {
    const session = JSON.parse(localStorage.getItem('auth_session') || '{}')
    return session?.user?.id ?? null
  } catch { return null }
}

export const useAvatarStore = defineStore('avatar', {
  state: () => ({
    userId: '',
    username: '',
    avatarConfig: {
      skinColor: '#FFDBAC',
      hairStyle: 'classic',
      hairColor: '#4B2C20',
      shirtColor: '#3498db',
      pantsColor: '#2c3e50',
      shoesColor: '#333333',
      accessory: 'none',
      specialEffect: 'none'
    },
    inventory: []
  }),

  actions: {
    init() {
      const userId = getSessionUserId()
      const key = storageKey(userId)
      const saved = localStorage.getItem(key)
      if (saved) {
        const data = JSON.parse(saved)
        this.userId      = data.userId
        this.username    = data.username || ''
        this.avatarConfig = { ...this.avatarConfig, ...data.avatarConfig }
        this.inventory   = data.inventory || []
      } else {
        this.userId = userId ? `USER-${userId}` : 'USER-' + Math.random().toString(36).substr(2, 9).toUpperCase()
        this.saveProfile()
      }
    },

    saveProfile() {
      const userId = getSessionUserId()
      localStorage.setItem(storageKey(userId), JSON.stringify({
        userId: this.userId,
        username: this.username,
        avatarConfig: this.avatarConfig,
        inventory: this.inventory
      }))
    },

    updateUsername(newName) {
      this.username = newName
      this.saveProfile()
    },

    updateConfig(key, value) {
      if (key === 'skin') {
        this.avatarConfig = { ...this.avatarConfig, ...value }
      } else if (Object.prototype.hasOwnProperty.call(this.avatarConfig, key)) {
        this.avatarConfig[key] = value
      }
      this.saveProfile()
    },

    buyItem(item) {
      const playerStore = usePlayerStore()
      if (playerStore.gastarDinero(item.price)) {
        this.inventory.push({ id: item.id, name: item.name, type: item.type, value: item.value, icon: item.icon })
        this.saveProfile()
        return { success: true }
      }
      return { success: false, msg: 'No tienes suficiente dinero 💰' }
    },

    isItemOwned(itemId) {
      return this.inventory.some(i => i.id === itemId)
    }
  }
})
