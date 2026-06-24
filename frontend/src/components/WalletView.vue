<template>
  <div class="wallet-view">
    <div class="summary-cards">
      <div class="balance-card total-patrimony">
        <h2>Patrimonio Total</h2>
        <div class="balance-amount">🪙 {{ playerStore.patrimonioTotal }}</div>
        <p class="subtitle">Todo lo que tienes</p>
      </div>
      <div class="balance-card available">
        <h2>Dinero Disponible</h2>
        <div class="balance-amount">🪙 {{ playerStore.dineroDisponible }}</div>
        <p class="subtitle">Para gastar o invertir</p>
      </div>
      <div class="balance-card saved">
        <h2>Ahorrado (Banco)</h2>
        <div class="balance-amount">🪙 {{ playerStore.dineroAhorrado }}</div>
        <p class="interest-rate">+1% de interés al terminar el día</p>
      </div>
      <div v-if="playerStore.enDeuda" class="balance-card debt">
        <h2>Deuda Activa</h2>
        <div class="balance-amount">−🪙 {{ playerStore.deuda }}</div>
        <p class="penalty">¡Reduce tu energía máxima a 3!</p>
      </div>
    </div>

    <div class="actions-section">
      <div class="action-card bank-action">
        <h3>🏦 Banco Nacional</h3>
        <p>Guarda tu dinero seguro y gana intereses. Máximo interés generado hasta 🪙 200 ahorrados.</p>
        <p v-if="playerStore.enDeuda" class="error-text">No puedes ahorrar mientras tengas deuda.</p>
        
        <div class="input-group">
          <input type="number" v-model.number="bankAmount" min="1" placeholder="Cantidad" />
        </div>
        
        <div class="btn-group">
          <button class="btn-primary" @click="depositar" :disabled="playerStore.enDeuda || bankAmount > playerStore.dineroDisponible || bankAmount <= 0">Depositar</button>
          <button class="btn-outline" @click="retirar" :disabled="bankAmount > playerStore.dineroAhorrado || bankAmount <= 0">Retirar</button>
        </div>
      </div>

      <div v-if="playerStore.enDeuda" class="action-card debt-action">
        <h3>🔴 Pago de Deuda</h3>
        <p>Tienes que pagar tus deudas para recuperar tu energía y poder invertir.</p>
        
        <div class="input-group">
          <input type="number" v-model.number="debtAmount" :max="playerStore.deuda" min="1" placeholder="Cantidad a pagar" />
        </div>
        
        <button class="btn-danger" @click="pagarDeuda" :disabled="debtAmount > playerStore.dineroDisponible || debtAmount <= 0 || debtAmount > playerStore.deuda">Pagar Deuda</button>
      </div>
    </div>

    <div class="history-section" v-if="playerStore.historial.length > 0">
      <h3>📅 Historial de Días</h3>
      <table class="history-table">
        <thead>
          <tr>
            <th>Día</th>
            <th>Patrimonio Final</th>
            <th>Gastos Cobrados</th>
            <th>¿Deuda?</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in [...playerStore.historial].reverse()" :key="h.dia">
            <td>Día {{ h.dia }}</td>
            <td><strong>🪙 {{ h.dineroFinal }}</strong></td>
            <td>−🪙 {{ h.gastos }}</td>
            <td :class="{'text-danger': h.entroEnDeuda, 'text-success': !h.entroEnDeuda}">
              {{ h.entroEnDeuda ? 'Sí' : 'No' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { usePlayerStore } from '../store/player'
import { showNotification } from '../composables/useNotification'

const playerStore = usePlayerStore()

const bankAmount = ref(0)
const debtAmount = ref(0)

const depositar = () => {
  if (playerStore.depositarAhorro(bankAmount.value)) {
    showNotification('success', `Depositaste 🪙 ${bankAmount.value} en el banco.`)
    bankAmount.value = 0
  } else {
    showNotification('error', 'No tienes suficiente dinero o estás en deuda.')
  }
}

const retirar = () => {
  if (playerStore.retirarAhorro(bankAmount.value)) {
    showNotification('success', `Retiraste 🪙 ${bankAmount.value} del banco.`)
    bankAmount.value = 0
  } else {
    showNotification('warning', 'No tienes suficientes ahorros.')
  }
}

const pagarDeuda = () => {
  if (playerStore.pagarDeuda(debtAmount.value)) {
    showNotification('success', `Pagaste 🪙 ${debtAmount.value} de tu deuda.`)
    debtAmount.value = 0
  } else {
    showNotification('error', 'No tienes suficiente dinero para ese pago.')
  }
}
</script>

<style scoped>
.wallet-view {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  animation: fade-in 0.3s ease;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
}

.balance-card {
  padding: 1.5rem;
  border-radius: var(--border-radius-lg);
  text-align: center;
  box-shadow: var(--shadow-sm);
  color: white;
}

.balance-card h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  opacity: 0.9;
}

.balance-amount {
  font-family: 'Fredoka', sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
}

.subtitle, .interest-rate, .penalty {
  font-size: 0.85rem;
  margin-top: 0.5rem;
  font-weight: bold;
}

.total-patrimony { background: linear-gradient(135deg, #6c5ce7, #a29bfe); }
.available { background: linear-gradient(135deg, #00b894, #55efc4); }
.saved { background: linear-gradient(135deg, #0984e3, #74b9ff); }
.debt { background: linear-gradient(135deg, #d63031, #ff7675); }

.actions-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.action-card {
  background: white;
  padding: 2rem;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
}

.action-card h3 {
  color: var(--primary-color);
  margin-bottom: 1rem;
  border-bottom: 2px solid #f1f2f6;
  padding-bottom: 0.5rem;
}

.input-group {
  margin: 1.5rem 0;
}

.input-group input {
  width: 100%;
  padding: 1rem;
  font-size: 1.2rem;
  border: 2px solid #dfe6e9;
  border-radius: 10px;
  font-family: 'Nunito', sans-serif;
  box-sizing: border-box;
}

.btn-group {
  display: flex;
  gap: 1rem;
}

.btn-group button {
  flex: 1;
}

.btn-primary { background: var(--primary-color); color: white; }
.btn-secondary { background: #0984e3; color: white; border: none; padding: 10px 20px; border-radius: 50px; cursor: pointer; font-weight: 600;}
.btn-secondary:disabled { background: #b2bec3; cursor: not-allowed; }
.btn-outline { background: transparent; color: var(--primary-color); border: 2px solid var(--primary-color); padding: 10px 20px; border-radius: 50px; cursor: pointer; font-weight: 600;}
.btn-outline:disabled { color: #b2bec3; border-color: #b2bec3; cursor: not-allowed; }
.btn-danger { background: #d63031; color: white; border: none; padding: 10px 20px; border-radius: 50px; cursor: pointer; font-weight: 600; width: 100%; }
.btn-danger:disabled { background: #ff7675; cursor: not-allowed; }

.error-text {
  color: #d63031;
  font-weight: bold;
}

.history-section {
  background: white;
  padding: 2rem;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.history-table th, .history-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #dfe6e9;
}

.history-table th {
  background: #f8f9fa;
  color: #2d3436;
  font-weight: bold;
}

.text-danger { color: #d63031; font-weight: bold; }
.text-success { color: #00b894; font-weight: bold; }

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
