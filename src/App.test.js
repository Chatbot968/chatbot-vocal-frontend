import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('react-markdown', () => {
  const React = require('react');
  return ({ children }) => React.createElement('div', {}, children);
});

test('renders NovaCorp header', () => {
  render(<App />);
  const headerElement = screen.getByRole('heading', { name: /NovaCorp/i });
  expect(headerElement).toBeInTheDocument();
});
