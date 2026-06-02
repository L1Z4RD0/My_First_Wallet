import { reactive } from 'vue'

export const notifications = reactive([])

export function showNotification(type, message, timeout = 3500) {
  const id = Date.now() + Math.random()
  notifications.push({ id, type, message })
  if (timeout > 0) {
    setTimeout(() => removeNotification(id), timeout)
  }
}

export function removeNotification(id) {
  const idx = notifications.findIndex(n => n.id === id)
  if (idx !== -1) notifications.splice(idx, 1)
}
