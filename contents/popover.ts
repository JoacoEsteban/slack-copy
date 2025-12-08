import { assertElement, parseElement } from "./element"
import { onNodeRemoved } from "./lib/on-node-removed"
import { html } from "./lib/template"

const popoverHtml = html`
  <div class="ReactModalPortal">
    <div
      class="ReactModal__Overlay ReactModal__Overlay--after-open c-popover c-popover--z_above_fs c-popover--fade c-popover--no-pointer"
      style="animation-duration: 80ms">
      <div
        id="sk-tooltip-slack-copy"
        class="ReactModal__Content ReactModal__Content--after-open popover c-popover__content"
        tabindex="-1"
        role="tooltip"
        data-qa="tooltip-popover"
        style="
          position: absolute;
          outline: none;
          transition-duration: 80ms;
        ">
        <div role="presentation">
          <div
            class="c-tooltip__tip c-tooltip__tip--top c-tooltip__tip--small"
            data-qa="tooltip-tip"
            data-sk="tooltip">
            <span data-qa="tooltip-text">Copy</span>
            <div
              class="c-tooltip__tip__arrow"
              data-qa="tooltip-tip-arrow"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
`

export class Popover {
  private popoverRoot = parseElement(popoverHtml)
  private popoverContainer = assertElement(this.popoverRoot.children[0])
  private popoverElement = assertElement(this.popoverContainer.children[0])
  private popoverText = assertElement(
    this.popoverElement.querySelector("[data-qa=tooltip-text]")
  )
  private visible = false

  constructor(
    readonly element: HTMLElement,
    text = "Copy"
  ) {
    this.setText(text)
    element.addEventListener("mouseenter", this.show.bind(this))
    element.addEventListener("mouseleave", this.hide.bind(this))
  }

  show() {
    if (!this.visible) {
      document.body.append(this.popoverRoot)
      onNodeRemoved(this.element, () => this.hide())
      this.updatePosition()
      this.visible = true
    }
  }

  hide() {
    if (this.visible) {
      this.popoverRoot.remove()
      this.visible = false
    }
  }

  private updatePosition() {
    const bounds = this.element.getBoundingClientRect()
    const popoverBounds = this.popoverElement!.getBoundingClientRect()
    this.popoverElement.style.left = `${bounds.left - (popoverBounds.width / 2 - bounds.width / 2)}px`
    this.popoverElement.style.top = `${bounds.top - popoverBounds.height}px`
  }

  setText(text: string) {
    this.popoverText.textContent = text
    this.updatePosition()
  }
}
