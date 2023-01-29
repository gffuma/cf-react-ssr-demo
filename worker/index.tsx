import { renderToReadableStream } from 'react-dom/server'
import { Router } from 'itty-router'
import App from '../src/App'
import Skeleton from './Skeleton'
import { createHTMLStreamTransformer } from './streamUtils'

const router = Router()

// TODO: Serve assets in prod...

router.get('*', async (request: Request) => {
  const transformer = createHTMLStreamTransformer([
    {
      afterHeadOpen: () => __ASSETS__.head,
      beforeBodyClose: () => __ASSETS__.endOfBody,
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
