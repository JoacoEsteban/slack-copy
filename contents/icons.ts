import { IconsStatic, type IconName, type Icons } from "~assets/icons-static"

import { assertElement, parseNode, setAttributes } from "./element"
import { html } from "./lib/template"

export class Icon<T extends IconName> {
  readonly icon: Icons[T]
  readonly node: HTMLElement

  constructor(
    readonly iconName: T,
    attributes: Map<string, string>
  ) {
    this.icon = IconsStatic.icons[iconName]
    this.node = assertElement(parseNode(this.getSvg()))
    setAttributes(this.node, attributes)
  }

  getSvg() {
    if ("svg" in this.icon) {
      return this.icon.svg
    }

    return html`<svg
      data-qa="${this.iconName}"
      aria-hidden="true"
      viewBox="0 0 20 20">
      ${this.icon.body}
    </svg>`
  }
}

export class CopyIcon {
  private filled = false
  readonly svgHollow
  readonly svgFilled
  readonly svg

  constructor(attributes: Map<string, string>) {
    this.svgHollow = new Icon("copy", attributes).node
    this.svgFilled = new Icon("copy-filled", attributes).node
    this.svg = this.svgHollow.cloneNode(true) as HTMLElement

    this.updateContent()
  }

  setFilled(filled: boolean) {
    if (filled !== this.filled) {
      this.filled = filled
      this.updateContent()
    }
  }

  updateContent() {
    this.svg.replaceChildren(
      ...(this.filled ? this.svgFilled.children : this.svgHollow.children)
    )
  }
}
