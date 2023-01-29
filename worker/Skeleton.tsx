import { ReactNode } from 'react'

export interface SkeletonProps {
  root: ReactNode
}

export default function Skeleton({ root }: SkeletonProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body>
        <div id="root">{root}</div>
      </body>
    </html>
  )
}