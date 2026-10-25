import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const enrich = vi.fn()
vi.mock('../api/client', () => ({ mapsApi: { placeEnrichment: (...a: unknown[]) => enrich(...a) } }))

import { useGooglePlacePhoto } from './useGooglePlacePhoto'

let seq = 0
const id = () => `g${++seq}`

describe('useGooglePlacePhoto', () => {
  beforeEach(() => enrich.mockReset())

  it('FE-HOOK-GPHOTO-001: returns the first Google picture and ignores other sources', async () => {
    enrich.mockResolvedValue({ photos: [{ source: 'wikimedia', url: 'w' }, { source: 'google', url: 'g.jpg' }] })
    const { result } = renderHook(() => useGooglePlacePhoto(id(), 1, 2, 'A', 'pt'))
    await waitFor(() => expect(result.current).toBe('g.jpg'))
  })

  it('FE-HOOK-GPHOTO-002: stays null without a Google id and does not call the API', () => {
    const { result } = renderHook(() => useGooglePlacePhoto(null, 1, 2, 'A', 'pt'))
    expect(result.current).toBeNull()
    expect(enrich).not.toHaveBeenCalled()
  })

  it('FE-HOOK-GPHOTO-003: asks once per place and language', async () => {
    enrich.mockResolvedValue({ photos: [{ source: 'cached', url: 'c.jpg' }] })
    const placeId = id()
    const a = renderHook(() => useGooglePlacePhoto(placeId, 1, 2, 'A', 'pt'))
    await waitFor(() => expect(a.result.current).toBe('c.jpg'))
    const b = renderHook(() => useGooglePlacePhoto(placeId, 1, 2, 'A', 'pt'))
    await waitFor(() => expect(b.result.current).toBe('c.jpg'))
    expect(enrich).toHaveBeenCalledTimes(1)
  })

  it('FE-HOOK-GPHOTO-004: a failed lookup leaves no picture and is retried next time', async () => {
    enrich.mockRejectedValueOnce(new Error('quota'))
    const placeId = id()
    const a = renderHook(() => useGooglePlacePhoto(placeId, 1, 2, 'A', 'pt'))
    await waitFor(() => expect(enrich).toHaveBeenCalledTimes(1))
    expect(a.result.current).toBeNull()
    enrich.mockResolvedValue({ photos: [{ source: 'google', url: 'ok.jpg' }] })
    const b = renderHook(() => useGooglePlacePhoto(placeId, 1, 2, 'A', 'pt'))
    await waitFor(() => expect(b.result.current).toBe('ok.jpg'))
  })

  it('FE-HOOK-GPHOTO-005: no picture when the place has none from Google', async () => {
    enrich.mockResolvedValue({ photos: [{ source: 'wikimedia', url: 'w' }] })
    const { result } = renderHook(() => useGooglePlacePhoto(id(), 1, 2, 'A', 'pt'))
    await waitFor(() => expect(enrich).toHaveBeenCalled())
    expect(result.current).toBeNull()
  })
})
