export function onNodeRemoved(node: HTMLElement, cb: () => void) {
  if (!node.isConnected) {
    throw new Error("Node must be connected to the DOM")
  }

  const observer = new MutationObserver(() => {
    if (!node.isConnected) {
      observer.disconnect()
      cb()
    }
  })

  // Observe all parent hierarchy
  let current: Node | null = node
  while (current && current !== document) {
    const parent = current.parentNode as ParentNode | null
    if (!parent) break

    observer.observe(parent, { childList: true })
    current = parent
  }

  return () => observer.disconnect()
}
