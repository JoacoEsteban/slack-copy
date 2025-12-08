import { match, P } from "ts-pattern"

import type { CopyResult } from "~contents/copy"

export function getResultMessage(result: CopyResult) {
  return match(result)
    .with({ success: true }, successMessage)
    .with({ success: false }, errorMessage)
    .exhaustive()
}

function successMessage(result: CopyResult & { success: true }) {
  return match(result)
    .with(
      {
        textCopied: true,
        usedRichClipboard: false,
        imagesCopied: 0
      },
      () => "Copied text to clipboard"
    )
    .with(
      {
        imagesCopied: P.number.gt(0),
        textCopied: false,
        usedRichClipboard: false
      },
      ({ imagesCopied }) =>
        match(imagesCopied)
          .with(1, () => `Copied image to clipboard`)
          .otherwise((num) => `Copied ${num} images to clipboard`)
    )
    .with(
      {
        usedRichClipboard: true,
        imagesCopied: P.number.gt(0)
      },
      () => "Copied text and images to clipboard"
    )
    .otherwise(() => "Copied to clipboard")
}

function errorMessage({ error }: CopyResult & { success: false }) {
  return match(error)
    .with(
      "no-message-root",
      () => "Couldn't copy. Looks like there's no message."
    )
    .with(
      "no-content",
      () => "Couldn't copy. Looks like there's no content in the message."
    )
    .with(
      "no-text",
      () => "Couldn't copy. Looks like there's no text in the message."
    )
    .with(
      "unknown",
      () => "There was an error when copying this message, please try again."
    )
    .exhaustive()
}
