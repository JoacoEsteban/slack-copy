export type Logger = (...args: unknown[]) => void

export const createLogger = (prefix = "[slack-copy]"): Logger => {
  return (...args) => {
    console.log(prefix, ...args)
  }
}
