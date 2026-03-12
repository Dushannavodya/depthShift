<template>
  <aside v-if="visible" class="debug-overlay">
    <div><span>Status</span><strong>{{ status }}</strong></div>
    <div><span>Head X</span><strong>{{ format(head.headX) }}</strong></div>
    <div><span>Head Y</span><strong>{{ format(head.headY) }}</strong></div>
    <div><span>Head Z</span><strong>{{ format(head.headZ) }}</strong></div>
    <div><span>Raw X</span><strong>{{ format(head.rawHeadX) }}</strong></div>
    <div><span>Raw Y</span><strong>{{ format(head.rawHeadY) }}</strong></div>
    <div><span>Raw Z</span><strong>{{ format(head.rawHeadZ) }}</strong></div>
    <div><span>Frustum L</span><strong>{{ formatFrustum(frustum.left) }}</strong></div>
    <div><span>Frustum R</span><strong>{{ formatFrustum(frustum.right) }}</strong></div>
    <div><span>Frustum T</span><strong>{{ formatFrustum(frustum.top) }}</strong></div>
    <div><span>Frustum B</span><strong>{{ formatFrustum(frustum.bottom) }}</strong></div>
    <div><span>FPS</span><strong>{{ head.fps.toFixed(1) }}</strong></div>
    <div><span>Model</span><strong>{{ modelLabel }}</strong></div>
  </aside>
</template>

<script setup>
const props = defineProps({
  visible: Boolean,
  status: {
    type: String,
    default: 'idle'
  },
  head: {
    type: Object,
    required: true
  },
  frustum: {
    type: Object,
    required: true
  },
  modelLabel: {
    type: String,
    default: 'Primitive Demo'
  }
})

function format(value) {
  return `${Number(value || 0).toFixed(3)} m`
}

function formatFrustum(value) {
  return Number(value || 0).toFixed(4)
}
</script>

<style scoped>
.debug-overlay {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 8;
  min-width: 220px;
  display: grid;
  gap: 0.45rem;
  padding: 0.9rem;
  border: 1px solid rgba(123, 198, 255, 0.22);
  border-radius: 16px;
  background: rgba(6, 17, 28, 0.74);
  backdrop-filter: blur(18px);
  font-size: 0.8rem;
}

.debug-overlay div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.debug-overlay span {
  color: rgba(228, 239, 250, 0.68);
}

.debug-overlay strong {
  color: #f2f7fb;
  font-weight: 600;
}

@media (max-width: 900px) {
  .debug-overlay {
    right: auto;
    left: 1rem;
    top: auto;
    bottom: 1rem;
  }
}
</style>
