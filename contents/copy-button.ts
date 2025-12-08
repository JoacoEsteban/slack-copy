import {
  BehaviorSubject,
  distinctUntilChanged,
  of,
  switchMap,
  tap,
  timer
} from "rxjs"
import { match, P } from "ts-pattern"

import { MessageCopier, type CopyResult } from "./copy"
import { CopyIcon, Icon } from "./icons"
import { getResultMessage } from "./lib/messages"
import { noop } from "./lib/misc"
import type { Logger } from "./logger"
import { Popover } from "./popover"

export class CopyButton {
  public readonly element: HTMLButtonElement
  public readonly icon = new CopyIcon()
  public readonly loadingIcon = new Icon("loading-spinner")
  private readonly copier: MessageCopier
  private readonly popover: Popover
  private readonly copying$$ = new BehaviorSubject(false)
  private readonly copying$ = this.copying$$.pipe(distinctUntilChanged())

  constructor(
    private readonly container: HTMLElement,
    private readonly log: Logger
  ) {
    const button = this.createElement()
    this.popover = new Popover(button, "Copy")
    this.element = button
    this.copier = new MessageCopier(this.log)
    this.element.addEventListener("click", () => this.handleClick())
    this.copying$.subscribe(async (val) => {
      if (val) {
        await this.execCopy()
          .then((result) => this.handleCopyResult(result))
          .finally(() => this.copying$$.next(false))
      }
    })

    this.copying$
      .pipe(
        switchMap((val) =>
          match(val)
            .with(true, () => timer(100).pipe(tap(() => this.showLoading())))
            .with(false, () => of(null).pipe(tap(() => this.hideLoading())))
            .exhaustive()
        )
      )
      .subscribe()
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

  private showLoading() {
    this.popover.setText("Copying...")
    this.loadingIcon.node.style.display = ""
    this.icon.svg.style.display = "none"
  }

  private hideLoading() {
    this.loadingIcon.node.style.display = "none"
    this.icon.svg.style.display = ""
  }

  private handleCopyResult(result: CopyResult) {
    this.log("Copy attempt finished", result)

    this.popover.setText(getResultMessage(result))

    match(result)
      .with({ success: true }, () => {
        this.icon.setFilled(true)
      })
      .otherwise(noop)
  }

  private async handleClick(): Promise<void> {
    this.copying$$.next(true)
  }

  private async execCopy(): Promise<CopyResult> {
    const messageRoot = this.findMessageRoot(this.container)

    if (!messageRoot) {
      this.log("No message root found", this.container)

      return {
        success: false,
        error: "no-message-root"
      }
    }

    return this.copier.copy(messageRoot)
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
