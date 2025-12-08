export function parseNode(html: string) {
  const tpl = document.createElement("template")
  tpl.innerHTML = html.trim()
  const node = tpl.content.firstElementChild

  if (!node) throw new Error("Failed to parse node")

  return node
}

export function parseElement(html: string) {
  const node = parseNode(html)

  if (!(node instanceof HTMLElement))
    throw new Error("Parsed node is not an HTMLElement")

  return node
}

export function assertElement(node?: Node | null) {
  if (!node) throw new Error("Node is null")
  if (!(node instanceof HTMLElement || node instanceof SVGElement)) {
    console.log(node)
    throw new Error("Node is not an HTMLElement")
  }

  return node as HTMLElement
}
