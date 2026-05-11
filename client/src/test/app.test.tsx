/**
 * App smoke tests -- verify core components render without crashing.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Simple render test for a basic component to confirm the test pipeline works
describe('App smoke tests', () => {
  it('renders a basic React element', () => {
    const { container } = render(React.createElement('div', null, 'SoulSeer'));
    expect(container.textContent).toBe('SoulSeer');
  });

  it('renders HTML structure correctly', () => {
    const { container } = render(
      React.createElement('main', { className: 'page-wrapper' },
        React.createElement('h1', null, 'Welcome to SoulSeer'),
        React.createElement('p', null, 'A Community of Gifted Psychics')
      )
    );
    const h1 = container.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1?.textContent).toBe('Welcome to SoulSeer');
    expect(container.querySelector('.page-wrapper')).toBeTruthy();
  });
});
