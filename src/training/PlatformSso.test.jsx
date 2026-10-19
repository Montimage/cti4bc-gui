import React, { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import PlatformSso from './PlatformSso';

const originalLocation = window.location;
const originalFetch = global.fetch;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  delete window.location;
  window.location = { pathname: '/sso', search: '?theme=dark', hash: '#token=synthetic-single-use-token', replace: jest.fn() };
  jest.spyOn(window.history, 'replaceState').mockImplementation(() => {});
});
afterEach(() => {
  window.location = originalLocation;
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

test('exchanges a fragment token only once in StrictMode, then uses normal CTI storage', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ access: 'synthetic-access', refresh: 'synthetic-refresh', training: true }) });
  localStorage.setItem('authToken', 'old-session');
  render(<StrictMode><PlatformSso /></StrictMode>);
  await waitFor(() => expect(window.location.replace).toHaveBeenCalledWith('/events'));
  expect(global.fetch).toHaveBeenCalledTimes(1);
  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toMatch(/\/api\/certsync-training\/sso\/$/);
  expect(JSON.parse(options.body)).toEqual({ token: 'synthetic-single-use-token' });
  expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/sso?theme=dark');
  expect(localStorage.getItem('accessToken')).toBe('synthetic-access');
  expect(localStorage.getItem('refreshToken')).toBe('synthetic-refresh');
  expect(localStorage.getItem('authToken')).toBeNull();
  expect(localStorage.getItem('theme')).toBe('dark');
});

test('refused sign-on clears the previous session and gives the platform instruction', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false });
  localStorage.setItem('accessToken', 'old-session');
  render(<PlatformSso />);
  expect(await screen.findByRole('alert')).toHaveTextContent("Open this from the platform's Training tab");
  expect(localStorage.getItem('accessToken')).toBeNull();
  expect(window.location.replace).not.toHaveBeenCalled();
});

test('missing fragment never makes a backend request', async () => {
  window.location.hash = '';
  global.fetch = jest.fn();
  render(<PlatformSso />);
  expect(await screen.findByRole('alert')).toHaveTextContent("Open this from the platform's Training tab");
  expect(global.fetch).not.toHaveBeenCalled();
});
