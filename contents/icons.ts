import { IconsStatic, type IconName, type Icons } from "~assets/icons-static"

import { assertElement, parseNode } from "./element"
import { html } from "./lib/template"

export class Icon<T extends IconName> {
  readonly icon: Icons[T]
  readonly node: HTMLElement

  constructor(readonly iconName: T) {
    this.icon = IconsStatic.icons[iconName]
    this.node = assertElement(parseNode(this.getSvg()))
  }

  getSvg() {
    if ("svg" in this.icon) {
      return this.icon.svg
    }

    return html`<svg
      data-i0m="true"
      data-qa="${this.iconName}"
      aria-hidden="true"
      viewBox="0 0 20 20"
      class="">
      ${this.icon.body}
    </svg>`
  }
}

export class CopyIcon {
  private filled = false
  readonly svgHollow = parseNode(new Icon("copy").getSvg())
  readonly svgFilled = parseNode(new Icon("copy-filled").getSvg())
  readonly svg = this.svgHollow.cloneNode(true) as HTMLElement

  constructor() {
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
