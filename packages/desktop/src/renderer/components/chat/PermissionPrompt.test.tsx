/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PermissionPrompt, type PendingPermission } from './PermissionPrompt.js';
import { TrustBadge } from './TrustBadge.js';

afterEach(cleanup);

const ALL_KINDS = [
  { optionId: 'a1', name: 'Allow once', kind: 'allow_once' },
  { optionId: 'a2', name: 'Always allow', kind: 'allow_always' },
  { optionId: 'r1', name: 'Reject', kind: 'reject_once' },
  { optionId: 'r2', name: 'Always reject', kind: 'reject_always' },
];

const request = (overrides: Partial<PendingPermission> = {}): PendingPermission => ({
  requestId: 'req-1',
  kind: 'edit',
  title: 'Edit answer.ts',
  paths: ['/work/answer.ts'],
  options: ALL_KINDS,
  ...overrides,
});

describe('PermissionPrompt', () => {
  it('renders nothing when nothing is pending', () => {
    const { container } = render(<PermissionPrompt requests={[]} onRespond={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the tool kind, title, and the path the call declared', () => {
    render(<PermissionPrompt requests={[request()]} onRespond={() => {}} />);
    expect(screen.getByTestId('chat-permission-kind')).toHaveTextContent('edit');
    expect(screen.getByTestId('chat-permission-prompt')).toHaveTextContent('Edit answer.ts');
    expect(screen.getByTestId('chat-permission-detail')).toHaveTextContent('/work/answer.ts');
  });

  it('prefers the command over paths for execute calls', () => {
    render(
      <PermissionPrompt
        requests={[request({ kind: 'execute', command: 'rm -rf build', paths: [] })]}
        onRespond={() => {}}
      />,
    );
    expect(screen.getByTestId('chat-permission-detail')).toHaveTextContent('rm -rf build');
  });

  it('renders every option kind as a working button and reports the chosen id', () => {
    const onRespond = vi.fn();
    render(<PermissionPrompt requests={[request()]} onRespond={onRespond} />);
    for (const option of ALL_KINDS) {
      const button = screen.getByTestId(`chat-permission-option-${option.optionId}`);
      expect(button).toHaveTextContent(option.name);
      expect(button).toHaveAttribute('data-option-kind', option.kind);
    }
    fireEvent.click(screen.getByTestId('chat-permission-option-a2'));
    expect(onRespond).toHaveBeenCalledWith('req-1', 'a2');
  });

  it('renders an unknown option kind rather than dropping it', () => {
    const onRespond = vi.fn();
    render(
      <PermissionPrompt
        requests={[request({ options: [{ optionId: 'x', name: 'Sure', kind: 'always_trust_me' }] })]}
        onRespond={onRespond}
      />,
    );
    fireEvent.click(screen.getByTestId('chat-permission-option-x'));
    expect(onRespond).toHaveBeenCalledWith('req-1', 'x');
  });

  it('cancel answers with no option id — never a silent allow', () => {
    const onRespond = vi.fn();
    render(<PermissionPrompt requests={[request()]} onRespond={onRespond} />);
    fireEvent.click(screen.getByTestId('chat-permission-cancel'));
    expect(onRespond).toHaveBeenCalledWith('req-1', undefined);
  });

  it('queues concurrent requests, each answerable on its own id', () => {
    const onRespond = vi.fn();
    render(
      <PermissionPrompt
        requests={[request(), request({ requestId: 'req-2', title: 'Run build' })]}
        onRespond={onRespond}
      />,
    );
    const prompts = screen.getAllByTestId('chat-permission-prompt');
    expect(prompts).toHaveLength(2);
    fireEvent.click(within(prompts[1]!).getByTestId('chat-permission-cancel'));
    expect(onRespond).toHaveBeenCalledWith('req-2', undefined);
  });

  it('renders a degenerate reject-only request rather than showing nothing', () => {
    render(
      <PermissionPrompt
        requests={[request({ options: [{ optionId: 'r1', name: 'Reject', kind: 'reject_once' }] })]}
        onRespond={() => {}}
      />,
    );
    expect(screen.getByTestId('chat-permission-option-r1')).toBeInTheDocument();
  });

  it('announces itself as a decision the user must answer', () => {
    render(<PermissionPrompt requests={[request()]} onRespond={() => {}} />);
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName('Edit answer.ts');
  });
});

describe('TrustBadge', () => {
  it('shows the self-approving copy when the harness declares the quirk', () => {
    render(<TrustBadge quirks={['adapter-mediated', 'permission-routing-gaps']} />);
    const badge = screen.getByTestId('chat-trust-badge');
    expect(badge).toHaveTextContent(/self-approving/i);
    // Honesty check: the copy must not claim srgnt is gating this agent.
    expect(badge).toHaveTextContent(/srgnt cannot gate/i);
  });

  it('renders nothing for a harness that routes permissions properly', () => {
    const { container } = render(<TrustBadge quirks={['adapter-mediated']} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there are no quirks at all', () => {
    const { container } = render(<TrustBadge quirks={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
