import { reactive } from 'vue'

const modalState = reactive({
  visible: false,
  title: '',
  message: '',
  resolve: null
})

export function useModalState() {
  return modalState
}

export function showConfirm(message, title = 'Confirmar') {
  return new Promise((resolve) => {
    modalState.title = title
    modalState.message = message
    modalState.visible = true
    modalState.resolve = (val) => {
      modalState.visible = false
      modalState.title = ''
      modalState.message = ''
      const r = modalState.resolve
      modalState.resolve = null
      resolve(val)
    }
  })
}

export function confirmResolve(value) {
  if (modalState.resolve) modalState.resolve(value)
}
