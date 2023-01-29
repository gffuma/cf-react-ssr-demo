import React from 'react'
import { renderToReadableStream } from 'react-dom/server'
import App from '../src/App'

async function handle(event: any) {
  console.log('~HANDLE~', __ASSETS__)
  // console.log('O.o', process.env.NODE_ENV, hello())
  const stream = await renderToReadableStream(
    <html>
      <head dangerouslySetInnerHTML={{ __html: __ASSETS__.head }}/>
      <body>
        <div id='root'>
          <App />
        </div>
        <span dangerouslySetInnerHTML={{ __html: __ASSETS__.endOfBody }} />
      </body>
    </html>
  )

  return new Response(stream, {
    headers: {
      'content-type': 'text/html',
    },
  })
}

addEventListener('fetch', (event: any) => {
  // const veryLongUnusedShit = 23
  // console.log(event)

  // console.log('O.o', process.env.NODE_ENV)
  event.respondWith(handle(event))
  // event.respondWith(new Response('Hello'))
})
