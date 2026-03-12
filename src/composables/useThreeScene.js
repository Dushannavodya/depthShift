import { onBeforeUnmount, shallowRef, watch } from 'vue'
import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clamp } from '../utils/calibration'

function disposeMaterial(material) {
  if (!material) {
    return
  }

  const materials = Array.isArray(material) ? material : [material]

  for (const entry of materials) {
    for (const key of Object.keys(entry)) {
      const value = entry[key]
      if (value && typeof value === 'object' && 'minFilter' in value) {
        value.dispose()
      }
    }
    entry.dispose()
  }
}

function disposeObject3D(object) {
  object.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose()
    }

    if (child.material) {
      disposeMaterial(child.material)
    }
  })
}

function createLineMaterial(color, opacity) {
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false
  })
  material.toneMapped = false
  return material
}

function createRectLines(width, height, z, material) {
  const hw = width * 0.5
  const hh = height * 0.5
  const points = [
    new THREE.Vector3(-hw, hh, z), new THREE.Vector3(hw, hh, z),
    new THREE.Vector3(hw, hh, z), new THREE.Vector3(hw, -hh, z),
    new THREE.Vector3(hw, -hh, z), new THREE.Vector3(-hw, -hh, z),
    new THREE.Vector3(-hw, -hh, z), new THREE.Vector3(-hw, hh, z)
  ]

  return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), material)
}

function createPlaneGrid(width, height, divisionsX, divisionsY, material, plane) {
  const halfWidth = width * 0.5
  const halfHeight = height * 0.5
  const points = []

  for (let xIndex = 0; xIndex <= divisionsX; xIndex += 1) {
    const x = -halfWidth + (width * xIndex) / divisionsX
    if (plane === 'xy') {
      points.push(new THREE.Vector3(x, -halfHeight, 0), new THREE.Vector3(x, halfHeight, 0))
    } else if (plane === 'xz') {
      points.push(new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, 0, -height))
    } else {
      points.push(new THREE.Vector3(0, x, 0), new THREE.Vector3(0, x, -height))
    }
  }

  for (let yIndex = 0; yIndex <= divisionsY; yIndex += 1) {
    if (plane === 'xy') {
      const y = -halfHeight + (height * yIndex) / divisionsY
      points.push(new THREE.Vector3(-halfWidth, y, 0), new THREE.Vector3(halfWidth, y, 0))
    } else if (plane === 'xz') {
      const z = -(height * yIndex) / divisionsY
      points.push(new THREE.Vector3(-halfWidth, 0, z), new THREE.Vector3(halfWidth, 0, z))
    } else {
      const z = -(height * yIndex) / divisionsY
      points.push(new THREE.Vector3(0, -halfWidth, z), new THREE.Vector3(0, halfWidth, z))
    }
  }

  return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), material)
}

function createDepthLines(width, height, depth, material) {
  const hw = width * 0.5
  const hh = height * 0.5
  const points = [
    new THREE.Vector3(-hw, hh, 0), new THREE.Vector3(-hw, hh, -depth),
    new THREE.Vector3(hw, hh, 0), new THREE.Vector3(hw, hh, -depth),
    new THREE.Vector3(hw, -hh, 0), new THREE.Vector3(hw, -hh, -depth),
    new THREE.Vector3(-hw, -hh, 0), new THREE.Vector3(-hw, -hh, -depth)
  ]

  return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), material)
}

function createScreenGlow(width, height) {
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 1.01, height * 1.01),
    new THREE.MeshBasicMaterial({
      color: '#ffbb73',
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  )
  glow.material.toneMapped = false
  glow.position.z = -0.002
  return glow
}

function createWireRoom(calibration) {
  const room = new THREE.Group()
  const width = calibration.screenWidth
  const height = calibration.screenHeight
  const depth = calibration.roomDepth
  const density = calibration.gridDensity
  const horizontalDivisions = clamp(Math.round(density * (width / height)), 6, 24)
  const verticalDivisions = clamp(Math.round(density), 4, 18)
  const depthDivisions = clamp(Math.round(density * (depth / Math.max(width, height)) * 0.9), 6, 22)

  const amber = '#ff9c42'
  const amberSoft = '#ffc97f'
  const amberGlow = '#ffe0b2'

  const frameMaterial = createLineMaterial(amber, 0.98)
  const frameGlowMaterial = createLineMaterial(amberGlow, 0.28)
  const edgeMaterial = createLineMaterial(amber, 0.66)
  const gridMaterial = createLineMaterial(amberSoft, 0.32)
  const sideGridMaterial = createLineMaterial(amberSoft, 0.26)
  const backGridMaterial = createLineMaterial(amberSoft, 0.42)

  room.add(createScreenGlow(width, height))
  room.add(createRectLines(width, height, 0, frameMaterial))

  const frontGlow = createRectLines(width * 1.006, height * 1.006, -0.003, frameGlowMaterial)
  room.add(frontGlow)

  const backFrame = createRectLines(width, height, -depth, edgeMaterial)
  room.add(backFrame)

  const depthLines = createDepthLines(width, height, depth, edgeMaterial)
  room.add(depthLines)

  const roomEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, depth)),
    createLineMaterial(amberGlow, 0.18)
  )
  roomEdges.position.z = -depth * 0.5
  room.add(roomEdges)

  const floorGrid = createPlaneGrid(width, depth, horizontalDivisions, depthDivisions, gridMaterial, 'xz')
  floorGrid.position.y = -height * 0.5
  room.add(floorGrid)

  const ceilingGrid = createPlaneGrid(width, depth, horizontalDivisions, depthDivisions, sideGridMaterial, 'xz')
  ceilingGrid.position.y = height * 0.5
  room.add(ceilingGrid)

  const backWallGrid = createPlaneGrid(width, height, horizontalDivisions, verticalDivisions, backGridMaterial, 'xy')
  backWallGrid.position.z = -depth
  room.add(backWallGrid)

  const leftWallGrid = createPlaneGrid(height, depth, verticalDivisions, depthDivisions, sideGridMaterial, 'yz')
  leftWallGrid.position.x = -width * 0.5
  room.add(leftWallGrid)

  const rightWallGrid = createPlaneGrid(height, depth, verticalDivisions, depthDivisions, sideGridMaterial, 'yz')
  rightWallGrid.position.x = width * 0.5
  room.add(rightWallGrid)

  room.userData.size = { width, height, depth }
  return room
}

function createPrimitiveDemo(calibration) {
  const group = new THREE.Group()
  const core = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.13, 0.036, 220, 28),
    new THREE.MeshStandardMaterial({
      color: '#f6e8d7',
      metalness: 0.22,
      roughness: 0.28,
      emissive: '#15304c',
      emissiveIntensity: 0.14
    })
  )
  const orbit = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.006, 20, 96),
    new THREE.MeshBasicMaterial({
      color: '#ffb15b',
      transparent: true,
      opacity: 0.58
    })
  )
  orbit.rotation.x = Math.PI * 0.5
  orbit.material.toneMapped = false

  const halo = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.28, 1),
    new THREE.MeshBasicMaterial({
      color: '#7bc6ff',
      wireframe: true,
      transparent: true,
      opacity: 0.14
    })
  )
  halo.material.toneMapped = false

  group.add(core)
  group.add(orbit)
  group.add(halo)
  group.position.z = -(calibration.objectForwardOffset - calibration.popOutAmount * 0.6)
  group.scale.setScalar(calibration.objectScale)
  group.userData.isDemoPrimitive = true
  group.userData.basePosition = group.position.clone()
  return group
}

function fitModelContainer(container, calibration) {
  container.position.set(0, 0, 0)
  container.scale.set(1, 1, 1)
  container.rotation.set(0, 0, 0)
  container.updateMatrixWorld(true)

  const box = new THREE.Box3().setFromObject(container)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxAxis = Math.max(size.x, size.y, size.z) || 1
  const targetSize = Math.min(calibration.screenWidth, calibration.screenHeight) * 1.22 * calibration.objectScale
  const scale = targetSize / maxAxis
  const frontBias = calibration.objectForwardOffset - calibration.popOutAmount * 0.45

  container.scale.setScalar(scale)
  container.position.set(
    -center.x * scale,
    -center.y * scale - size.y * scale * 0.025,
    -frontBias - center.z * scale
  )
  container.userData.basePosition = container.position.clone()
  container.userData.baseRotation = container.rotation.clone()
  container.updateMatrixWorld(true)
}

function createModelContainer(root, calibration) {
  const container = new THREE.Group()
  container.add(root)
  fitModelContainer(container, calibration)
  return container
}

export function useThreeScene(containerRef, settings, modelSourceRef, wireframeEnabledRef) {
  const renderer = shallowRef(null)
  const scene = shallowRef(null)
  const camera = shallowRef(null)
  const activeModel = shallowRef(null)
  const modelError = shallowRef('')

  const loader = new GLTFLoader()
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
  loader.setDRACOLoader(dracoLoader)
  const clock = new THREE.Clock()
  const animationMixers = []
  let animationFrame = 0
  let roomGroup = null
  let resizeObserver = null
  let latestLoadToken = 0

  function clearMixers() {
    for (const mixer of animationMixers.splice(0)) {
      mixer.stopAllAction()
      mixer.uncacheRoot(mixer.getRoot())
    }
  }

  async function loadModel(source) {
    const loadToken = ++latestLoadToken
    modelError.value = ''
    clearMixers()

    if (activeModel.value) {
      scene.value.remove(activeModel.value)
      disposeObject3D(activeModel.value)
      activeModel.value = null
    }

    if (!source) {
      activeModel.value = createPrimitiveDemo(settings)
      scene.value.add(activeModel.value)
      return
    }

    try {
      const gltf = await loader.loadAsync(source)
      if (loadToken !== latestLoadToken) {
        disposeObject3D(gltf.scene || gltf.scenes?.[0] || new THREE.Group())
        return
      }

      const root = gltf.scene || gltf.scenes?.[0]
      if (!root) {
        throw new Error('Model did not include a scene.')
      }

      for (const clip of gltf.animations || []) {
        const mixer = new THREE.AnimationMixer(root)
        mixer.clipAction(clip).play()
        animationMixers.push(mixer)
      }

      activeModel.value = createModelContainer(root, settings)
      scene.value.add(activeModel.value)
    } catch (err) {
      modelError.value = err?.message || 'Failed to load model.'
      activeModel.value = createPrimitiveDemo(settings)
      scene.value.add(activeModel.value)
    }
  }

  function updateRoom() {
    if (!scene.value) {
      return
    }

    if (roomGroup) {
      scene.value.remove(roomGroup)
      disposeObject3D(roomGroup)
      roomGroup = null
    }

    if (wireframeEnabledRef?.value !== false) {
      roomGroup = createWireRoom(settings)
      scene.value.add(roomGroup)
    }
  }

  function resize() {
    const container = containerRef.value
    if (!container || !renderer.value || !camera.value) {
      return
    }

    const width = container.clientWidth
    const height = container.clientHeight
    renderer.value.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.value.setSize(width, height, false)
    camera.value.aspect = width / Math.max(height, 1)
  }

  function updateModelMotion(delta, viewer, autoRotateEnabled) {
    if (!activeModel.value) {
      return
    }

    const model = activeModel.value
    const basePosition = model.userData.basePosition || new THREE.Vector3(0, 0, -settings.objectForwardOffset)
    const autoYaw = autoRotateEnabled ? clock.elapsedTime * 0.28 : 0

    if (model.userData?.isDemoPrimitive) {
      model.rotation.y += (autoRotateEnabled ? 0.55 : 0.22) * delta
      model.rotation.x = THREE.MathUtils.lerp(model.rotation.x, Math.sin(clock.elapsedTime * 0.9) * 0.03, 0.06)
      model.rotation.z = THREE.MathUtils.lerp(model.rotation.z, Math.cos(clock.elapsedTime * 0.7) * 0.02, 0.06)
      model.position.x = THREE.MathUtils.lerp(model.position.x, basePosition.x, 0.08)
      model.position.y = THREE.MathUtils.lerp(model.position.y, basePosition.y, 0.08)
      model.position.z = basePosition.z
      return
    }

    model.rotation.y = THREE.MathUtils.lerp(model.rotation.y, autoYaw, 0.08)
    model.rotation.x = THREE.MathUtils.lerp(model.rotation.x, 0, 0.08)
    model.position.x = THREE.MathUtils.lerp(model.position.x, basePosition.x, 0.08)
    model.position.y = THREE.MathUtils.lerp(model.position.y, basePosition.y, 0.08)
    model.position.z = basePosition.z
  }

  function startRenderLoop(onFrame) {
    const renderFrame = () => {
      animationFrame = requestAnimationFrame(renderFrame)
      const delta = clock.getDelta()

      for (const mixer of animationMixers) {
        mixer.update(delta)
      }

      onFrame(delta)
      renderer.value.render(scene.value, camera.value)
    }

    renderFrame()
  }

  function init(onFrame) {
    const container = containerRef.value
    if (!container) {
      return
    }

    scene.value = new THREE.Scene()
    scene.value.background = new THREE.Color('#07131d')
    scene.value.fog = new THREE.Fog('#07131d', settings.roomDepth + 2.5, settings.roomDepth + 16)

    camera.value = new THREE.PerspectiveCamera(50, 1, 0.025, 120)

    renderer.value = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    })
    renderer.value.outputColorSpace = THREE.SRGBColorSpace
    renderer.value.toneMapping = THREE.ACESFilmicToneMapping
    renderer.value.toneMappingExposure = 1.18
    container.appendChild(renderer.value.domElement)

    const ambient = new THREE.HemisphereLight('#dbeeff', '#102338', 1.08)
    scene.value.add(ambient)

    const key = new THREE.DirectionalLight('#fff4da', 2.2)
    key.position.set(0.65, 1.1, 1.35)
    scene.value.add(key)

    const fill = new THREE.PointLight('#5baeff', 12, 5.5, 2)
    fill.position.set(-0.35, 0.15, 0.55)
    scene.value.add(fill)

    const rim = new THREE.PointLight('#ffb260', 10, 5.5, 2)
    rim.position.set(0, -0.1, -settings.roomDepth * 0.55)
    scene.value.add(rim)

    updateRoom()
    loadModel(modelSourceRef.value)
    resize()

    resizeObserver = new ResizeObserver(() => resize())
    resizeObserver.observe(container)
    window.addEventListener('resize', resize)

    startRenderLoop(onFrame)
  }

  function dispose() {
    cancelAnimationFrame(animationFrame)
    window.removeEventListener('resize', resize)
    resizeObserver?.disconnect()
    latestLoadToken += 1

    if (activeModel.value && scene.value) {
      scene.value.remove(activeModel.value)
      disposeObject3D(activeModel.value)
      activeModel.value = null
    }

    if (roomGroup && scene.value) {
      scene.value.remove(roomGroup)
      disposeObject3D(roomGroup)
      roomGroup = null
    }

    clearMixers()

    if (renderer.value) {
      renderer.value.dispose()
      renderer.value.domElement.remove()
      renderer.value = null
    }

    scene.value = null
    camera.value = null
  }

  watch(
    () => modelSourceRef.value,
    (source) => {
      if (scene.value) {
        loadModel(source)
      }
    }
  )

  watch(
    () => [settings.screenWidth, settings.screenHeight, settings.roomDepth, settings.gridDensity],
    () => {
      updateRoom()
      if (scene.value) {
        scene.value.fog = new THREE.Fog('#07131d', settings.roomDepth + 2.5, settings.roomDepth + 16)
      }
      if (activeModel.value && !activeModel.value.userData?.isDemoPrimitive) {
        fitModelContainer(activeModel.value, settings)
      }
      if (activeModel.value?.userData?.isDemoPrimitive) {
        activeModel.value.position.z = -(settings.objectForwardOffset - settings.popOutAmount * 0.6)
        activeModel.value.scale.setScalar(settings.objectScale)
        activeModel.value.userData.basePosition = activeModel.value.position.clone()
      }
    }
  )

  watch(
    () => wireframeEnabledRef?.value,
    () => {
      updateRoom()
    }
  )

  watch(
    () => [settings.objectForwardOffset, settings.objectScale, settings.popOutAmount],
    () => {
      if (!activeModel.value) {
        return
      }

      if (activeModel.value.userData?.isDemoPrimitive) {
        activeModel.value.position.z = -(settings.objectForwardOffset - settings.popOutAmount * 0.6)
        activeModel.value.scale.setScalar(settings.objectScale)
        activeModel.value.userData.basePosition = activeModel.value.position.clone()
        return
      }

      fitModelContainer(activeModel.value, settings)
    }
  )

  onBeforeUnmount(() => {
    dracoLoader.dispose()
    dispose()
  })

  return {
    activeModel,
    camera,
    dispose,
    init,
    modelError,
    renderer,
    resize,
    scene,
    updateModelMotion
  }
}
