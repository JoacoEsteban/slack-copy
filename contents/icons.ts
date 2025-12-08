import { IconsStatic, type IconName, type Icons } from "~assets/icons-static"

import { parseNode } from "./element"

export class Icon<T extends IconName> {
  readonly icon: Icons[T]
  constructor(readonly iconName: T) {
    this.icon = IconsStatic.icons[iconName]
  }

  getSvg() {
    return `<svg
        data-i0m="true"
        data-qa="add-reaction"
        aria-hidden="true"
        viewBox="0 0 20 20"
        class=""
    >
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
