<template>
  <div v-if="state.visible" class="confirm-overlay">
    <div class="confirm-box">
      <h3>{{ state.title }}</h3>
      <p>{{ state.message }}</p>
      <div class="actions">
        <button class="btn-outline" @click="cancel">Cancelar</button>
        <button class="btn-primary" @click="ok">Confirmar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useModalState, confirmResolve } from '../composables/useModal'
const state = useModalState()
const ok = () => confirmResolve(true)
const cancel = () => confirmResolve(false)
</script>

<style scoped>
.confirm-overlay {
  position: fixed; inset: 0; display:flex;align-items:center;justify-content:center;z-index:2100;
  background: rgba(0,0,0,0.45);
}
.confirm-box { background: white; padding: 1.6rem; border-radius: 12px; width: min(92%,420px); box-shadow: var(--shadow-md); text-align:center }
.confirm-box h3 { margin:0 0 .5rem }
.confirm-box p { color: #555; margin-bottom: 1rem }
.actions { display:flex; gap:1rem; justify-content:center }
.btn-primary { background: var(--primary-color); color:white; padding: .6rem 1rem; border-radius:10px }
.btn-outline { background: transparent; border:2px solid #ddd; padding:.6rem 1rem; border-radius:10px }
</style>
