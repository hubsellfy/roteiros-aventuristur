import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '../../helpers/render'
import { bookPageSetupSchema, bookSpreadSchema } from '@trek/shared'
import { seedStore } from '../../helpers/store'
import { buildSettings } from '../../helpers/factories'
import { useSettingsStore } from '../../../src/store/settingsStore'
import { useStudioStore } from '../../../src/store/studioStore'
import { StudioCanvas } from '../../../src/components/Studio/StudioCanvas'

const page = bookPageSetupSchema.parse({})
const spreadWith = (locked: boolean) => bookSpreadSchema.parse({
  id: 'sp-1',
  elements: [{ id: 'el-1', kind: 'shape', frame: { x: 10, y: 10, w: 40, h: 30 }, locked }],
})

/** Mount, then select the one element — the chrome only exists for a selection. */
const mountSelected = (locked = false) => {
  render(
    <StudioCanvas spread={spreadWith(locked)} spreadIndex={0} page={page} zoom={1} pxPerMm={2}
      bookView={false} dropLabel="drop" />
  )
  act(() => { useStudioStore.setState({ selection: ['el-1'] }) })
}

describe('StudioCanvas', () => {
  beforeEach(() => {
    useStudioStore.setState({ selection: [] })
  })

  // The quickbar and the rotation handles were the last chrome in Studio with
  // English written into the JSX, so they stayed English while the panels
  // around them followed the reader's language.
  it('FE-COMP-STUDIOCANVAS-001: the quickbar and the rotation handles are translated', async () => {
    seedStore(useSettingsStore, { settings: buildSettings({ language: 'br' }) })
    mountSelected()

    // The locale bundle is fetched, so the first paint is still English; the assertions wait for it.
    expect(await screen.findByTitle('Duplicar')).toBeInTheDocument()
    expect(screen.getAllByTitle('Girar')).toHaveLength(4)
    expect(screen.getByTitle('Girar à esquerda')).toBeInTheDocument()
    expect(screen.getByTitle('Girar à direita')).toBeInTheDocument()
    expect(screen.getByTitle('Trazer para a frente')).toBeInTheDocument()
    expect(screen.getByTitle('Enviar para trás')).toBeInTheDocument()
    expect(screen.getByTitle('Bloquear')).toBeInTheDocument()
    expect(screen.getByTitle('Excluir')).toBeInTheDocument()
    expect(screen.queryByTitle('Rotate')).not.toBeInTheDocument()
  })

  it('FE-COMP-STUDIOCANVAS-002: the lock button names the press that follows, in the same language', async () => {
    seedStore(useSettingsStore, { settings: buildSettings({ language: 'br' }) })
    mountSelected(true)

    expect(await screen.findByTitle('Desbloquear')).toBeInTheDocument()
    // A locked element keeps its handles hidden, so nothing rotates it by accident.
    expect(screen.queryByTitle('Girar')).not.toBeInTheDocument()
  })
})
