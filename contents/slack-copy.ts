import type { PlasmoCSConfig } from "plasmo"

import { Injector } from "./injector"
import { createLogger } from "./logger"
import { Observer } from "./observer"

export const config: PlasmoCSConfig = {
  matches: ["https://*.slack.com/*"],
  run_at: "document_idle"
}

const log = createLogger()
const injector = new Injector(log)
const observer = new Observer(injector, log)

const init = () => {
  log("Initializing Slack Copy content script")
  if (!document.body) {
    return
  }

  injector.scan(document)
  observer.start(document.body)
}

if (document.readyState === "loading") {
  log("Document loading, waiting for DOMContentLoaded")
  document.addEventListener("DOMContentLoaded", init)
} else {
  log("Document ready, running init immediately")
  init()
}
