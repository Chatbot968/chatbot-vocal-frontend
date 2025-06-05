import { render, screen } from '@testing-library/react';
import App from './App';

test('renders NovaCorp header', () => {
  render(<App />);
  const headerElement = screen.getByRole('heading', { name: /NovaCorp/i });
  expect(headerElement).toBeInTheDocument();
});
