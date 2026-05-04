import { defineStore } from 'pinia'
import { usePlayerStore } from './player'

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
    inventory: [] // Items currently equipped or available to equip
  }),

  actions: {
    init() {
      const saved = localStorage.getItem('user_profile')
      if (saved) {
        const data = JSON.parse(saved)
        this.userId = data.userId
        this.username = data.username || ''
        this.avatarConfig = { ...this.avatarConfig, ...data.avatarConfig }
        this.inventory = data.inventory || []
      } else {
        this.userId = 'USER-' + Math.random().toString(36).substr(2, 9).toUpperCase()
        this.saveProfile()
      }
    },

    saveProfile() {
      localStorage.setItem('user_profile', JSON.stringify({
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
        // Special logic for full skins
        this.avatarConfig = { ...this.avatarConfig, ...value }
      } else if (this.avatarConfig.hasOwnProperty(key)) {
        this.avatarConfig[key] = value
      }
      this.saveProfile()
    },

    buyItem(item) {
      const playerStore = usePlayerStore()
      if (playerStore.gastarDinero(item.price)) {
        this.inventory.push({
          id: item.id,
          name: item.name,
          type: item.type,
          value: item.value, // Color or style string
          icon: item.icon
        })
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
