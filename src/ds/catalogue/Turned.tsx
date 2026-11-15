'use client'

import { useId, useState } from 'react'

import { Dial } from '../molecules/Dial'
import { Stat } from '../molecules/Heading'
import { Row } from '../molecules/Row'

// A dial as the lead of a row, and what it sets at its middle, following it as it turns.
export function Turned({ counts }: { counts: string }) {
  const id = useId()
  const [value, setValue] = useState(324)

  return (
    <Row
      lead={<Dial labelledBy={id} max={999} min={100} onChange={setValue} value={value} />}
      title={<Stat label={<span id={id}>{counts}</span>} value={value} />}
    />
  )
}
