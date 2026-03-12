export const LOCAL_AIR_JORDAN_MODEL = `${import.meta.env.BASE_URL}models/airJordan.glb`

export const DEFAULT_CALIBRATION = Object.freeze({
  screenWidth: 0.53,
  screenHeight: 0.3,
  defaultViewingDistance: 0.62,
  roomDepth: 2.6,
  gridDensity: 10,
  smoothing: 0.88,
  frustumSensitivity: 1,
  horizontalSensitivity: 1.24,
  verticalSensitivity: 1.18,
  depthSensitivity: 0.08,
  maxHeadX: 0.22,
  maxHeadY: 0.16,
  minHeadZ: 0.38,
  maxHeadZ: 1.3,
  objectForwardOffset: 0.42,
  objectScale: 0.92,
  popOutAmount: 0.04
})

export const REFERENCE_PRESET = Object.freeze({
  ...DEFAULT_CALIBRATION,
  roomDepth: 2.4,
  gridDensity: 11,
  smoothing: 0.9,
  frustumSensitivity: 1.12,
  horizontalSensitivity: 1.3,
  verticalSensitivity: 1.2,
  depthSensitivity: 0.04,
  objectForwardOffset: 0.38,
  objectScale: 0.96,
  popOutAmount: 0.05
})

export const SAMPLE_MODELS = [
  {
    id: 'primitive',
    label: 'Primitive Demo',
    value: ''
  },
  {
    id: 'local',
    label: 'Air Jordan',
    value: LOCAL_AIR_JORDAN_MODEL
  },
  {
    id: 'external',
    label: 'External Astronaut GLB',
    value: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb'
  }
]

export function createDefaultCalibration() {
  return { ...DEFAULT_CALIBRATION }
}

export function createReferenceCalibration() {
  return { ...REFERENCE_PRESET }
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function lerp(current, target, alpha) {
  return current + (target - current) * alpha
}

function coerceNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function sanitizeCalibration(input) {
  return {
    screenWidth: clamp(coerceNumber(input.screenWidth, DEFAULT_CALIBRATION.screenWidth), 0.25, 1.5),
    screenHeight: clamp(coerceNumber(input.screenHeight, DEFAULT_CALIBRATION.screenHeight), 0.18, 1),
    defaultViewingDistance: clamp(coerceNumber(input.defaultViewingDistance, DEFAULT_CALIBRATION.defaultViewingDistance), 0.3, 2.5),
    roomDepth: clamp(coerceNumber(input.roomDepth, DEFAULT_CALIBRATION.roomDepth), 1.2, 10),
    gridDensity: clamp(Math.round(coerceNumber(input.gridDensity, DEFAULT_CALIBRATION.gridDensity)), 4, 18),
    smoothing: clamp(coerceNumber(input.smoothing, DEFAULT_CALIBRATION.smoothing), 0, 0.97),
    frustumSensitivity: clamp(coerceNumber(input.frustumSensitivity, DEFAULT_CALIBRATION.frustumSensitivity), 0.5, 1.8),
    horizontalSensitivity: clamp(coerceNumber(input.horizontalSensitivity, DEFAULT_CALIBRATION.horizontalSensitivity), 0.4, 2),
    verticalSensitivity: clamp(coerceNumber(input.verticalSensitivity, DEFAULT_CALIBRATION.verticalSensitivity), 0.4, 2),
    depthSensitivity: clamp(coerceNumber(input.depthSensitivity, DEFAULT_CALIBRATION.depthSensitivity), 0.2, 1.6),
    maxHeadX: clamp(coerceNumber(input.maxHeadX, DEFAULT_CALIBRATION.maxHeadX), 0.08, 0.45),
    maxHeadY: clamp(coerceNumber(input.maxHeadY, DEFAULT_CALIBRATION.maxHeadY), 0.06, 0.35),
    minHeadZ: clamp(coerceNumber(input.minHeadZ, DEFAULT_CALIBRATION.minHeadZ), 0.2, 1),
    maxHeadZ: clamp(coerceNumber(input.maxHeadZ, DEFAULT_CALIBRATION.maxHeadZ), 0.5, 2.5),
    objectForwardOffset: clamp(coerceNumber(input.objectForwardOffset, DEFAULT_CALIBRATION.objectForwardOffset), -0.1, 1.25),
    objectScale: clamp(coerceNumber(input.objectScale, DEFAULT_CALIBRATION.objectScale), 0.5, 2.5),
    popOutAmount: clamp(coerceNumber(input.popOutAmount, DEFAULT_CALIBRATION.popOutAmount), -0.2, 0.35)
  }
}

export function formatMeters(value) {
  return `${Number(value || 0).toFixed(3)} m`
}
