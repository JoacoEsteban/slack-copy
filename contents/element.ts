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

export function getAttributes(node: Element) {
  return node.getAttributeNames().reduce((acc, name) => {
    acc.set(name, node.getAttribute(name) || "")
    return acc
  }, new Map<string, string>())
}

export function setAttributes(
  node: HTMLElement,
  attributes: Map<string, string>
) {
  attributes.forEach((value, name) => {
    if (!node.hasAttribute(name)) node.setAttribute(name, value)
  })
  return node
}
