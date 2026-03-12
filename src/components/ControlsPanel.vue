<template>
  <section class="controls-panel">
    <header>
      <div>
        <p class="eyebrow">DepthShift</p>
        <h1>Head-Tracked Window</h1>
      </div>
      <button class="primary" type="button" @click="$emit('toggle-fullscreen')">
        {{ fullscreenActive ? 'Leave Fullscreen' : 'Fullscreen' }}
      </button>
    </header>

    <p class="summary">
      Keep the room locked to the screen, then steer the perspective with your head position instead of moving the whole scene.
    </p>

    <div class="control-grid quick-controls">
      <label>
        <span>Tracking</span>
        <button class="secondary" type="button" @click="$emit('toggle-tracking')">
          {{ trackingEnabled ? 'Stop Camera' : 'Start Camera' }}
        </button>
      </label>

      <label>
        <span>Debug Info</span>
        <input :checked="debugEnabled" type="checkbox" @change="$emit('update-debug-enabled', $event.target.checked)" />
      </label>

      <label>
        <span>Face Preview</span>
        <input :checked="faceViewEnabled" type="checkbox" @change="$emit('update-face-view-enabled', $event.target.checked)" />
      </label>

      <label>
        <span>Wireframe Room</span>
        <input :checked="wireframeEnabled" type="checkbox" @change="$emit('update-wireframe-enabled', $event.target.checked)" />
      </label>

      <label>
        <span>Hint Cards</span>
        <input :checked="hintCardsEnabled" type="checkbox" @change="$emit('update-hint-cards-enabled', $event.target.checked)" />
      </label>

      <label>
        <span>Auto Spin</span>
        <input :checked="autoRotateEnabled" type="checkbox" @change="$emit('update-auto-rotate-enabled', $event.target.checked)" />
      </label>
    </div>

    <div class="section">
      <div class="section-header">
        <h2>Screen And Room</h2>
        <button class="ghost" type="button" @click="$emit('apply-reference-preset')">Reference Look</button>
      </div>
      <div class="control-grid">
        <label>
          <span>Window Width</span>
          <input :value="settings.screenWidth" type="number" min="0.25" max="1.5" step="0.01" @input="patch('screenWidth', $event.target.value)" />
        </label>

        <label>
          <span>Window Height</span>
          <input :value="settings.screenHeight" type="number" min="0.18" max="1" step="0.01" @input="patch('screenHeight', $event.target.value)" />
        </label>

        <label>
          <span>Room Depth</span>
          <input :value="settings.roomDepth" type="range" min="1.2" max="10" step="0.1" @input="patch('roomDepth', $event.target.value)" />
          <small>{{ settings.roomDepth.toFixed(2) }} m</small>
        </label>

        <label>
          <span>Grid Density</span>
          <input :value="settings.gridDensity" type="range" min="4" max="18" step="1" @input="patch('gridDensity', $event.target.value)" />
          <small>{{ settings.gridDensity }}</small>
        </label>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <h2>Tracking And Frustum</h2>
      </div>
      <div class="control-grid">
        <label>
          <span>Default Distance</span>
          <input :value="settings.defaultViewingDistance" type="number" min="0.3" max="2.5" step="0.01" @input="patch('defaultViewingDistance', $event.target.value)" />
        </label>

        <label>
          <span>Smoothing</span>
          <input :value="settings.smoothing" type="range" min="0" max="0.97" step="0.01" @input="patch('smoothing', $event.target.value)" />
          <small>{{ settings.smoothing.toFixed(2) }}</small>
        </label>

        <label>
          <span>Frustum Strength</span>
          <input :value="settings.frustumSensitivity" type="range" min="0.5" max="1.8" step="0.01" @input="patch('frustumSensitivity', $event.target.value)" />
          <small>{{ settings.frustumSensitivity.toFixed(2) }}</small>
        </label>

        <label>
          <span>Horizontal Response</span>
          <input :value="settings.horizontalSensitivity" type="range" min="0.4" max="2" step="0.01" @input="patch('horizontalSensitivity', $event.target.value)" />
          <small>{{ settings.horizontalSensitivity.toFixed(2) }}</small>
        </label>

        <label>
          <span>Vertical Response</span>
          <input :value="settings.verticalSensitivity" type="range" min="0.4" max="2" step="0.01" @input="patch('verticalSensitivity', $event.target.value)" />
          <small>{{ settings.verticalSensitivity.toFixed(2) }}</small>
        </label>

        <label>
          <span>Depth Response</span>
          <input :value="settings.depthSensitivity" type="range" min="0" max="0.5" step="0.01" @input="patch('depthSensitivity', $event.target.value)" />
          <small>{{ settings.depthSensitivity.toFixed(2) }}</small>
        </label>

        <label>
          <span>Horizontal Clamp</span>
          <input :value="settings.maxHeadX" type="range" min="0.08" max="0.45" step="0.01" @input="patch('maxHeadX', $event.target.value)" />
          <small>{{ settings.maxHeadX.toFixed(2) }} m</small>
        </label>

        <label>
          <span>Vertical Clamp</span>
          <input :value="settings.maxHeadY" type="range" min="0.06" max="0.35" step="0.01" @input="patch('maxHeadY', $event.target.value)" />
          <small>{{ settings.maxHeadY.toFixed(2) }} m</small>
        </label>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <h2>Object</h2>
      </div>
      <div class="control-grid">
        <label>
          <span>Forward Offset</span>
          <input :value="settings.objectForwardOffset" type="range" min="0.1" max="1.25" step="0.01" @input="patch('objectForwardOffset', $event.target.value)" />
          <small>{{ settings.objectForwardOffset.toFixed(2) }} m</small>
        </label>

        <label>
          <span>Scale</span>
          <input :value="settings.objectScale" type="range" min="0.5" max="1.8" step="0.01" @input="patch('objectScale', $event.target.value)" />
          <small>{{ settings.objectScale.toFixed(2) }}x</small>
        </label>

        <label>
          <span>Pop Out</span>
          <input :value="settings.popOutAmount" type="range" min="-0.05" max="0.2" step="0.01" @input="patch('popOutAmount', $event.target.value)" />
          <small>{{ settings.popOutAmount.toFixed(2) }} m</small>
        </label>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <h2>Model</h2>
      </div>
      <div class="control-grid">
        <label>
          <span>Preset Model</span>
          <select :value="selectedModelOption" @change="$emit('select-model-option', $event.target.value)">
            <option v-for="option in sampleOptions" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="wide">
          <span>Model URL Or Path</span>
          <input :value="modelSource" type="text" placeholder="https://example.com/model.glb or /models/file.gltf" @input="$emit('update-model-source', $event.target.value)" />
        </label>
      </div>
    </div>

    <footer>
      <div class="footer-actions">
        <button class="ghost" type="button" @click="$emit('save-custom-preset')">Save My Preset</button>
        <button class="ghost" type="button" @click="$emit('reset-calibration')">Reset Defaults</button>
      </div>
      <div class="footer-status">
        <span class="status">{{ saveStatusLabel }}</span>
        <span class="status">{{ trackingStatusLabel }}</span>
      </div>
    </footer>
  </section>
</template>

<script setup>
defineProps({
  autoRotateEnabled: Boolean,
  debugEnabled: Boolean,
  faceViewEnabled: Boolean,
  fullscreenActive: Boolean,
  hintCardsEnabled: Boolean,
  modelSource: {
    type: String,
    default: ''
  },
  sampleOptions: {
    type: Array,
    required: true
  },
  saveStatusLabel: {
    type: String,
    default: 'Not saved yet'
  },
  selectedModelOption: {
    type: String,
    default: 'primitive'
  },
  settings: {
    type: Object,
    required: true
  },
  trackingEnabled: Boolean,
  trackingStatusLabel: {
    type: String,
    default: 'Camera paused'
  },
  wireframeEnabled: Boolean
})

const emit = defineEmits([
  'apply-reference-preset',
  'patch-settings',
  'reset-calibration',
  'save-custom-preset',
  'select-model-option',
  'toggle-fullscreen',
  'toggle-tracking',
  'update-auto-rotate-enabled',
  'update-debug-enabled',
  'update-face-view-enabled',
  'update-hint-cards-enabled',
  'update-model-source',
  'update-wireframe-enabled'
])

function patch(key, value) {
  const parsed = Number(value)
  if (Number.isFinite(parsed)) {
    emit('patch-settings', { [key]: parsed })
  }
}
</script>

<style scoped>
.controls-panel {
  position: absolute;
  left: 1.25rem;
  top: 1.25rem;
  z-index: 9;
  width: min(460px, calc(100vw - 2rem));
  max-height: calc(100vh - 2.5rem);
  overflow: auto;
  padding: 1.1rem;
  border: 1px solid rgba(122, 197, 255, 0.18);
  border-radius: 22px;
  background: rgba(7, 16, 25, 0.84);
  backdrop-filter: blur(20px);
  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.35);
}

header,
.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.eyebrow {
  margin: 0;
  color: #7bc6ff;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.7rem;
}

h1,
h2 {
  margin: 0;
}

h1 {
  margin-top: 0.2rem;
  font-size: 1.35rem;
}

h2 {
  font-size: 0.95rem;
}

.summary {
  margin: 0.8rem 0 1rem;
  color: rgba(230, 240, 250, 0.78);
  line-height: 1.45;
  font-size: 0.93rem;
}

.section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(123, 198, 255, 0.12);
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
  margin-top: 0.8rem;
}

.quick-controls {
  margin-top: 0;
}

label {
  display: grid;
  gap: 0.38rem;
  font-size: 0.84rem;
}

label span,
small {
  color: rgba(230, 240, 250, 0.72);
}

small {
  font-size: 0.75rem;
}

label.wide {
  grid-column: 1 / -1;
}

input,
select,
button {
  border: 1px solid rgba(123, 198, 255, 0.18);
  border-radius: 12px;
  background: rgba(12, 24, 38, 0.95);
  color: #f1f5f8;
  min-height: 42px;
  padding: 0.7rem 0.85rem;
  font: inherit;
}

input[type='checkbox'] {
  min-height: auto;
  width: 22px;
  height: 22px;
  padding: 0;
}

input[type='range'] {
  padding-inline: 0;
}

button {
  cursor: pointer;
  transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
}

button:hover {
  transform: translateY(-1px);
  border-color: rgba(123, 198, 255, 0.36);
}

.primary {
  background: linear-gradient(135deg, #f6c56c, #ff9c58);
  color: #08111b;
  border-color: transparent;
  font-weight: 700;
}

.secondary,
.ghost {
  background: rgba(12, 24, 38, 0.95);
}

footer {
  display: grid;
  gap: 0.8rem;
  margin-top: 1rem;
}

.footer-actions,
.footer-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.status {
  color: rgba(230, 240, 250, 0.72);
  font-size: 0.84rem;
}

@media (max-width: 768px) {
  .controls-panel {
    left: 0.75rem;
    right: 0.75rem;
    top: auto;
    bottom: 0.75rem;
    width: auto;
    max-height: min(58vh, 560px);
    padding: 0.95rem;
    border-radius: 20px;
  }

  header {
    align-items: stretch;
  }

  .control-grid {
    grid-template-columns: 1fr;
  }

  .footer-actions,
  .footer-status {
    flex-direction: column;
    align-items: stretch;
  }

  .footer-actions button {
    width: 100%;
  }

  .status {
    text-align: center;
  }
}
</style>
