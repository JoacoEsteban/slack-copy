import { CopyIcon } from "./icons"
import type { Logger } from "./logger"

const MESSAGE_TEXT_SELECTORS = [
  '[data-qa="message-text"]',
  '[data-qa="message_content"]',
  '[data-qa="message-body"]',
  ".c-message_kit__text",
  ".p-rich_text_section"
]

export const COPY_BUTTON_MARK = "data-slack-copy-button"

export class CopyButton {
  public readonly element: HTMLButtonElement
  public readonly icon = new CopyIcon()

  constructor(
    private readonly container: HTMLElement,
    private readonly log: Logger
  ) {
    const button = this.createElement()
    this.element = button
    this.element.addEventListener("click", (event) => this.handleClick(event))
  }

  private createElement() {
    const button = document.createElement("button")
    button.type = "button"
    button.className =
      "c-button-unstyled c-icon_button c-icon_button--size_small c-message_actions__button c-icon_button--default"
    button.appendChild(this.icon.svg)
    return button
  }

  private async handleClick(event: MouseEvent): Promise<void> {
    event.preventDefault()

    const messageText = this.extractMessageText(this.container)
    if (!messageText) {
      this.log("No text found for container", this.container)
      return
    }

    const success = await this.copyToClipboard(messageText)
    this.log("Copy attempt finished", { success, messageText })
    if (success) {
      this.icon.setFilled(true)
    }
  }

  private extractMessageText(container: HTMLElement): string | null {
    const messageRoot = this.findMessageRoot(container)
    if (!messageRoot) {
      this.log("No message root", container)
      return null
    }

    for (const selector of MESSAGE_TEXT_SELECTORS) {
      const textNode = messageRoot.querySelector<HTMLElement>(selector)
      if (textNode) {
        const text = textNode.innerText.trim()
        if (text) {
          this.log("Selector matched text", selector, text)
          return text
        }
      }
    }

    const fallbackText = messageRoot.innerText.trim()
    this.log("Falling back to innerText", fallbackText)
    return fallbackText || null
  }

  private findMessageRoot(start: HTMLElement): HTMLElement | null {
    return (
      start.closest<HTMLElement>('[data-qa="message_container"]') ??
      start.closest<HTMLElement>('[role="listitem"]') ??
      start.closest<HTMLElement>(".c-virtual_list__item")
    )
  }

  private async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      this.log("navigator.clipboard.writeText succeeded")
      return true
    } catch (error) {
      this.log("navigator.clipboard.writeText failed, falling back", error)
      return this.legacyCopy(text)
    }
  }

  private legacyCopy(text: string): boolean {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()

    let success = false
    try {
      success = document.execCommand("copy")
    } catch {
      success = false
    }

    textarea.remove()
    return success
  }
}
