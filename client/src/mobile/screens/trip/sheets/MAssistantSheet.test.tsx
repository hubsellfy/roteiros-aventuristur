import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../../../components/MSheet', () => ({
  default: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
}))

import MAssistantSheet from './MAssistantSheet'

function setup(sheetId: string) {
  const shell = { sheet: { id: sheetId }, closeSheet: vi.fn() }
  render(<MAssistantSheet planner={{} as never} shell={shell as never} />)
  return shell
}

describe('MAssistantSheet', () => {
  it('FE-MOB-ASSISTANT-001: stays closed while another sheet is open', () => {
    setup('poi')
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('FE-MOB-ASSISTANT-002: opens a chat with the message field disabled until the assistant is connected', () => {
    const shell = setup('assistant')
    expect((screen.getByRole('textbox') as HTMLInputElement).disabled).toBe(true)
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(shell.closeSheet).toHaveBeenCalled()
  })
})
