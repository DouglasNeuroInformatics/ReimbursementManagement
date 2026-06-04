import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '../../test/renderWithProviders'
import { Select } from './Select'

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
]

describe('Select', () => {
  it('renders the options and a disabled placeholder', () => {
    render(<Select label="Type" placeholder="Choose one" options={OPTIONS} />)
    expect(screen.getByLabelText('Type')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Choose one' })).toBeDisabled()
    expect(screen.getByRole('option', { name: 'Alpha' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Beta' })).toBeInTheDocument()
  })

  it('fires onChange when a new option is selected', async () => {
    const onChange = vi.fn()
    render(<Select label="Type" value="a" onChange={onChange} options={OPTIONS} />)
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'b')
    expect(onChange).toHaveBeenCalled()
  })

  it('renders an error message when provided', () => {
    render(<Select label="Type" error="Pick one" options={OPTIONS} />)
    expect(screen.getByText('Pick one')).toBeInTheDocument()
  })
})
