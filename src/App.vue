<template>
  <main class="app-shell">
    <FullscreenCanvas
      ref="canvasRef"
      :auto-rotate-enabled="autoRotateEnabled"
      :debug-enabled="debugEnabled"
      :face-view-enabled="faceViewEnabled"
      :hint-cards-enabled="hintCardsEnabled"
      :model-label="currentModelLabel"
      :model-source="modelSource"
      :settings="settings"
      :tracking-enabled="trackingEnabled"
      :wireframe-enabled="wireframeEnabled"
      @fullscreen-change="fullscreenActive = $event"
      @tracking-status="trackingInfo = $event"
    />

    <ControlsPanel
      :auto-rotate-enabled="autoRotateEnabled"
      :debug-enabled="debugEnabled"
      :face-view-enabled="faceViewEnabled"
      :fullscreen-active="fullscreenActive"
      :hint-cards-enabled="hintCardsEnabled"
      :model-source="modelSource"
      :sample-options="sampleModels"
      :save-status-label="saveStatusLabel"
      :selected-model-option="selectedModelOption"
      :settings="settings"
      :tracking-enabled="trackingEnabled"
      :tracking-status-label="trackingLabel"
      :wireframe-enabled="wireframeEnabled"
      @apply-reference-preset="applyReferencePreset"
      @patch-settings="patchSettings"
      @reset-calibration="resetCalibration"
      @save-custom-preset="saveCustomPreset"
      @select-model-option="selectModelOption"
      @toggle-fullscreen="toggleFullscreen"
      @toggle-tracking="trackingEnabled = !trackingEnabled"
      @update-auto-rotate-enabled="setAutoRotateEnabled"
      @update-debug-enabled="setDebugEnabled"
      @update-face-view-enabled="setFaceViewEnabled"
      @update-hint-cards-enabled="setHintCardsEnabled"
      @update-model-source="updateModelSource"
      @update-wireframe-enabled="setWireframeEnabled"
    />

    <transition name="boot-fade">
      <div v-if="isBooting" class="boot-loader" aria-live="polite">
        <div class="loader-ring"></div>
        <p class="loader-eyebrow">DepthShift</p>
        <h2>Preparing your view</h2>
        <p class="loader-copy">{{ loaderMessage }}</p>
      </div>
    </transition>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import ControlsPanel from './components/ControlsPanel.vue'
import FullscreenCanvas from './components/FullscreenCanvas.vue'
import { createDefaultCalibration, createReferenceCalibration, LOCAL_AIR_JORDAN_MODEL, SAMPLE_MODELS, sanitizeCalibration } from './utils/calibration'

const STORAGE_KEY = 'depthshift:custom-preset:v1'

const canvasRef = ref(null)
const autoRotateEnabled = ref(false)
const debugEnabled = ref(false)
const faceViewEnabled = ref(true)
const fullscreenActive = ref(false)
const hintCardsEnabled = ref(false)
const trackingEnabled = ref(false)
const wireframeEnabled = ref(true)
const isBooting = ref(true)
const loaderMessage = ref('Loading your saved chamber and preparing the scene.')
const saveStatusLabel = ref('Not saved yet')
const settings = reactive(createDefaultCalibration())
const trackingInfo = ref({
  error: '',
  fps: 0,
  head: { x: 0, y: 0, z: settings.defaultViewingDistance },
  modelError: '',
  status: 'idle'
})
const selectedModelOption = ref('local')
const sampleModels = SAMPLE_MODELS
const modelSource = ref(SAMPLE_MODELS.find((option) => option.id === 'local')?.value || '')
const legacyLocalModelPaths = new Set([
  '/models/airJordan.glb',
  'models/airJordan.glb'
])

const trackingLabel = computed(() => {
  const status = trackingInfo.value.status
  const labels = {
    idle: 'Camera paused',
    loading: 'Starting tracker',
    searching: 'Looking for your face',
    tracking: 'Head tracking live',
    error: 'Tracking problem'
  }
  return labels[status] || 'Camera paused'
})

const currentModelLabel = computed(() => {
  const selected = sampleModels.find((option) => option.id === selectedModelOption.value)
  if (selected && selected.value === modelSource.value) {
    return selected.label
  }

  return modelSource.value || 'Primitive Demo'
})

function patchSettings(patch) {
  Object.assign(settings, sanitizeCalibration({ ...settings, ...patch }))
  saveStatusLabel.value = 'Unsaved changes'
}

function resetCalibration() {
  Object.assign(settings, createDefaultCalibration())
  saveStatusLabel.value = 'Unsaved changes'
}

function applyReferencePreset() {
  Object.assign(settings, createReferenceCalibration())
  saveStatusLabel.value = 'Unsaved changes'
}

function selectModelOption(optionId) {
  selectedModelOption.value = optionId
  const selected = sampleModels.find((option) => option.id === optionId)
  modelSource.value = selected?.value || ''
  saveStatusLabel.value = 'Unsaved changes'
}

function updateModelSource(value) {
  modelSource.value = value.trim()
  const matched = sampleModels.find((option) => option.value === modelSource.value)
  selectedModelOption.value = matched?.id || 'primitive'
  saveStatusLabel.value = 'Unsaved changes'
}

function toggleFullscreen() {
  canvasRef.value?.toggleFullscreen()
}

function setAutoRotateEnabled(value) {
  autoRotateEnabled.value = value
  saveStatusLabel.value = 'Unsaved changes'
}

function setDebugEnabled(value) {
  debugEnabled.value = value
  saveStatusLabel.value = 'Unsaved changes'
}

function setFaceViewEnabled(value) {
  faceViewEnabled.value = value
  saveStatusLabel.value = 'Unsaved changes'
}

function setHintCardsEnabled(value) {
  hintCardsEnabled.value = value
  saveStatusLabel.value = 'Unsaved changes'
}

function setWireframeEnabled(value) {
  wireframeEnabled.value = value
  saveStatusLabel.value = 'Unsaved changes'
}

function loadSavedPreset() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      saveStatusLabel.value = 'No saved preset'
      loaderMessage.value = 'Starting with the default chamber setup.'
      return
    }

    const saved = JSON.parse(raw)
    Object.assign(settings, sanitizeCalibration(saved.settings || {}))
    modelSource.value = typeof saved.modelSource === 'string' ? saved.modelSource : modelSource.value
    if (legacyLocalModelPaths.has(modelSource.value)) {
      modelSource.value = LOCAL_AIR_JORDAN_MODEL
    }
    selectedModelOption.value = typeof saved.selectedModelOption === 'string' ? saved.selectedModelOption : selectedModelOption.value
    autoRotateEnabled.value = Boolean(saved.autoRotateEnabled)
    debugEnabled.value = saved.debugEnabled !== false
    faceViewEnabled.value = Boolean(saved.faceViewEnabled)
    hintCardsEnabled.value = saved.hintCardsEnabled !== false
    wireframeEnabled.value = saved.wireframeEnabled !== false
    saveStatusLabel.value = 'Saved preset loaded'
    loaderMessage.value = 'Loaded your saved preset and preparing the scene.'
  } catch {
    saveStatusLabel.value = 'Saved preset could not be read'
    loaderMessage.value = 'Saved preset failed to load, using defaults instead.'
  }
}

function saveCustomPreset() {
  try {
    const payload = {
      settings: sanitizeCalibration(settings),
      modelSource: modelSource.value,
      selectedModelOption: selectedModelOption.value,
      autoRotateEnabled: autoRotateEnabled.value,
      debugEnabled: debugEnabled.value,
      faceViewEnabled: faceViewEnabled.value,
      hintCardsEnabled: hintCardsEnabled.value,
      wireframeEnabled: wireframeEnabled.value
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    saveStatusLabel.value = 'Saved to this device'
  } catch {
    saveStatusLabel.value = 'Save failed on this browser'
  }
}

onMounted(() => {
  loadSavedPreset()
  window.setTimeout(() => {
    isBooting.value = false
  }, 950)
})
</script>

<style scoped>
.app-shell {
  position: relative;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
}

.boot-loader {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 0.65rem;
  background:
    radial-gradient(circle at 50% 30%, rgba(255, 173, 92, 0.18), transparent 28%),
    linear-gradient(180deg, rgba(4, 10, 16, 0.94), rgba(2, 6, 10, 0.98));
  text-align: center;
}

.loader-ring {
  width: 72px;
  height: 72px;
  border: 3px solid rgba(123, 198, 255, 0.16);
  border-top-color: #ffb15b;
  border-right-color: #ffd18a;
  border-radius: 50%;
  animation: spin 0.95s linear infinite;
  box-shadow: 0 0 42px rgba(255, 177, 91, 0.18);
}

.loader-eyebrow {
  margin: 0;
  color: #7bc6ff;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-size: 0.76rem;
}

.boot-loader h2 {
  margin: 0;
  font-size: clamp(1.5rem, 3vw, 2.2rem);
}

.loader-copy {
  margin: 0;
  width: min(440px, calc(100vw - 3rem));
  color: rgba(238, 245, 250, 0.78);
  line-height: 1.5;
}

.boot-fade-enter-active,
.boot-fade-leave-active {
  transition: opacity 220ms ease;
}

.boot-fade-enter-from,
.boot-fade-leave-to {
  opacity: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .boot-loader {
    padding: 1.5rem;
  }

  .loader-ring {
    width: 60px;
    height: 60px;
  }
}
</style>
