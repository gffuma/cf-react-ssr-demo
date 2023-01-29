import { renderToReadableStream } from 'react-dom/server'
import { Router } from 'itty-router'
import App from '../src/App'
import Skeleton from './Skeleton'
import { createHTMLStreamTransformer } from './streamUtils'

const router = Router()

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
