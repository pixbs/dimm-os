import { describe, expect, it } from 'vitest'

import { arrange, settles, stepped } from '@/ds/organisms/cells'

const apps = ['/work', '/services', '/lab', '/cv', '/contact']
const grid = { cols: 4, rows: 3 }
const start = arrange(apps, null, grid)

describe('the apps on a desk', () => {
  it('fill the first column from the top at the start, then the next', () => {
    expect(start).toEqual({
      '/work': [0, 0],
      '/services': [0, 1],
      '/lab': [0, 2],
      '/cv': [1, 0],
      '/contact': [1, 1],
    })
  })

  it('let go over a free cell, settle into it; over a taken one or off the desk, into the nearest free one', () => {
    expect(settles('/work', [3, 2], start, grid)).toEqual([3, 2])
    expect(settles('/work', [1, 1], start, grid)).toEqual([1, 2])
    expect(settles('/work', [9, -4], start, grid)).toEqual([3, 0])
    expect(settles('/work', [0, 0], start, grid)).toEqual([0, 0])
  })

  it('step a cell with an arrow, over those taken, and stay at the edge of the desk', () => {
    expect(stepped('/work', [1, 0], start, grid)).toEqual([2, 0])
    expect(stepped('/work', [0, 1], start, grid)).toEqual([0, 0])
    expect(stepped('/work', [-1, 0], start, grid)).toEqual([0, 0])
  })

  it('never share a cell, and keep within a smaller desk', () => {
    const moved = {
      ...start,
      '/work': [3, 2] as [number, number],
      '/cv': [2, 1] as [number, number],
    }
    const smaller = arrange(apps, moved, { cols: 2, rows: 3 })
    expect(smaller['/work']).toEqual([1, 2])
    expect(smaller['/services']).toEqual([0, 1])
    const cells = Object.values(smaller).map(String)
    expect(new Set(cells).size).toBe(apps.length)
    expect(Object.values(smaller).every(([col, row]) => col < 2 && row < 3)).toBe(true)
  })

  it('give an app never placed the first free cell down the columns', () => {
    const placed = arrange([...apps, '/new'], { ...start, '/work': [3, 2] }, grid)
    expect(placed['/new']).toEqual([0, 0])
  })
})
