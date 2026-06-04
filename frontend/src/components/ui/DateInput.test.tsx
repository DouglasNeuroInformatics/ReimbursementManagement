import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '../../test/renderWithProviders'
import { DateInput } from './DateInput'

describe('DateInput', () => {
  it('renders the visible ISO text field with its value and placeholder', () => {
    render(<DateInput label="Date" value="2026-02-01" onChange={() => {}} />)
    const el = screen.getByLabelText('Date')
    expect(el).toHaveValue('2026-02-01')
    expect(el).toHaveAttribute('placeholder', 'YYYY-MM-DD')
  })

  it('calls onChange as the text field is edited', async () => {
    const onChange = vi.fn()
    render(<DateInput label="Date" value="" onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Date'), '2026')
    expect(onChange).toHaveBeenCalled()
  })
})
