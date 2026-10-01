import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the inventory login screen', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'CBBS Inventory System' })).toBeInTheDocument();
});
