import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../../components/MSheet', () => ({
  default: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
}))

const chat = vi.fn()
vi.mock('../../../../api/client', () => ({
  roteiroApi: { chat: (...a: unknown[]) => chat(...a) },
  mapsApi: { placeEnrichment: vi.fn().mockResolvedValue({ photos: [] }) },
}))

import MAssistantSheet from './MAssistantSheet'

const card = {
  ref: 'p1', name: 'Cantina Bella', address: 'Rua A', lat: 1, lng: 2, googlePlaceId: 'g1', osmId: null,
  rating: 4.6, ratingCount: 120, openNow: null, reason: 'Boa nota', summary: null, topReview: null,
  website: null, mapsUrl: null, dayId: 7,
}

function setup(sheetId: string, canAdd = true) {
  const shell = { sheet: { id: sheetId }, closeSheet: vi.fn() }
  const planner = {
    tripId: 1, language: 'pt-BR', trip: {}, can: () => canAdd,
    days: [{ id: 7, day_number: 2 }], addAssistantPlace: vi.fn().mockResolvedValue(true),
  }
  render(<MAssistantSheet planner={planner as never} shell={shell as never} />)
  return { shell, planner }
}

describe('MAssistantSheet', () => {
  beforeEach(() => chat.mockReset())

  it('FE-MOB-ASSISTANT-001: stays closed while another sheet is open', () => {
    setup('poi')
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('FE-MOB-ASSISTANT-002: closes from the header button', () => {
    const { shell } = setup('assistant')
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(shell.closeSheet).toHaveBeenCalled()
  })

  it('FE-MOB-ASSISTANT-003: sends a typed message and shows the answer with its card', async () => {
    chat.mockResolvedValue({ reply: 'Sugiro este.', cards: [card], remaining: 39 })
    setup('assistant')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'onde almoçar?' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    expect(await screen.findByText('Sugiro este.')).toBeTruthy()
    expect(screen.getByText('onde almoçar?')).toBeTruthy()
    expect(screen.getByText('Cantina Bella')).toBeTruthy()
    expect(chat).toHaveBeenCalledWith({ tripId: 1, language: 'pt-BR', messages: [{ role: 'user', content: 'onde almoçar?' }] })
  })

  it('FE-MOB-ASSISTANT-004: a suggestion chip sends its text', async () => {
    chat.mockResolvedValue({ reply: 'ok', cards: [], remaining: null })
    setup('assistant')
    const chips = screen.getAllByRole('button').filter(b => b.className.includes('rounded-full') && b.textContent)
    fireEvent.click(chips[0])
    await waitFor(() => expect(chat).toHaveBeenCalledTimes(1))
  })

  it('FE-MOB-ASSISTANT-005: confirming a card adds the place to its proposed day', async () => {
    chat.mockResolvedValue({ reply: 'Veja.', cards: [card], remaining: 3 })
    const { planner } = setup('assistant')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    const add = await screen.findByRole('button', { name: /assistant\.addToDay/ })
    fireEvent.click(add)
    await waitFor(() => expect(planner.addAssistantPlace).toHaveBeenCalledWith(card, 7))
    expect(await screen.findByRole('button', { name: /assistant\.added/ })).toBeTruthy()
  })

  it('FE-MOB-ASSISTANT-006: shows a friendly line when the request fails and never sends it back as history', async () => {
    chat.mockRejectedValueOnce({ response: { status: 502 } })
    setup('assistant')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'oi' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    expect(await screen.findByText('assistant.error')).toBeTruthy()
    chat.mockResolvedValueOnce({ reply: 'agora sim', cards: [], remaining: 1 })
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'de novo' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    await screen.findByText('agora sim')
    expect(chat.mock.calls[1][0].messages.map((m: { content: string }) => m.content)).toEqual(['oi', 'de novo'])
  })

  it('FE-MOB-ASSISTANT-007: shows the limit message the server wrote on a 429', async () => {
    chat.mockRejectedValueOnce({ response: { status: 429, data: { error: 'Limite diário atingido.' } } })
    setup('assistant')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'oi' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    expect(await screen.findByText('Limite diário atingido.')).toBeTruthy()
  })

  it('FE-MOB-ASSISTANT-008: hides the add button for someone who may not edit places', async () => {
    chat.mockResolvedValue({ reply: 'Veja.', cards: [card], remaining: null })
    setup('assistant', false)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)
    await screen.findByText('Cantina Bella')
    expect(screen.queryByRole('button', { name: /assistant\.addToDay/ })).toBeNull()
  })
})
