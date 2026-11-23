// A cell of the desk's grid: its column and its row, from 0 at the top of the first column.
export type Cell = [col: number, row: number]

// Where each app stands, by its address.
export type Cells = Record<string, Cell>

// How many cells the desk holds across and down.
export type Grid = { cols: number; rows: number }

// The step each arrow key takes.
export const arrows: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

const keyOf = ([col, row]: Cell) => `${col} ${row}`

// The free cell nearest to one, and of those as near the one that comes first down the columns.
export function nearest([col, row]: Cell, taken: Set<string>, { cols, rows }: Grid): Cell | null {
  let best: Cell | null = null
  let far = Infinity
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) {
      const distance = (c - col) ** 2 + (r - row) ** 2
      if (distance < far && !taken.has(keyOf([c, r]))) [best, far] = [[c, r], distance]
    }
  return best
}

const within = ([col, row]: Cell, { cols, rows }: Grid) =>
  col >= 0 && row >= 0 && col < cols && row < rows

const clamped = ([col, row]: Cell, { cols, rows }: Grid): Cell => [
  Math.min(Math.max(col, 0), cols - 1),
  Math.min(Math.max(row, 0), rows - 1),
]

// Where the apps stand on a grid: at the start they fill the first column from the top, then the next. One placed
// keeps its cell while that is on the desk and its own; else it takes the free cell nearest, and one never placed the
// first free cell. A desk too small for all of them grows by columns.
export function arrange(order: string[], wanted: Cells | null, grid: Grid): Cells {
  const room = { rows: grid.rows, cols: Math.max(grid.cols, Math.ceil(order.length / grid.rows)) }
  const start = (at: number): Cell => [Math.floor(at / room.rows), at % room.rows]
  if (!wanted) return Object.fromEntries(order.map((app, at) => [app, start(at)]))
  const placed: Cells = {}
  const taken = new Set<string>()
  const put = (app: string, cell: Cell) => {
    placed[app] = cell
    taken.add(keyOf(cell))
  }
  for (const app of order) {
    const cell = wanted[app]
    if (cell && within(cell, grid) && !taken.has(keyOf(cell))) put(app, cell)
  }
  for (const app of order) {
    if (placed[app]) continue
    const cell = wanted[app]
    if (cell) put(app, nearest(clamped(cell, grid), taken, room)!)
    else {
      let at = 0
      while (taken.has(keyOf(start(at)))) at++
      put(app, start(at))
    }
  }
  return placed
}

// Where apps let go over cells settle, the first first: each there if it is free, else in the free cell nearest; over
// the edge of the desk, in the free cell nearest the edge. Their own cells are free.
export function settles(over: Cells, cells: Cells, grid: Grid): Cells {
  const taken = new Set(
    Object.entries(cells)
      .filter(([one]) => !(one in over))
      .map(([, cell]) => keyOf(cell)),
  )
  const placed: Cells = {}
  for (const [app, cell] of Object.entries(over)) {
    placed[app] = nearest(clamped(cell, grid), taken, grid) ?? cells[app]
    taken.add(keyOf(placed[app]))
  }
  return placed
}

// One step with an arrow: to the next free cell that way, over those taken; at the edge of the desk it stays.
export function stepped(app: string, [x, y]: [number, number], cells: Cells, grid: Grid): Cell {
  const taken = new Set(Object.values(cells).map(keyOf))
  let [col, row] = cells[app]
  do {
    col += x
    row += y
  } while (within([col, row], grid) && taken.has(keyOf([col, row])))
  return within([col, row], grid) ? [col, row] : cells[app]
}

// One step with an arrow for apps moved together: each a cell that way, into the free cell nearest; where one would
// leave the desk, they stay.
export function steppedTogether(
  apps: string[],
  [x, y]: [number, number],
  cells: Cells,
  grid: Grid,
) {
  const over: Cells = Object.fromEntries(
    apps.map((app) => [app, [cells[app][0] + x, cells[app][1] + y]]),
  )
  return Object.values(over).every((cell) => within(cell, grid))
    ? settles(over, cells, grid)
    : Object.fromEntries(apps.map((app) => [app, cells[app]]))
}
