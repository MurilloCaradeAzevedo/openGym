// Leafy's mark: the leaf of resources/icon.svg (two arcs of one radius), in the current colour.
export const LEAF_PATH = 'M133 379A205 205 0 0 1 379 133A205 205 0 0 1 133 379Z'

export default function LeafMark({ size = 54, style }) {
  return <svg width={size} height={size} viewBox="133 133 246 246" aria-hidden="true" style={style}>
    <path d={LEAF_PATH} fill="currentColor" />
  </svg>
}
