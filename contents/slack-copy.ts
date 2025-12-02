import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://*.slack.com/*"],
  run_at: "document_idle"
}

const ACTION_CONTAINER_SELECTORS = [
  '[data-qa="message_actions"]',
  '[data-qa="message_actions_container"]',
  '[data-qa="message_actions_bar"]',
  ".p-message_actions",
  ".c-message_actions",
  ".c-message_actions__group"
]

const MESSAGE_TEXT_SELECTORS = [
  '[data-qa="message-text"]',
  '[data-qa="message_content"]',
  '[data-qa="message-body"]',
  ".c-message_kit__text",
  ".p-rich_text_section"
]

const COPY_BUTTON_MARK = "data-slack-copy-button"

const log = (...args: unknown[]) => {
  console.log("[slack-copy]", ...args)
}

const ensureButton = (container: HTMLElement) => {
  if (container.getAttribute(COPY_BUTTON_MARK)) {
    return
  }

  log("Injecting copy button", container)

  const button = document.createElement("button")
  button.type = "button"
  button.setAttribute(COPY_BUTTON_MARK, "true")
  button.setAttribute("aria-label", "Copy message text")
  button.textContent = "Copy"
  button.className = "p-message_actions__button c-button-unstyled"
  button.style.display = "flex"
  button.style.alignItems = "center"
  button.style.gap = "4px"
  button.style.padding = "0 8px"
  button.style.height = "28px"
  button.style.borderRadius = "4px"
  button.style.fontSize = "12px"
  button.style.cursor = "pointer"

  button.addEventListener("click", async (event) => {
    event.preventDefault()
    event.stopPropagation()

    const messageText = extractMessageText(container)
    if (!messageText) {
      log("No text found for container", container)
      flashButton(button, "No text")
      return
    }

    const success = await copyToClipboard(messageText)
    log("Copy attempt finished", { success, messageText })
    flashButton(button, success ? "Copied" : "Failed")
  })

  container.setAttribute(COPY_BUTTON_MARK, "true")
  container.prepend(button)
  // container.appendChild(button)
}

const findMessageRoot = (start: HTMLElement) =>
  start.closest<HTMLElement>('[data-qa="message_container"]') ??
  start.closest<HTMLElement>('[role="listitem"]') ??
  start.closest<HTMLElement>(".c-virtual_list__item")

const extractMessageText = (container: HTMLElement) => {
  const messageRoot = findMessageRoot(container)
  if (!messageRoot) {
    log("No message root", container)
    return null
  }

  for (const selector of MESSAGE_TEXT_SELECTORS) {
    const textNode = messageRoot.querySelector<HTMLElement>(selector)
    if (textNode) {
      const text = textNode.innerText.trim()
      if (text) {
        log("Selector matched text", selector, text)
        return text
      }
    }
  }

  const fallbackText = messageRoot.innerText.trim()
  log("Falling back to innerText", fallbackText)
  return fallbackText || null
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    log("navigator.clipboard.writeText succeeded")
    return true
  } catch (error) {
    log("navigator.clipboard.writeText failed, falling back", error)
    return legacyCopy(text)
  }
}

const legacyCopy = (text: string) => {
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

const flashButton = (button: HTMLButtonElement, message: string) => {
  const originalText = button.textContent ?? ""
  button.textContent = message

  setTimeout(() => {
    button.textContent = originalText
  }, 1500)
}

const processElement = (element: HTMLElement) => {
  log("Processing node", element)
  ACTION_CONTAINER_SELECTORS.forEach((selector) => {
    if (element.matches(selector)) {
      log("matched selector", selector)
      ensureButton(element)
    }

    element
      .querySelectorAll<HTMLElement>(selector)
      .forEach((node) => ensureButton(node))
  })
}

const scanForContainers = () => {
  log("Scanning for existing action containers")
  ACTION_CONTAINER_SELECTORS.forEach((selector) => {
    document
      .querySelectorAll<HTMLElement>(selector)
      .forEach((node) => ensureButton(node))
  })
}

const init = () => {
  log("Initializing Slack Copy content script")
  if (!document.body) {
    return
  }

  scanForContainers()

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          processElement(node)
        }
      })
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}

if (document.readyState === "loading") {
  log("Document loading, waiting for DOMContentLoaded")
  document.addEventListener("DOMContentLoaded", init)
} else {
  log("Document ready, running init immediately")
  init()
}
