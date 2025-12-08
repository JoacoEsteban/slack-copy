import { COPY_BUTTON_MARK } from "./constants"
import type { Logger } from "./logger"

const MESSAGE_TEXT_SELECTORS = [
  '[data-qa="message-text"]',
  '[data-qa="message_content"]',
  '[data-qa="message-body"]',
  ".c-message_kit__text",
  ".p-rich_text_section"
]

export type CopyResult = {
  success: boolean
  textCopied: boolean
  imagesCopied: number
  usedRichClipboard: boolean
}

type ClipboardPayload = {
  text: string | null
  html: string | null
  imageBlobs: Blob[]
}

type RichClipboardResult =
  | {
      success: true
      textIncluded: boolean
      htmlIncluded: boolean
      imagesIncluded: number
    }
  | { success: false }

export async function copyMessageContent(
  messageRoot: HTMLElement,
  log: Logger
): Promise<CopyResult> {
  log("will copy for message", messageRoot)
  const text = extractMessageText(messageRoot)
  const html = extractMessageHtml(messageRoot)
  const imageBlobs = await collectImageBlobs(messageRoot, log)

  const richCopyResult = await tryRichClipboardCopy(
    { text, html, imageBlobs },
    log
  )

  if (richCopyResult.success) {
    return {
      success: true,
      textCopied: richCopyResult.textIncluded || richCopyResult.htmlIncluded,
      imagesCopied: richCopyResult.imagesIncluded,
      usedRichClipboard: true
    }
  }

  if (text) {
    const textOnlySuccess = await copyPlainText(text, log)
    return {
      success: textOnlySuccess,
      textCopied: textOnlySuccess,
      imagesCopied: 0,
      usedRichClipboard: false
    }
  }

  log("No copyable content found")
  return {
    success: false,
    textCopied: false,
    imagesCopied: 0,
    usedRichClipboard: false
  }
}

function extractMessageText(root: HTMLElement): string | null {
  for (const selector of MESSAGE_TEXT_SELECTORS) {
    const node = root.querySelector<HTMLElement>(selector)
    if (node) {
      const text = node.innerText.trim()
      if (text) {
        return text
      }
    }
  }

  const fallbackText = root.innerText.trim()
  return fallbackText || null
}

function extractMessageHtml(root: HTMLElement): string | null {
  const contentNode =
    MESSAGE_TEXT_SELECTORS.reduce<HTMLElement | null>((acc, selector) => {
      return acc ?? root.querySelector<HTMLElement>(selector)
    }, null) ?? root

  const clone = contentNode.cloneNode(true) as HTMLElement
  cleanupClone(clone)

  const html = clone.innerHTML.trim()
  return html || null
}

function cleanupClone(element: HTMLElement): void {
  element.removeAttribute(COPY_BUTTON_MARK)
  element.querySelectorAll(`[${COPY_BUTTON_MARK}]`).forEach((node) => {
    node.remove()
  })

  element.querySelectorAll("script").forEach((node) => node.remove())
}

async function collectImageBlobs(
  root: HTMLElement,
  log: Logger
): Promise<Blob[]> {
  const anchors = Array.from(
    root.querySelectorAll<HTMLAnchorElement>(
      "[data-qa=message_file_image_thumbnail]"
    )
  )
  const sources = Array.from(
    new Set(
      anchors
        .map((image) => image.href)
        .filter((src): src is string => Boolean(src))
    )
  )

  if (!sources.length) {
    return []
  }

  log("Found image elements to copy", sources)
  const blobs = await Promise.all(
    sources.map(async (src) => {
      const blob = await fetchImageBlob(src, log)
      return blob
    })
  )

  return blobs.filter((blob): blob is Blob => Boolean(blob))
}

async function fetchImageBlob(src: string, log: Logger): Promise<Blob | null> {
  try {
    const response = await fetch(src, {
      credentials: "include"
    })
    if (!response.ok) {
      log("Failed to fetch image for clipboard", src, response.status)
      return null
    }

    const blob = await response.blob()
    if (blob.type && !blob.type.startsWith("image/")) {
      log("Skipping non-image blob", src, blob.type)
      return null
    }

    return blob
  } catch (error) {
    log("Error fetching image for clipboard", src, error)
    return null
  }
}

async function tryRichClipboardCopy(
  payload: ClipboardPayload,
  log: Logger
): Promise<RichClipboardResult> {
  const clipboardItemCtor = (
    window as Window & {
      ClipboardItem?: typeof ClipboardItem
    }
  ).ClipboardItem

  if (!clipboardItemCtor || typeof navigator.clipboard?.write !== "function") {
    log("Rich clipboard APIs not available")
    return { success: false }
  }

  const attempts: ClipboardPayload[] =
    payload.imageBlobs.length > 0
      ? [payload, { ...payload, imageBlobs: [] }]
      : [payload]

  for (const attempt of attempts) {
    const prepared = prepareClipboardItemData(attempt, log)
    if (!prepared) {
      continue
    }

    try {
      await navigator.clipboard.write([new clipboardItemCtor(prepared.data)])
      log("navigator.clipboard.write succeeded", {
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
    } catch (error) {
      log("navigator.clipboard.write failed", error)
      continue
    }
  }

  return { success: false }
}

type PreparedClipboardData = {
  data: Record<string, Blob>
  textIncluded: boolean
  htmlIncluded: boolean
  imagesIncluded: number
}

function prepareClipboardItemData(
  payload: ClipboardPayload,
  log: Logger
): PreparedClipboardData | null {
  const data: Record<string, Blob> = {}
  let textIncluded = false
  let htmlIncluded = false
  let imagesIncluded = 0

  if (payload.text) {
    textIncluded = true
    data["text/plain"] = new Blob([payload.text], { type: "text/plain" })
  }

  if (payload.html) {
    htmlIncluded = true
    data["text/html"] = new Blob([payload.html], { type: "text/html" })
  }

  const usedImageTypes = new Set<string>()
  payload.imageBlobs.forEach((blob) => {
    const mimeType =
      blob.type && blob.type.startsWith("image/") ? blob.type : "image/png"
    if (usedImageTypes.has(mimeType)) {
      log("Skipping duplicate clipboard image type", mimeType)
      return
    }
    usedImageTypes.add(mimeType)
    data[mimeType] = blob
    imagesIncluded += 1
  })

  if (!textIncluded && !htmlIncluded && imagesIncluded === 0) {
    return null
  }

  return {
    data,
    textIncluded,
    htmlIncluded,
    imagesIncluded
  }
}

async function copyPlainText(text: string, log: Logger): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    log("navigator.clipboard.writeText succeeded")
    return true
  } catch (error) {
    log("navigator.clipboard.writeText failed, falling back", error)
  }

  return legacyCopy(text, log)
}

function legacyCopy(text: string, log: Logger): boolean {
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
    log("document.execCommand copy result", success)
  } catch (error) {
    log("document.execCommand copy failed", error)
    success = false
  }

  textarea.remove()
  return success
}
