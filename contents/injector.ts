import { COPY_BUTTON_MARK, CopyButton } from "./copy-button"
import type { Logger } from "./logger"

const ACTION_CONTAINER_SELECTORS = [
  '[data-qa="message_actions"]:not([data-slack-copy-button])',
  '[data-qa="message_actions_container"]:not([data-slack-copy-button])',
  '[data-qa="message_actions_bar"]:not([data-slack-copy-button])',
  ".p-message_actions:not([data-slack-copy-button])",
  ".c-message_actions:not([data-slack-copy-button])",
  ".c-message_actions__group:not([data-slack-copy-button])"
]

export class Injector {
  constructor(
    private readonly log: Logger,
    private readonly selectors: string[] = ACTION_CONTAINER_SELECTORS
  ) {}

  public scan(root: ParentNode & DocumentOrShadowRoot = document): void {
    this.log("Scanning for existing action containers")
    this.selectors.forEach((selector) => {
      root.querySelectorAll<HTMLElement>(selector).forEach((node) => {
        this.ensureButton(node)
      })
    })
  }

  public process(element: HTMLElement): void {
    this.selectors.forEach((selector) => {
      if (element.matches(selector)) {
        this.ensureButton(element)
      }

      element.querySelectorAll<HTMLElement>(selector).forEach((node) => {
        this.ensureButton(node)
      })
    })
  }

  private ensureButton(container: HTMLElement): void {
    if (container.getAttribute(COPY_BUTTON_MARK)) {
      return
    }

    const copyButton = new CopyButton(container, this.log)
    container.setAttribute(COPY_BUTTON_MARK, "true")
    container.prepend(copyButton.element)
  }
}
