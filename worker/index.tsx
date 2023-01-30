import {
  getAssetFromKV,
  MethodNotAllowedError,
  NotFoundError,
} from '@cloudflare/kv-asset-handler'
import { renderToReadableStream } from 'react-dom/server'
import { Router } from 'itty-router'
import App from '../src/App'
import Skeleton from './Skeleton'
import { createHTMLStreamTransformer } from './streamUtils'

const router = Router()

function handleAssetError(e: any, event: FetchEvent) {
  if (e instanceof NotFoundError) {
    const pathname = new URL(event.request.url).pathname
    return new Response(`"${pathname}" not found`, {
      status: 404,
      statusText: 'not found',
    })
  }
  if (e instanceof MethodNotAllowedError) {
    return new Response('Method Not Allowed', {
      status: 405,
    })
  }
  return new Response('Internal Server Error', {
    status: 500,
  })
}

router.get('/assets/*', async (_, event: FetchEvent) => {
  try {
    return await getAssetFromKV(event, {
      cacheControl: {
        browserTTL: 30 * 60 * 60 * 24, // 30 days
        edgeTTL: 2 * 60 * 60 * 24, // 2 days
        bypassCache: false,
      },
    })
  } catch (e) {
    return handleAssetError(e, event)
  }
})
router.get('/favicon.ico', async (_, event: FetchEvent) => {
  try {
    return await getAssetFromKV(event, {
      cacheControl: {
        browserTTL: 60 * 60 * 1, // 1 hour
        edgeTTL: 60 * 60 * 1, // 1 hour
        bypassCache: false,
      },
    })
  } catch (e) {
    return handleAssetError(e, event)
  }
})
router.get('/robots.txt', async (_, event: FetchEvent) => {
  try {
    return await getAssetFromKV(event, {
      // NOTE: Ensure have always a fresh robots.txt
      cacheControl: {
        browserTTL: undefined,
        edgeTTL: undefined,
        bypassCache: true,
      },
    })
  } catch (e) {
    return handleAssetError(e, event)
  }
})

// NOTE: Workaround to make vite define works ...
// __ASSETS__ should treat as a simple global var but ok...
const buildAssetsMap = __ASSETS__

// TODO: Serve assets in prod...

router.get('*', async (request: Request) => {
  // TODO: Swtich 2 client render on exception....
  const transformer = createHTMLStreamTransformer([
    {
      afterHeadOpen: () => buildAssetsMap.head,
      beforeBodyClose: () => buildAssetsMap.endOfBody,
    },
  ])
  const reactStream = await renderToReadableStream(<Skeleton root={<App />} />)

  await reactStream.allReady

  const responseStream = reactStream.pipeThrough(transformer)

  return new Response(responseStream, {
    headers: {
      'content-type': 'text/html;charset=UTF-8',
    },
  })
})

addEventListener('fetch', (event) => {
  event.respondWith(router.handle(event.request, event))
})
