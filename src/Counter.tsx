
import React, { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div>
      {/* <div>XD o.O</div> */}
      <button onClick={() => setCount(count +1)}>counter {count}</button>
    </div>
  )
}
