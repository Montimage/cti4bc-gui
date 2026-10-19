import { render, screen } from '@testing-library/react';
import App from './App';
import { ThemeProvider } from './ThemeContext';

test('normal login remains available with training disabled', () => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('theme', 'light');
  window.history.replaceState(null, '', '/');
  render(<ThemeProvider><App /></ThemeProvider>);
  expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
});
