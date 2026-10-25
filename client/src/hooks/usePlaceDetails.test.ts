import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('../api/client', () => ({ mapsApi: { details: vi.fn() } }))

import { mapsApi } from '../api/client'
import { usePlaceDetails } from './usePlaceDetails'

describe('usePlaceDetails', () => {
  beforeEach(() => {
    vi.mocked(mapsApi.details).mockReset()
    sessionStorage.clear()
  })

  it('FE-HOOK-PLACEDETAILS-001: no place id means no lookup and no details', () => {
    const { result } = renderHook(() => usePlaceDetails(null, null, 'br'))
    expect(result.current).toBeNull()
    expect(mapsApi.details).not.toHaveBeenCalled()
  })

  it('FE-HOOK-PLACEDETAILS-002: loads the details once and serves the repeat from the cache', async () => {
    vi.mocked(mapsApi.details).mockResolvedValue({ place: { rating: 4.6, rating_count: 120 } } as never)
    const first = renderHook(() => usePlaceDetails('g-1', null, 'br'))
    await waitFor(() => expect(first.result.current?.rating).toBe(4.6))

    const second = renderHook(() => usePlaceDetails('g-1', null, 'br'))
    await waitFor(() => expect(second.result.current?.rating_count).toBe(120))
    expect(mapsApi.details).toHaveBeenCalledTimes(1)
  })

  it('FE-HOOK-PLACEDETAILS-003: a failed lookup leaves the details empty instead of throwing', async () => {
    vi.mocked(mapsApi.details).mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => usePlaceDetails('g-2', null, 'br'))
    await waitFor(() => expect(mapsApi.details).toHaveBeenCalled())
    expect(result.current).toBeNull()
  })
})
