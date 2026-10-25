// FE-COMP-POIPILL-001 to FE-COMP-POIPILL-009
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../../tests/helpers/render'
import { fireEvent, cleanup } from '@testing-library/react'
import PoiCategoryPill from './PoiCategoryPill'
import { POI_CATEGORIES } from './poiCategories'

const CAFE = POI_CATEGORIES.find(c => c.key === 'cafe')!
const BAR = POI_CATEGORIES.find(c => c.key === 'bar')!

function pill(props: Partial<React.ComponentProps<typeof PoiCategoryPill>> = {}) {
  return render(
    <PoiCategoryPill active={new Set()} onToggle={vi.fn()} {...props} />,
  )
}

// The spinner replaces the category icon, so "is this segment spinning" reads as
// "does its button hold an .animate-spin element".
const spinning = () => screen.getAllByRole('button')
  .filter(b => b.querySelector('.animate-spin'))
  .map(b => b.getAttribute('aria-label'))

describe('PoiCategoryPill', () => {
  it('FE-COMP-POIPILL-001: renders one segment per category, none pressed', () => {
    pill()
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(POI_CATEGORIES.length)
    expect(buttons.every(b => b.getAttribute('aria-pressed') === 'false')).toBe(true)
  })

  it('FE-COMP-POIPILL-002: clicking a segment toggles its category', () => {
    const onToggle = vi.fn()
    pill({ onToggle })
    fireEvent.click(screen.getAllByRole('button')[1])
    expect(onToggle).toHaveBeenCalledWith(POI_CATEGORIES[1].key)
  })

  it('FE-COMP-POIPILL-003: the active category spins while its fetch is in flight', () => {
    pill({ active: new Set([CAFE.key]), loadingKeys: new Set([CAFE.key]) })
    expect(spinning()).toEqual(['Cafés'])
  })

  it('FE-COMP-POIPILL-004: a deselected category never spins, even with a lingering loading key', () => {
    pill({ active: new Set([BAR.key]), loadingKeys: new Set([CAFE.key, BAR.key]) })
    expect(spinning()).toEqual(['Bars & nightlife'])
  })

  it('FE-COMP-POIPILL-005: a failed category offers a retry', () => {
    pill({ active: new Set([CAFE.key]), errorKeys: new Set([CAFE.key]) })
    expect(screen.getByText('Search this area')).toBeInTheDocument()
  })

  it('FE-COMP-POIPILL-006: "search this area" reports the moved viewport', () => {
    const onSearchArea = vi.fn()
    pill({ active: new Set([CAFE.key]), moved: true, onSearchArea })
    fireEvent.click(screen.getByText('Search this area'))
    expect(onSearchArea).toHaveBeenCalled()
  })

  // The phone map shows Google-style pills: separate, icon plus name, scrolling sideways.
  it('FE-COMP-POIPILL-007: fullWidth shows each category as a labelled pill in a scrolling row', () => {
    pill({ fullWidth: true })
    const button = screen.getAllByRole('button')[0]
    expect(button.textContent).toBe(button.getAttribute('aria-label'))
    expect((button.parentElement as HTMLElement).style.overflowX).toBe('auto')
  })

  it('FE-COMP-POIPILL-009: the leading ask pill opens the assistant, on the phone layout only', () => {
    const onAsk = vi.fn()
    pill({ fullWidth: true, onAsk })
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(onAsk).toHaveBeenCalled()
    cleanup()
    pill({ onAsk })
    expect(screen.queryByText('Ask')).toBeNull()
  })

  it('FE-COMP-POIPILL-008: without it the bar stays content-width, as the desktop map floats it', () => {
    pill()
    const button = screen.getAllByRole('button')[0]
    expect(button.style.width).toBe('34px')
    expect((button.parentElement as HTMLElement).style.display).toBe('inline-flex')
  })
})
