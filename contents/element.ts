export function parseNode(html: string) {
  const tpl = document.createElement("template")
  tpl.innerHTML = html.trim()
  const node = tpl.content.firstElementChild

  if (!node) throw new Error("Failed to parse node")

  return node
}
