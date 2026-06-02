<template>
  <div class="notifications-root">
    <transition-group name="notif" tag="div">
      <div v-for="n in notifications" :key="n.id" :class="['notif', n.type]">
        <div class="msg">{{ n.message }}</div>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { notifications } from '../composables/useNotification'
// expose to template
const $notifications = notifications
defineExpose({ notifications: $notifications })
</script>

<style scoped>
.notifications-root {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.notif {
  min-width: 220px;
  max-width: 360px;
  padding: 12px 16px;
  border-radius: 12px;
  color: white;
  box-shadow: 0 8px 20px rgba(0,0,0,0.12);
  font-weight: 700;
}
.notif.success { background: linear-gradient(135deg,#2ecc71,#27ae60); }
.notif.error { background: linear-gradient(135deg,#e74c3c,#c0392b); }
.notif.info { background: linear-gradient(135deg,#0984e3,#74b9ff); }
.notif.warning { background: linear-gradient(135deg,#f39c12,#e67e22); }
.notif .msg { font-size: 0.95rem; }

.notif-enter-active, .notif-leave-active { transition: all 240ms ease; }
.notif-enter-from { transform: translateY(-8px); opacity: 0; }
.notif-leave-to { transform: translateY(-8px); opacity: 0; }
</style>
