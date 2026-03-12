<template>
  <section ref="hostRef" class="canvas-shell">
    <div ref="canvasMountRef" class="canvas-mount"></div>

    <button v-if="fullscreenSupported" class="floating-fullscreen" type="button" @click="toggleFullscreen">
      {{ fullscreenActive ? 'Leave Fullscreen' : 'Fullscreen' }}
    </button>

    <div class="status-card" :class="trackingStateClass">
      <span class="status-icon" aria-hidden="true"></span>
      <strong>{{ trackingLabel }}</strong>
      <span class="status-detail">{{ statusMessage }}</span>
    </div>

    <div class="hint-card" v-if="hintCardsEnabled && !trackingEnabled">
      <strong>Camera tracking is off.</strong>
      <span>Start the camera to make the window respond to your head position.</span>
    </div>

    <div class="hint-card error" v-else-if="hintCardsEnabled && (trackingError || modelError)">
      <strong>{{ trackingError ? 'Tracking is unavailable' : 'Model fallback is active' }}</strong>
      <span>{{ trackingError || modelError }}</span>
    </div>

    <DebugOverlay
      :visible="debugEnabled"
      :status="trackingLabel"
      :head="debugStats"
      :frustum="frustumStats"
      :model-label="modelLabel"
    />

    <div class="face-view-shell" :class="{ inactive: !trackingEnabled, hidden: !faceViewEnabled }">
      <div class="face-view-label">Face Preview</div>
      <video ref="videoElement" class="tracking-video visible" autoplay muted playsinline></video>
      <canvas ref="faceMeshCanvasRef" class="face-mesh-canvas"></canvas>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { FACEMESH_TESSELATION } from '@mediapipe/face_mesh'
import DebugOverlay from './DebugOverlay.vue'
import { useFaceTracking } from '../composables/useFaceTracking'
import { useOffAxisCamera } from '../composables/useOffAxisCamera'
import { useThreeScene } from '../composables/useThreeScene'

const props = defineProps({
  autoRotateEnabled: Boolean,
  debugEnabled: Boolean,
  faceViewEnabled: Boolean,
  hintCardsEnabled: Boolean,
  modelLabel: {
    type: String,
    default: 'Primitive Demo'
  },
  modelSource: {
    type: String,
    default: ''
  },
  settings: {
    type: Object,
    required: true
  },
  trackingEnabled: Boolean,
  wireframeEnabled: Boolean
})

const emit = defineEmits(['fullscreen-change', 'tracking-status'])

const hostRef = ref(null)
const canvasMountRef = ref(null)
const faceMeshCanvasRef = ref(null)
const modelSourceRef = computed(() => props.modelSource)
const fullscreenActive = ref(false)
const fullscreenSupported = ref(false)

const { debug, error, isRunning, latestLandmarks, smoothedHead, start, status, stop, videoElement } = useFaceTracking(props.settings)
const { fallbackEye, frustumDebug, updateOffAxisCamera } = useOffAxisCamera()
const wireframeEnabledRef = computed(() => props.wireframeEnabled !== false)
const { camera, init, modelError, updateModelMotion } = useThreeScene(canvasMountRef, props.settings, modelSourceRef, wireframeEnabledRef)

const trackingLabel = computed(() => {
  const labels = {
    idle: 'Camera Paused',
    loading: 'Starting Tracker',
    searching: 'Looking For Face',
    tracking: 'Tracking Active',
    error: 'Tracking Error'
  }
  return labels[status.value] || 'Camera Paused'
})

const debugStats = computed(() => debug.value)
const frustumStats = computed(() => frustumDebug.value)
const trackingError = computed(() => error.value)
const trackingStateClass = computed(() => status.value)
const statusMessage = computed(() => {
  if (trackingError.value) {
    return trackingError.value
  }

  if (modelError.value) {
    return `${modelError.value} The demo object is being shown instead.`
  }

  if (status.value === 'tracking') {
    return 'The screen-aligned room is stable and the off-axis frustum is updating live.'
  }

  if (status.value === 'searching') {
    return 'Keep your face inside the camera view and look toward the screen.'
  }

  if (status.value === 'loading') {
    return 'Loading the face tracker and opening the camera stream.'
  }

  return 'Enable tracking when you are ready to use the head-coupled view.'
})

function renderFrame(delta) {
  if (!camera.value) {
    return
  }

  const viewer = isRunning.value ? smoothedHead : fallbackEye
  updateOffAxisCamera(camera.value, viewer, props.settings)
  updateModelMotion(delta, viewer, props.autoRotateEnabled)
  drawFaceMesh()
  emit('tracking-status', {
    error: trackingError.value,
    fps: debug.value.fps,
    head: {
      x: debug.value.headX,
      y: debug.value.headY,
      z: debug.value.headZ
    },
    modelError: modelError.value,
    status: status.value
  })
}

function drawFaceMesh() {
  const canvas = faceMeshCanvasRef.value
  const video = videoElement.value
  if (!canvas || !video || !props.faceViewEnabled) {
    return
  }

  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (!width || !height) {
    return
  }

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  ctx.clearRect(0, 0, width, height)

  if (!latestLandmarks.value.length) {
    return
  }

  const videoWidth = video.videoWidth || width
  const videoHeight = video.videoHeight || height
  const scale = Math.max(width / videoWidth, height / videoHeight)
  const drawWidth = videoWidth * scale
  const drawHeight = videoHeight * scale
  const offsetX = (width - drawWidth) * 0.5
  const offsetY = (height - drawHeight) * 0.5

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)'
  ctx.lineWidth = 0.85

  for (const [startIndex, endIndex] of FACEMESH_TESSELATION) {
    const start = latestLandmarks.value[startIndex]
    const end = latestLandmarks.value[endIndex]
    if (!start || !end) {
      continue
    }

    ctx.beginPath()
    ctx.moveTo(offsetX + (1 - start.x) * drawWidth, offsetY + start.y * drawHeight)
    ctx.lineTo(offsetX + (1 - end.x) * drawWidth, offsetY + end.y * drawHeight)
    ctx.stroke()
  }
}

async function syncTracking() {
  if (props.trackingEnabled) {
    await start()
    return
  }

  stop()
}

async function toggleFullscreen() {
  const host = hostRef.value
  if (!host || !fullscreenSupported.value) {
    return
  }

  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (host.requestFullscreen) {
      await host.requestFullscreen()
      return
    }

    if (host.webkitRequestFullscreen) {
      await host.webkitRequestFullscreen()
    }
    return
  }

  if (document.exitFullscreen) {
    await document.exitFullscreen()
    return
  }

  if (document.webkitExitFullscreen) {
    await document.webkitExitFullscreen()
  }
}

function handleFullscreenChange() {
  fullscreenActive.value = document.fullscreenElement === hostRef.value || document.webkitFullscreenElement === hostRef.value
  emit('fullscreen-change', fullscreenActive.value)
}

watch(
  () => props.trackingEnabled,
  () => {
    syncTracking()
  }
)

watch([status, trackingError, modelError], () => {
  emit('tracking-status', {
    error: trackingError.value,
    fps: debug.value.fps,
    head: {
      x: debug.value.headX,
      y: debug.value.headY,
      z: debug.value.headZ
    },
    modelError: modelError.value,
    status: status.value
  })
})

onMounted(() => {
  init(renderFrame)
  syncTracking()
  fullscreenSupported.value = Boolean(
    hostRef.value?.requestFullscreen ||
    hostRef.value?.webkitRequestFullscreen ||
    document.exitFullscreen ||
    document.webkitExitFullscreen
  )
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
  stop()
})

defineExpose({
  toggleFullscreen
})
</script>

<style scoped>
.canvas-shell {
  position: relative;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.canvas-mount,
.canvas-mount :deep(canvas) {
  width: 100%;
  height: 100%;
  display: block;
}

.floating-fullscreen {
  position: absolute;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 9;
  min-height: 48px;
  padding: 0.85rem 1.2rem;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(246, 197, 108, 0.96), rgba(255, 156, 88, 0.96));
  color: #08111b;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
}

.status-card,
.hint-card {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 7;
  display: grid;
  gap: 0.2rem;
  width: min(560px, calc(100vw - 2rem));
  padding: 0.95rem 1.15rem;
  border-radius: 18px;
  background: rgba(6, 17, 28, 0.68);
  backdrop-filter: blur(20px);
  text-align: center;
}

.status-card {
  bottom: 1.2rem;
  border: 1px solid rgba(123, 198, 255, 0.18);
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.35rem 0.7rem;
  width: auto;
  max-width: min(520px, calc(100vw - 10rem));
  padding: 0.75rem 0.95rem;
  border-radius: 999px;
  text-align: left;
}

.hint-card {
  bottom: 5.8rem;
  border: 1px solid rgba(123, 198, 255, 0.12);
}

.status-card strong,
.hint-card strong {
  font-size: 0.95rem;
}

.status-card span,
.hint-card span {
  color: rgba(237, 245, 250, 0.74);
  font-size: 0.84rem;
}

.status-card .status-icon {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: #7bc6ff;
  box-shadow: 0 0 16px rgba(123, 198, 255, 0.45);
}

.status-card .status-detail {
  grid-column: 2;
}

.status-card.tracking {
  border-color: rgba(111, 214, 172, 0.3);
}

.status-card.tracking .status-icon {
  background: #6fd6ac;
  box-shadow: 0 0 16px rgba(111, 214, 172, 0.45);
}

.status-card.searching .status-icon,
.status-card.loading .status-icon {
  background: #ffb15b;
  box-shadow: 0 0 16px rgba(255, 177, 91, 0.45);
}

.status-card.error,
.hint-card.error {
  border-color: rgba(255, 122, 122, 0.34);
}

.status-card.error .status-icon {
  background: #ff7a7a;
  box-shadow: 0 0 16px rgba(255, 122, 122, 0.45);
}

.tracking-video {
  display: none;
}

.tracking-video.visible {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.face-mesh-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.face-view-shell {
  position: absolute;
  right: 1.25rem;
  bottom: 5.6rem;
  z-index: 8;
  width: min(240px, 28vw);
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border: 1px solid rgba(123, 198, 255, 0.24);
  border-radius: 18px;
  background: rgba(6, 17, 28, 0.9);
  box-shadow: 0 20px 44px rgba(0, 0, 0, 0.35);
}

.face-view-shell.inactive {
  opacity: 0.55;
}

.face-view-shell.hidden {
  opacity: 0;
  pointer-events: none;
}

.face-view-label {
  position: absolute;
  left: 0.65rem;
  top: 0.65rem;
  z-index: 1;
  padding: 0.28rem 0.5rem;
  border-radius: 999px;
  background: rgba(6, 17, 28, 0.72);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: rgba(241, 245, 248, 0.86);
}

@media (max-width: 768px) {
  .floating-fullscreen {
    right: 0.75rem;
    top: 0.75rem;
    bottom: auto;
    min-height: 38px;
    padding: 0.58rem 0.9rem;
    font-size: 0.78rem;
  }

  .status-card,
  .hint-card {
    width: auto;
    max-width: calc(100vw - 8.25rem);
    left: 0.75rem;
    transform: none;
    padding: 0.65rem 0.8rem;
    border-radius: 999px;
  }

  .status-card {
    top: 0.75rem;
    bottom: auto;
    display: inline-grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    min-height: 38px;
  }

  .hint-card {
    top: 3.75rem;
    bottom: auto;
    max-width: calc(100vw - 1.5rem);
    border-radius: 14px;
  }

  .status-card strong {
    font-size: 0.78rem;
  }

  .status-card .status-detail {
    display: none;
  }

  .hint-card strong {
    font-size: 0.82rem;
  }

  .hint-card span {
    font-size: 0.74rem;
  }

  .face-view-shell {
    left: 0.75rem;
    right: auto;
    top: 6.8rem;
    bottom: auto;
    width: min(150px, 34vw);
    border-radius: 14px;
  }
}
</style>
