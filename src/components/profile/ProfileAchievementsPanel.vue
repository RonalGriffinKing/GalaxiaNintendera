<script setup>
const draft = defineModel('draft', {
  type: Object,
  default: () => ({
    label: '',
    description: '',
    type: 'reads',
    target: 10,
    iconUrl: ''
  })
})

defineProps({
  open: {
    type: Boolean,
    default: false
  },
  canManage: {
    type: Boolean,
    default: false
  },
  editorOpen: {
    type: Boolean,
    default: false
  },
  editingId: {
    type: String,
    default: ''
  },
  earnedCount: {
    type: Number,
    default: 0
  },
  totalCount: {
    type: Number,
    default: 0
  },
  typeCounts: {
    type: Array,
    default: () => []
  },
  types: {
    type: Array,
    default: () => []
  },
  roadmap: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'close',
  'start-create',
  'cancel-edit',
  'save',
  'edit',
  'delete'
])
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="open" class="achievement-modal-backdrop" @click.self="emit('close')">
      <section class="achievement-roadmap achievement-modal-card">
        <button class="icon-modal-close" type="button" aria-label="Cerrar logros" @click="emit('close')">
          <i class="fas fa-xmark"></i>
        </button>

        <div class="achievement-roadmap-head">
          <div>
            <span>Progreso del perfil</span>
            <h2>Logros por desbloquear</h2>
          </div>
          <div class="achievement-roadmap-actions">
            <button v-if="canManage" type="button" @click="emit('start-create')">
              <i class="fas fa-plus"></i>
              Agregar logro
            </button>
            <strong>{{ earnedCount }} / {{ totalCount }} logros</strong>
          </div>
        </div>

        <div class="achievement-type-row" aria-label="Categorias de logros">
          <span v-for="type in typeCounts" :key="type.value">
            <i :class="type.icon"></i>
            {{ type.label }}
            <strong>{{ type.count }}</strong>
          </span>
        </div>

        <form v-if="canManage && editorOpen" class="achievement-editor" @submit.prevent="emit('save')">
          <label class="achievement-field-name">
            Nombre
            <input v-model="draft.label" placeholder="Ej: Ganador espacial" />
          </label>
          <label class="achievement-field-type">
            Tipo de logro
            <select v-model="draft.type">
              <option v-for="type in types" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </label>
          <label class="achievement-field-target">
            Objetivo
            <input v-model.number="draft.target" type="number" min="1" />
          </label>
          <label class="achievement-field-description">
            Descripcion
            <input v-model="draft.description" placeholder="Ej: Desbloquear 10 iconos" />
          </label>
          <label class="achievement-field-icon">
            Icono (URL)
            <input v-model="draft.iconUrl" placeholder="https://..." />
          </label>
          <div class="achievement-editor-actions">
            <button type="button" @click="emit('cancel-edit')">Cancelar</button>
            <button type="submit">{{ editingId ? 'Guardar logro' : 'Crear logro' }}</button>
          </div>
        </form>

        <div class="achievement-roadmap-grid">
          <article
            v-for="achievement in roadmap"
            :key="achievement.id"
            class="achievement-roadmap-card"
            :class="{ unlocked: achievement.unlocked, next: achievement.isNext }"
          >
            <span class="achievement-orb">
              <img v-if="achievement.iconUrl" :src="achievement.iconUrl" alt="" />
              <i v-else :class="achievement.unlocked ? 'fas fa-check' : achievement.typeMeta.icon"></i>
            </span>
            <div>
              <em class="achievement-type-chip">{{ achievement.typeMeta.label }}</em>
              <strong>{{ achievement.label }}</strong>
              <p>{{ achievement.description }}</p>
              <div class="achievement-progress">
                <i :style="{ width: achievement.progress + '%' }"></i>
              </div>
              <small>
                {{ achievement.unlocked ? 'Desbloqueado' : `${achievement.currentValue} / ${achievement.target} ${achievement.typeMeta.unit}` }}
              </small>
              <div v-if="canManage" class="achievement-card-actions">
                <button type="button" @click="emit('edit', achievement)">Editar</button>
                <button type="button" @click="emit('delete', achievement)">Eliminar</button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.achievement-roadmap {
  background:
    radial-gradient(circle at 14% 0%, rgba(168, 85, 247, 0.2), transparent 32%),
    radial-gradient(circle at 86% 18%, rgba(236, 72, 153, 0.12), transparent 30%),
    rgba(11, 16, 32, 0.92);
  border: 1px solid rgba(168, 85, 247, 0.24);
  border-radius: 18px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
  display: grid;
  gap: 16px;
  margin: 14px auto 0;
  max-width: 1120px;
  overflow: hidden;
  padding: 18px;
}

.achievement-modal-backdrop {
  align-items: center;
  background: rgba(3, 7, 18, 0.76);
  backdrop-filter: blur(12px);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 18px;
  position: fixed;
  z-index: 2000;
}

.achievement-modal-card {
  align-content: start;
  margin: 0;
  max-height: min(840px, calc(100dvh - 36px));
  overflow-y: auto;
  padding-right: 20px;
  position: relative;
  width: min(1180px, calc(100vw - 28px));
}

.icon-modal-close {
  align-items: center;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  color: #ffffff;
  display: flex;
  height: 40px;
  justify-content: center;
  position: absolute;
  right: 16px;
  top: 16px;
  width: 40px;
  z-index: 3;
}

.achievement-roadmap-head {
  align-items: end;
  display: flex;
  gap: 14px;
  justify-content: space-between;
  padding-right: 46px;
}

.achievement-roadmap-actions {
  align-items: center;
  display: flex;
  gap: 10px;
}

.achievement-roadmap-actions button {
  align-items: center;
  background: linear-gradient(135deg, #9333ea, #ec4899);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-size: 12px;
  font-weight: 950;
  gap: 7px;
  min-height: 38px;
  padding: 0 14px;
  white-space: nowrap;
}

.achievement-roadmap-head span {
  color: #7c3aed;
  display: block;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.achievement-roadmap-head h2,
.achievement-roadmap-card strong {
  color: #ffffff;
}

.achievement-roadmap-head h2 {
  font-size: 22px;
  font-weight: 950;
  margin-top: 3px;
}

.achievement-roadmap-actions > strong {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 950;
  padding: 9px 12px;
  white-space: nowrap;
}

.achievement-type-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.achievement-type-row::-webkit-scrollbar {
  display: none;
}

.achievement-type-row span {
  align-items: center;
  background: rgba(124, 58, 237, 0.13);
  border: 1px solid rgba(168, 85, 247, 0.22);
  border-radius: 999px;
  color: #c4b5fd;
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 950;
  gap: 7px;
  min-height: 34px;
  padding: 0 10px;
}

.achievement-type-row i {
  color: #c084fc;
}

.achievement-type-row strong {
  color: #ffffff;
}

.achievement-editor {
  align-items: end;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(190px, 1.1fr) minmax(170px, 0.9fr) 104px minmax(220px, 1.25fr) minmax(160px, 0.75fr) auto;
  padding: 14px;
}

.achievement-editor label {
  color: #cbd5e1;
  display: grid;
  font-size: 10px;
  font-weight: 950;
  gap: 5px;
  min-width: 0;
  text-transform: uppercase;
}

.achievement-editor input,
.achievement-editor select {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 850;
  min-height: 38px;
  min-width: 0;
  outline: none;
  padding: 0 12px;
  width: 100%;
}

.achievement-editor select option {
  background: #0b1020;
  color: #ffffff;
}

.achievement-field-target input {
  max-width: 100%;
}

.achievement-editor-actions {
  align-items: end;
  display: flex;
  gap: 8px;
  grid-column: auto;
  justify-content: flex-end;
}

.achievement-editor button {
  border-radius: 12px;
  font-size: 11px;
  font-weight: 950;
  min-height: 38px;
  padding: 0 14px;
  white-space: nowrap;
}

.achievement-editor button[type="button"] {
  background: #f1f5f9;
  color: #64748b;
}

.achievement-editor button[type="submit"] {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  color: #ffffff;
}

.achievement-roadmap-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
}

.achievement-roadmap-card {
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  display: grid;
  gap: 12px;
  grid-template-columns: 42px minmax(0, 1fr);
  min-height: 172px;
  padding: 14px;
}

.achievement-roadmap-card.unlocked {
  background:
    radial-gradient(circle at 20% 0%, rgba(250, 204, 21, 0.22), transparent 34%),
    rgba(120, 53, 15, 0.28);
}

.achievement-roadmap-card.next {
  background:
    radial-gradient(circle at 12% 0%, rgba(168, 85, 247, 0.24), transparent 34%),
    rgba(255, 255, 255, 0.07);
  border-color: rgba(168, 85, 247, 0.58);
  box-shadow: 0 18px 44px rgba(124, 58, 237, 0.14);
}

.achievement-orb {
  align-items: center;
  background: #e2e8f0;
  border-radius: 999px;
  color: #64748b;
  display: inline-flex;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.achievement-orb img {
  border-radius: inherit;
  height: 100%;
  object-fit: cover;
  width: 100%;
}

.achievement-roadmap-card.unlocked .achievement-orb {
  background: linear-gradient(135deg, #f59e0b, #facc15);
  color: #ffffff;
}

.achievement-roadmap-card.next .achievement-orb {
  background: linear-gradient(135deg, #9333ea, #ec4899);
  color: #ffffff;
}

.achievement-roadmap-card strong {
  display: block;
  font-size: 14px;
  font-weight: 950;
  line-height: 1.15;
}

.achievement-type-chip {
  background: rgba(124, 58, 237, 0.12);
  border: 1px solid rgba(124, 58, 237, 0.18);
  border-radius: 999px;
  color: #7c3aed;
  display: inline-flex;
  font-size: 9px;
  font-style: normal;
  font-weight: 950;
  margin-bottom: 6px;
  padding: 4px 7px;
  text-transform: uppercase;
}

.achievement-roadmap-card p {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
  margin-top: 5px;
}

.achievement-progress {
  background: rgba(148, 163, 184, 0.22);
  border-radius: 999px;
  height: 8px;
  margin-top: 10px;
  overflow: hidden;
}

.achievement-progress i {
  background: linear-gradient(90deg, #9333ea, #ec4899);
  border-radius: inherit;
  display: block;
  height: 100%;
}

.achievement-roadmap-card small {
  color: #94a3b8;
  display: block;
  font-size: 10px;
  font-weight: 950;
  margin-top: 7px;
}

.achievement-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 9px;
}

.achievement-card-actions button {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  color: #cbd5e1;
  font-size: 10px;
  font-weight: 950;
  min-height: 28px;
  padding: 0 9px;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 960px) {
  .achievement-editor {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .achievement-field-icon,
  .achievement-editor-actions {
    grid-column: 1 / -1;
  }

  .achievement-editor-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .achievement-roadmap {
    border-radius: 0;
  }

  .achievement-modal-backdrop {
    align-items: stretch;
    padding: 0;
  }

  .achievement-modal-card {
    border-radius: 0;
    max-height: 100dvh;
    padding: 52px 14px 18px;
    width: 100%;
  }

  .achievement-modal-card .icon-modal-close {
    right: 12px;
    top: 12px;
  }

  .achievement-roadmap-head {
    align-items: flex-start;
    display: grid;
    padding-right: 0;
  }

  .achievement-roadmap-actions {
    align-items: stretch;
    display: grid;
  }

  .achievement-roadmap-actions button {
    justify-content: center;
  }

  .achievement-roadmap-head h2 {
    font-size: 20px;
  }

  .achievement-editor {
    grid-template-columns: 1fr;
  }

  .achievement-field-icon,
  .achievement-editor-actions {
    grid-column: auto;
  }

  .achievement-field-target input {
    max-width: none;
  }

  .achievement-editor-actions {
    display: grid;
  }

  .achievement-roadmap-grid {
    grid-template-columns: 1fr;
  }

  .achievement-roadmap-card {
    min-height: 0;
  }
}
</style>
