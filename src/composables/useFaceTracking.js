import { computed, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'
import { clamp, lerp } from '../utils/calibration'

const LEFT_EYE_INDEX = 33
const RIGHT_EYE_INDEX = 263
const NOSE_INDEX = 1
const FACE_LANDMARKER_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.15/wasm'

export function useFaceTracking(settings) {
  const videoElement = ref(null)
  const latestLandmarks = ref([])
  const status = ref('idle')
  const error = ref('')
  const isRunning = ref(false)
  const debug = ref({
    headX: 0,
    headY: 0,
    headZ: settings.defaultViewingDistance,
    rawHeadX: 0,
    rawHeadY: 0,
    rawHeadZ: settings.defaultViewingDistance,
    fps: 0,
    baselineEyeDistance: 0,
    eyeDistancePx: 0
  })

  const smoothedHead = new THREE.Vector3(0, 0, settings.defaultViewingDistance)
  const targetHead = new THREE.Vector3(0, 0, settings.defaultViewingDistance)

  let stream = null
  let faceLandmarker = null
  let visionModule = null
  let rafId = 0
  let baselineEyeDistance = 0
  let baselineSamples = 0
  let lastVideoTime = -1
  let lastFpsSample = performance.now()
  let frameCounter = 0

  const isReady = computed(() => status.value === 'tracking')

  async function ensureLandmarker() {
    if (faceLandmarker) {
      return faceLandmarker
    }

    status.value = 'loading'

    visionModule = visionModule || await import('@mediapipe/tasks-vision')
    const filesetResolver = await visionModule.FilesetResolver.forVisionTasks(FACE_LANDMARKER_WASM)
    faceLandmarker = await visionModule.FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false
    })

    return faceLandmarker
  }

  async function start() {
    if (isRunning.value) {
      return
    }

    error.value = ''

    try {
      await ensureLandmarker()
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })
    } catch (err) {
      status.value = 'error'
      error.value = err?.message || 'Unable to access webcam or load face tracker.'
      stop()
      return
    }

    const video = videoElement.value
    if (!video) {
      status.value = 'error'
      error.value = 'Tracking video element is not available.'
      stop()
      return
    }

    video.srcObject = stream
    video.playsInline = true
    video.muted = true
    await video.play()

    baselineEyeDistance = 0
    baselineSamples = 0
    lastVideoTime = -1
    lastFpsSample = performance.now()
    frameCounter = 0
    latestLandmarks.value = []
    status.value = 'tracking'
    isRunning.value = true
    loop()
  }

  function stop() {
    isRunning.value = false
    cancelAnimationFrame(rafId)
    latestLandmarks.value = []

    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop()
      }
      stream = null
    }

    const video = videoElement.value
    if (video) {
      video.pause()
      video.srcObject = null
    }

    if (status.value !== 'error') {
      status.value = 'idle'
    }
  }

  function updateHeadFromLandmarks(landmarks, video) {
    const leftEye = landmarks[LEFT_EYE_INDEX]
    const rightEye = landmarks[RIGHT_EYE_INDEX]
    const nose = landmarks[NOSE_INDEX]

    if (!leftEye || !rightEye || !nose) {
      return
    }

    const eyeCenterX = (leftEye.x + rightEye.x) * 0.5
    const eyeCenterY = (leftEye.y + rightEye.y) * 0.5
    const eyeDistanceNormalized = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y)
    const eyeDistancePx = eyeDistanceNormalized * video.videoWidth

    if (eyeDistancePx > 0) {
      if (baselineSamples < 30) {
        baselineEyeDistance = lerp(baselineEyeDistance || eyeDistancePx, eyeDistancePx, 0.12)
        baselineSamples += 1
      } else if (baselineEyeDistance === 0) {
        baselineEyeDistance = eyeDistancePx
      }
    }

    const baseline = baselineEyeDistance || eyeDistancePx || 1
    const depthFromEyes = settings.defaultViewingDistance * (baseline / Math.max(eyeDistancePx, 1))
    const zFromNose = settings.defaultViewingDistance + nose.z * 0.35
    const targetDepth = clamp(
      lerp(depthFromEyes, zFromNose, 0.35),
      settings.minHeadZ,
      settings.maxHeadZ
    )
    const normalizedX = clamp((0.5 - eyeCenterX) * 2, -1, 1)
    const normalizedY = clamp((0.5 - eyeCenterY) * 2, -1, 1)
    const x = normalizedX * settings.maxHeadX * 0.95
    const y = normalizedY * settings.maxHeadY * 0.95

    targetHead.set(
      clamp(x, -settings.maxHeadX, settings.maxHeadX),
      clamp(y, -settings.maxHeadY, settings.maxHeadY),
      targetDepth
    )

    const alpha = clamp(1 - settings.smoothing, 0.025, 0.45)
    smoothedHead.x = lerp(smoothedHead.x, targetHead.x, alpha)
    smoothedHead.y = lerp(smoothedHead.y, targetHead.y, alpha)
    smoothedHead.z = lerp(smoothedHead.z, targetHead.z, alpha)

    debug.value = {
      ...debug.value,
      headX: smoothedHead.x,
      headY: smoothedHead.y,
      headZ: smoothedHead.z,
      rawHeadX: targetHead.x,
      rawHeadY: targetHead.y,
      rawHeadZ: targetHead.z,
      baselineEyeDistance: baselineEyeDistance,
      eyeDistancePx
    }
  }

  function loop() {
    rafId = requestAnimationFrame(loop)

    const video = videoElement.value
    if (!video || !faceLandmarker || video.readyState < 2) {
      return
    }

    if (video.currentTime === lastVideoTime) {
      return
    }

    lastVideoTime = video.currentTime
    const now = performance.now()
    const result = faceLandmarker.detectForVideo(video, now)

    if (!result.faceLandmarks?.length) {
      status.value = isRunning.value ? 'searching' : 'idle'
      latestLandmarks.value = []
      return
    }

    if (status.value !== 'tracking') {
      status.value = 'tracking'
    }

    const landmarks = result.faceLandmarks[0]
    latestLandmarks.value = landmarks
    updateHeadFromLandmarks(landmarks, video)

    frameCounter += 1
    if (now - lastFpsSample >= 500) {
      debug.value = {
        ...debug.value,
        fps: (frameCounter * 1000) / (now - lastFpsSample)
      }
      lastFpsSample = now
      frameCounter = 0
    }
  }

  onBeforeUnmount(() => {
    stop()
    if (faceLandmarker) {
      faceLandmarker.close()
      faceLandmarker = null
    }
  })

  return {
    debug,
    error,
    isReady,
    isRunning,
    latestLandmarks,
    smoothedHead,
    start,
    status,
    stop,
    targetHead,
    videoElement
  }
}
