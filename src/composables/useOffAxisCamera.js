import { ref } from 'vue'
import * as THREE from 'three'
import { clamp } from '../utils/calibration'

const BASE_NEAR = 0.025
const BASE_FAR = 120

export function useOffAxisCamera() {
  const fallbackEye = new THREE.Vector3(0, 0, 0.62)
  const eye = new THREE.Vector3()
  const tunedEye = new THREE.Vector3()
  const projectionMatrix = new THREE.Matrix4()
  const frustumDebug = ref({
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    near: BASE_NEAR,
    far: BASE_FAR,
    eyeX: fallbackEye.x,
    eyeY: fallbackEye.y,
    eyeZ: fallbackEye.z
  })

  function updateOffAxisCamera(camera, viewerPosition, calibration) {
    eye.copy(viewerPosition || fallbackEye)

    tunedEye.x = clamp(
      eye.x * calibration.horizontalSensitivity * calibration.frustumSensitivity,
      -calibration.maxHeadX,
      calibration.maxHeadX
    )
    tunedEye.y = clamp(
      eye.y * calibration.verticalSensitivity * calibration.frustumSensitivity,
      -calibration.maxHeadY,
      calibration.maxHeadY
    )

    const zOffset = (eye.z - calibration.defaultViewingDistance) * calibration.depthSensitivity
    tunedEye.z = clamp(
      calibration.defaultViewingDistance + zOffset,
      calibration.minHeadZ,
      calibration.maxHeadZ
    )

    const screenLeft = -calibration.screenWidth * 0.5
    const screenRight = calibration.screenWidth * 0.5
    const screenBottom = -calibration.screenHeight * 0.5
    const screenTop = calibration.screenHeight * 0.5
    const near = BASE_NEAR
    const far = Math.max(BASE_FAR, tunedEye.z + calibration.roomDepth + 20)

    const left = near * (screenLeft - tunedEye.x) / tunedEye.z
    const right = near * (screenRight - tunedEye.x) / tunedEye.z
    const bottom = near * (screenBottom - tunedEye.y) / tunedEye.z
    const top = near * (screenTop - tunedEye.y) / tunedEye.z

    projectionMatrix.makePerspective(left, right, top, bottom, near, far)

    camera.position.copy(tunedEye)
    camera.rotation.set(0, 0, 0)
    camera.near = near
    camera.far = far
    camera.projectionMatrix.copy(projectionMatrix)
    camera.projectionMatrixInverse.copy(projectionMatrix).invert()
    camera.matrixWorld.compose(camera.position, camera.quaternion, camera.scale)
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
    camera.updateWorldMatrix(true, false)

    frustumDebug.value = {
      left,
      right,
      top,
      bottom,
      near,
      far,
      eyeX: tunedEye.x,
      eyeY: tunedEye.y,
      eyeZ: tunedEye.z
    }
  }

  return {
    fallbackEye,
    frustumDebug,
    updateOffAxisCamera
  }
}
