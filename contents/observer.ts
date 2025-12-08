import type { Injector } from "./injector"
import type { Logger } from "./logger"

export class Observer {
  private observer: MutationObserver | null = null

  constructor(
    private readonly injector: Injector,
    private readonly log: Logger
  ) {}

  public start(target: HTMLElement): void {
    if (this.observer) {
      return
    }

    this.log("Starting mutation observer")
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            this.injector.process(node)
          }
        })
      })
    })

    this.observer.observe(target, {
      childList: true,
      subtree: true
    })
  }

  public stop(): void {
    this.observer?.disconnect()
    this.observer = null
  }
}
