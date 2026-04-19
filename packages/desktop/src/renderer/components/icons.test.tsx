/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { navIcons } from './icons.js';

const iconKeys = ['today', 'calendar', 'notes', 'connectors', 'settings', 'terminal'] as const;

describe('navIcons', () => {
  it('exports all expected icon keys', () => {
    for (const key of iconKeys) {
      expect(navIcons).toHaveProperty(key);
    }
  });

  it('each icon renders an SVG element', () => {
    for (const key of iconKeys) {
      const { container } = render(navIcons[key] as React.ReactElement);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg!.tagName.toLowerCase()).toBe('svg');
    }
  });

  it('each SVG has the expected className', () => {
    for (const key of iconKeys) {
      const { container } = render(navIcons[key] as React.ReactElement);
      const svg = container.querySelector('svg');
      expect(svg!.getAttribute('class')).toBe('w-[18px] h-[18px]');
    }
  });
});
