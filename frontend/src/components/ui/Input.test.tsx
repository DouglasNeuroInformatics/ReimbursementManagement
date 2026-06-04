import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '../../test/renderWithProviders'
import { Input } from './Input'

describe('Input', () => {
  it('links the label to the input via a derived id', () => {
    render(<Input label="Email Address" />)
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
  })

  it('renders an error message when provided', () => {
    render(<Input label="Email" error="Required" />)
    expect(screen.getByText('Required')).toBeInTheDocument()
  })

  it('forwards keystrokes through onChange', async () => {
    const onChange = vi.fn()
    render(<Input label="Name" value="" onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Name'), 'Hi')
    expect(onChange).toHaveBeenCalled()
  })

  it('forwards native input attributes', () => {
    render(<Input label="Name" placeholder="Type here" disabled />)
    expect(screen.getByPlaceholderText('Type here')).toBeDisabled()
  })
})
