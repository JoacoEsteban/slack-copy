import { match } from "ts-pattern"

import { COPY_BUTTON_MARK } from "./constants"
import { mapFind } from "./lib/map-find"
import type { Logger } from "./logger"

const MESSAGE_TEXT_SELECTORS = [
  // '[data-qa="message-text"]',
  '[data-qa="message_content"]',
  '[data-qa="message-body"]',
  ".c-message_kit__text",
  ".p-rich_text_section"
]

const EDITED_LABEL_SELECTOR = ".c-message__edited_label"
const FILE_META_SELECTOR = ".c-message_kit__file__meta"
const SENDER_SELECTOR = "[data-qa=message_sender]"
const TIMESTAMP_SELECTOR = "[data-qa=timestamp_label]"

const CLEANUP_SELECTORS = [
  `[${COPY_BUTTON_MARK}]`,
  "script",
  EDITED_LABEL_SELECTOR,
  FILE_META_SELECTOR,
  SENDER_SELECTOR,
  TIMESTAMP_SELECTOR
]

export type CopyResult =
  | {
      success: true
      textCopied: boolean
      imagesCopied: number
      usedRichClipboard: boolean
    }
  | {
      success: false
      error: "no-message-root" | "no-content" | "no-text" | "unknown"
    }

type ClipboardPayload = {
  text: string | null
  html: string | null
  imageBlobs: Blob[]
}

type PreparedClipboardData = {
  data: Record<string, Blob>
  textIncluded: boolean
  htmlIncluded: boolean
  imagesIncluded: number
}

type RichClipboardResult =
  | {
      success: true
      textIncluded: boolean
      htmlIncluded: boolean
      imagesIncluded: number
    }
  | { success: false }

type PreparedClipboardAccumulator = PreparedClipboardData & {
  usedImageTypes: Set<string>
}

export class MessageCopier {
  constructor(private readonly log: Logger) {}

  public async copy(messageRoot: HTMLElement): Promise<CopyResult> {
    this.log("Will attempt to copy content from", messageRoot)
    const payload = await this.buildPayload(messageRoot)
    const richResult = await this.tryRichClipboard(payload)

    if (richResult.success) {
      return {
        success: true,
        textCopied: richResult.textIncluded || richResult.htmlIncluded,
        imagesCopied: richResult.imagesIncluded,
        usedRichClipboard: richResult.htmlIncluded
      }
    }

    if (payload.text) {
      const textOnlySuccess = await this.copyPlainText(payload.text)
      return match<boolean, CopyResult>(textOnlySuccess)
        .with(false, () => ({
          success: false,
          error: "no-text"
        }))
        .otherwise(() => ({
          success: true,
          textCopied: true,
          imagesCopied: 0,
          usedRichClipboard: false
        }))
    }

    this.log("No copyable content found")
    return {
      success: false,
      error: "no-content"
    }
  }

  private async buildPayload(root: HTMLElement): Promise<ClipboardPayload> {
    return {
      text: this.extractMessageText(root),
      html: this.extractMessageHtml(root),
      imageBlobs: await this.collectImageBlobs(root)
    }
  }

  private extractMessageText(root: HTMLElement): string | null {
    const contentNode = this.selectMessageContent(root)
    return (
      this.extractInnerText(contentNode) || this.extractInnerText(root) || null
    )
  }

  private extractMessageHtml(root: HTMLElement): string | null {
    const clone = this.cloneForProcessing(this.selectMessageContent(root))
    const html = clone.innerHTML.trim()
    const text = clone.innerText.trim()
    this.log(clone, text, text.length > 0)

    return html || null
  }

  private selectMessageContent(root: HTMLElement): HTMLElement {
    return (
      mapFind(
        MESSAGE_TEXT_SELECTORS,
        (selector) => root.querySelector<HTMLElement>(selector),
        (node) => Boolean(node)
      ) ?? root
    )
  }

  private extractInnerText(element: HTMLElement): string {
    return this.cloneForProcessing(element).innerText.trim()
  }

  private cloneForProcessing(element: HTMLElement): HTMLElement {
    const clone = element.cloneNode(true) as HTMLElement
    this.cleanupClone(clone)
    return clone
  }

  private cleanupClone(element: HTMLElement): void {
    element.removeAttribute(COPY_BUTTON_MARK)

    CLEANUP_SELECTORS.map((selector) => element.querySelectorAll(selector))
      .map((nodes) => Array.from(nodes))
      .flat()
      .forEach((node) => node.remove())
  }

  private async collectImageBlobs(root: HTMLElement): Promise<Blob[]> {
    const sources = Array.from(
      root.querySelectorAll<HTMLAnchorElement>(
        "[data-qa=message_file_image_thumbnail]"
      )
    ).reduce<Set<string>>((set, anchor) => {
      return anchor.href ? set.add(anchor.href) : set
    }, new Set<string>())

    const blobs = await Promise.all(
      Array.from(sources).map((src) => this.fetchImageBlob(src))
    )

    return blobs.filter((blob): blob is Blob => Boolean(blob))
  }

  private async fetchImageBlob(src: string): Promise<Blob | null> {
    return fetch(src, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          this.log("Failed to fetch image for clipboard", src, response.status)
          return null
        }

        const blob = await response.blob()
        if (blob.type && !blob.type.startsWith("image/")) {
          this.log("Skipping non-image blob", src, blob.type)
          return null
        }

        return blob
      })
      .catch((error) => {
        this.log("Error fetching image for clipboard", src, error)
        return null
      })
  }

  private async tryRichClipboard(
    payload: ClipboardPayload
  ): Promise<RichClipboardResult> {
    const clipboardItemCtor = (
      window as Window & { ClipboardItem?: typeof ClipboardItem }
    ).ClipboardItem

    if (
      !clipboardItemCtor ||
      typeof navigator.clipboard?.write !== "function"
    ) {
      this.log("Rich clipboard APIs not available")
      return { success: false }
    }

    const attempts =
      payload.imageBlobs.length > 0
        ? [payload, { ...payload, imageBlobs: [] }]
        : [payload]

    for (const attempt of attempts) {
      this.log("Preparing clipboard data for", attempt)
      const prepared = this.prepareClipboardData(attempt)
      if (!prepared) {
        continue
      }

      const success = await navigator.clipboard
        .write([new clipboardItemCtor(prepared.data)])
        .then(() => true)
        .catch((error) => {
          this.log("navigator.clipboard.write failed", error)
          return false
        })

      if (success) {
        this.log("navigator.clipboard.write succeeded", {
          text: prepared.textIncluded,
          html: prepared.htmlIncluded,
          images: prepared.imagesIncluded
        })
        return {
          success: true,
          textIncluded: prepared.textIncluded,
          htmlIncluded: prepared.htmlIncluded,
          imagesIncluded: prepared.imagesIncluded
        }
      }
    }

    return { success: false }
  }

  private prepareClipboardData(
    payload: ClipboardPayload
  ): PreparedClipboardData | null {
    type Entry = {
      mime: string
      blob: Blob
      flag?: "text" | "html"
    }

    const baseEntries = [
      payload.text
        ? {
            mime: "text/plain",
            blob: new Blob([payload.text], { type: "text/plain" }),
            flag: "text" as const
          }
        : null,
      payload.html
        ? {
            mime: "text/html",
            blob: new Blob([payload.html], { type: "text/html" }),
            flag: "html" as const
          }
        : null
    ].filter((entry): entry is Entry => Boolean(entry))

    const withBase: PreparedClipboardAccumulator = {
      data: baseEntries.reduce<Record<string, Blob>>(
        (acc, entry) => ({ ...acc, [entry.mime]: entry.blob }),
        {}
      ),
      textIncluded: baseEntries.some((entry) => entry.flag === "text"),
      htmlIncluded: baseEntries.some((entry) => entry.flag === "html"),
      imagesIncluded: 0,
      usedImageTypes: new Set<string>()
    }

    const imageEntries = payload.imageBlobs.reduce(
      (
        acc: {
          data: Record<string, Blob>
          usedImageTypes: Set<string>
          count: number
        },
        blob
      ) => {
        const mime =
          blob.type && blob.type.startsWith("image/") ? blob.type : "image/png"
        if (acc.usedImageTypes.has(mime)) {
          this.log("Skipping duplicate clipboard image type", mime)
          return acc
        }

        const usedImageTypes = new Set(acc.usedImageTypes)
        usedImageTypes.add(mime)

        return {
          data: { ...acc.data, [mime]: blob },
          usedImageTypes,
          count: acc.count + 1
        }
      },
      {
        data: {},
        usedImageTypes: new Set(withBase.usedImageTypes),
        count: 0
      }
    )

    const withImages: PreparedClipboardAccumulator = {
      data: { ...withBase.data, ...imageEntries.data },
      textIncluded: withBase.textIncluded,
      htmlIncluded: withBase.htmlIncluded,
      imagesIncluded: imageEntries.count,
      usedImageTypes: imageEntries.usedImageTypes
    }

    const { usedImageTypes: _ignored, ...result } = withImages
    return result.textIncluded || result.htmlIncluded || result.imagesIncluded
      ? result
      : null
  }

  private async copyPlainText(text: string): Promise<boolean> {
    return navigator.clipboard
      .writeText(text)
      .then(() => {
        this.log("navigator.clipboard.writeText succeeded")
        return true
      })
      .catch((error) => {
        this.log("navigator.clipboard.writeText failed, falling back", error)
        return this.legacyCopy(text)
      })
  }

  private legacyCopy(text: string): boolean {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()

    const success = (() => {
      try {
        return document.execCommand("copy")
      } catch (error) {
        this.log("document.execCommand copy failed", error)
        return false
      }
    })()

    textarea.remove()
    return success
  }
}
