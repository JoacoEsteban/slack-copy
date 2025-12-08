import { MessageCopier } from "./copy"
import { CopyIcon, Icon } from "./icons"
import type { Logger } from "./logger"
import { Popover } from "./popover"

export class CopyButton {
  public readonly element: HTMLButtonElement
  public readonly icon = new CopyIcon()
  public readonly loadingIcon = new Icon("loading-spinner")
  private readonly copier: MessageCopier
  private readonly popover: Popover

  constructor(
    private readonly container: HTMLElement,
    private readonly log: Logger
  ) {
    const button = this.createElement()
    this.popover = new Popover(button, "Copy")
    this.element = button
    this.copier = new MessageCopier(this.log)
    this.element.addEventListener("click", () => this.handleClick())
  }

  private createElement() {
    const button = document.createElement("button")
    button.type = "button"
    button.className =
      "c-button-unstyled c-icon_button c-icon_button--size_small c-message_actions__button c-icon_button--default"
    button.appendChild(this.icon.svg)
    button.appendChild(this.loadingIcon.node)
    this.loadingIcon.node.style.display = "none"
    return button
  }

  private async handleClick(): Promise<void> {
    const messageRoot = this.findMessageRoot(this.container)
    if (!messageRoot) {
      this.log("No message root found", this.container)
      this.popover.setText(
        "Uh oh, something went wrong trying to copy this message."
      )
      return
    }

    this.icon.svg.style.display = "none"
    this.loadingIcon.node.style.display = ""

    const result = await this.copier.copy(messageRoot)
    this.log("Copy attempt finished", result)

    this.icon.svg.style.display = ""
    this.loadingIcon.node.style.display = "none"

    if (result.success) {
      this.popover.setText("Copied to clipboard")
      this.icon.setFilled(true)
    } else {
      this.popover.setText(
        "There was an error when copying this message, please try again"
      )
    }
  }

  private findMessageRoot(start: HTMLElement): HTMLElement | null {
    return (
      start.closest<HTMLElement>(
        ".p-message_gallery_image_file.c-file_gallery_image_file"
      ) ??
      start.closest<HTMLElement>('[data-qa="message_container"]') ??
      start.closest<HTMLElement>('[role="listitem"]') ??
      start.closest<HTMLElement>(".c-virtual_list__item")
    )
  }
}
