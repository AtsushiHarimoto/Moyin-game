import { render, screen } from '@testing-library/react'

// ─── Mock R3F Canvas → plain div (skip children to avoid DOM warnings) ──
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children: _children, ...props }: Record<string, unknown>) => (
    <div data-testid="r3f-canvas" data-gl={JSON.stringify(props.gl)} />
  ),
  useFrame: vi.fn(),
  useThree: vi.fn().mockReturnValue({ clock: { getElapsedTime: () => 0 } }),
}))

vi.mock('@react-three/drei', () => ({
  Float: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Sparkles: () => null,
}))

vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three')
  return { ...actual }
})

import MobisWebGLAvatar from '@/components/effects/MobisWebGLAvatar'

describe('MobisWebGLAvatar', () => {
  it('renders the Canvas container', () => {
    render(<MobisWebGLAvatar />)
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument()
  })

  it('applies fixed positioning classes', () => {
    const { container } = render(<MobisWebGLAvatar />)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('fixed')
    expect(wrapper.className).toContain('bottom-6')
    expect(wrapper.className).toContain('left-6')
    expect(wrapper.className).toContain('z-50')
  })

  it('has correct dimensions (w-64 h-80)', () => {
    const { container } = render(<MobisWebGLAvatar />)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('w-64')
    expect(wrapper.className).toContain('h-80')
  })

  it('passes alpha:true to Canvas gl config', () => {
    render(<MobisWebGLAvatar />)
    const canvas = screen.getByTestId('r3f-canvas')
    const gl = JSON.parse(canvas.getAttribute('data-gl') ?? '{}')
    expect(gl.alpha).toBe(true)
  })

  it('renders without crashing on repeated mount/unmount', () => {
    const { unmount } = render(<MobisWebGLAvatar />)
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument()
    unmount()

    render(<MobisWebGLAvatar />)
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument()
  })
})
