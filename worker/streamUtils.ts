export function stringToStream(str: string) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(str))
      controller.close()
    },
  })
}

export type InjectHTMLFunction = () => string
export interface InjectHTMLHook {
  htmlAttributes?: InjectHTMLFunction
  afterHeadOpen?: InjectHTMLFunction
  beforeHeadClose?: InjectHTMLFunction
  afterBodyOpen?: InjectHTMLFunction
  beforeBodyClose?: InjectHTMLFunction
  end?: InjectHTMLFunction
  // TODO: Before every react streaming scrpt 4 hydratation ....
}

function runInject(fns: InjectHTMLFunction[]) {
  return fns.reduce((html, fn) => html + fn(), '')
}

type NormalizedHooks = {
  [k in keyof Required<InjectHTMLHook>]: InjectHTMLFunction[]
}

function normalizeHooks(hooks: InjectHTMLHook[]) {
  const normalized: NormalizedHooks = {
    htmlAttributes: [],
    afterHeadOpen: [],
    beforeHeadClose: [],
    afterBodyOpen: [],
    beforeBodyClose: [],
    end: [],
  }

  hooks.reduce((out, hook) => {
    const keys = Object.keys(hook) as Array<keyof InjectHTMLHook>
    keys.forEach((k) => out[k].push(hook[k]!))
    return out
  }, normalized)

  return normalized
}

function insertStringAtIndex(
  content: string,
  index: number,
  value: string,
  toIndex?: number
): string {
  const newContent =
    content.slice(0, index) +
    value +
    content.slice(toIndex ?? index, content.length)
  return newContent
}

export function createHTMLStreamTransformer(hooks: InjectHTMLHook[]) {
  const normalizedHooks = normalizeHooks(hooks)

  const hooksInjectedOneTime = {
    htmlAttributes: !normalizedHooks.htmlAttributes.length,
    beforeHeadClose: !normalizedHooks.beforeHeadClose.length,
    afterHeadOpen: !normalizedHooks.afterHeadOpen.length,
    afterBodyOpen: !normalizedHooks.afterBodyOpen.length,
    beforeBodyClose: !normalizedHooks.beforeBodyClose.length,
  }

  return new TransformStream({
    flush(controller) {
      if (normalizedHooks.end.length) {
        controller.enqueue(
          new TextEncoder().encode(runInject(normalizedHooks.end))
        )
      }
    },
    transform(chunk, controller) {
      let html: string | null = null
      let index: number
      let touch = false

      if (!hooksInjectedOneTime.htmlAttributes) {
        if (!html) html = new TextDecoder().decode(chunk)
        const token = '<html>'
        if ((index = html.indexOf(token)) !== -1) {
          html = insertStringAtIndex(
            html,
            index,
            `<html ${runInject(normalizedHooks.htmlAttributes)}>`,
            index + token.length,
          )
          hooksInjectedOneTime.htmlAttributes = true
          touch = true
        }
      }

      if (!hooksInjectedOneTime.afterHeadOpen) {
        if (!html) html = new TextDecoder().decode(chunk)
        const token = '<head>'
        if ((index = html.indexOf(token)) !== -1) {
          html = insertStringAtIndex(
            html,
            index + token.length,
            runInject(normalizedHooks.afterHeadOpen)
          )
          hooksInjectedOneTime.afterHeadOpen = true
          touch = true
        }
      }

      if (!hooksInjectedOneTime.beforeHeadClose) {
        if (!html) html = new TextDecoder().decode(chunk)
        const token = '</head>'
        if ((index = html.indexOf(token)) !== -1) {
          html = insertStringAtIndex(
            html,
            index,
            runInject(normalizedHooks.beforeHeadClose)
          )
          hooksInjectedOneTime.beforeHeadClose = true
          touch = true
        }
      }

      if (!hooksInjectedOneTime.afterBodyOpen) {
        if (!html) html = new TextDecoder().decode(chunk)
        const token = '<body>'
        if ((index = html.indexOf(token)) !== -1) {
          html = insertStringAtIndex(
            html,
            index + token.length,
            runInject(normalizedHooks.afterBodyOpen)
          )
          hooksInjectedOneTime.afterBodyOpen = true
          touch = true
        }
      }

      if (!hooksInjectedOneTime.beforeBodyClose) {
        if (!html) html = new TextDecoder().decode(chunk)
        const token = '</body>'
        if ((index = html.indexOf(token)) !== -1) {
          html = insertStringAtIndex(
            html,
            index,
            runInject(normalizedHooks.beforeBodyClose)
          )
          hooksInjectedOneTime.beforeBodyClose = true
          touch = true
        }
      }

      if (html !== null && touch) {
        controller.enqueue(new TextEncoder().encode(html))
      } else {
        controller.enqueue(chunk)
      }
    },
  })
}
