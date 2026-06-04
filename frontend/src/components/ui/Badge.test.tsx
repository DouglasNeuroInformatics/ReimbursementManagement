import { beforeAll, describe, expect, it } from 'vitest'
import { renderWithProviders, screen } from '../../test/renderWithProviders'
import i18n from '../../i18n'
import { Badge, StatusBadge } from './Badge'

beforeAll(async () => {
  await i18n.changeLanguage('en-CA')
})

describe('Badge', () => {
  it('renders its children', () => {
    renderWithProviders(<Badge>Custom label</Badge>)
    expect(screen.getByText('Custom label')).toBeInTheDocument()
  })
})

describe('StatusBadge', () => {
  it('renders the localized status label from the enums namespace', () => {
    renderWithProviders(<StatusBadge status="PAID" />)
    expect(screen.getByText(i18n.t('enums:status.PAID') as string)).toBeInTheDocument()
  })
})
