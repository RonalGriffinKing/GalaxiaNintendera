import { ref } from 'vue'

// UI-only mutex: the caller retains the operation, permissions and error policy.
export function usePendingAction() {
  const pending = ref(false)
  async function run(action) {
    if (pending.value) return
    pending.value = true
    try { return await action() } finally { pending.value = false }
  }
  return { pending, run }
}
