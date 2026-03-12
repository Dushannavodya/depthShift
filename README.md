# DepthShift

A Vue 3 + Vite + Three.js demo of head-coupled perspective using webcam face tracking and a true off-axis projection matrix.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Model Sources

Use the controls panel to switch between:

- Primitive demo mesh
- Local sample file at `/models/air-jordan.gltf`
- External GLB URL

You can also paste any reachable `.glb` or `.gltf` URL into the model field. Invalid URLs fall back to the primitive demo.

## Calibration

The off-axis camera assumes the display is a physical rectangle centered at world origin on the `z = 0` plane.

- `screen width` and `screen height` are the physical display dimensions in meters
- `default viewing distance` is the assumed face-to-screen distance used to bootstrap depth estimation
- `smoothing` lerps noisy tracking data before the frustum is rebuilt

## Limitations

- Face depth is estimated from relative landmark spacing, so it is approximate.
- The effect is desktop-first and expects one viewer.
- MediaPipe model and wasm assets are loaded from public CDNs at runtime.
