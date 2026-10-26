import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

const createToken = (payload) => {
  const encode = (value) => window.btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
};

const renderDashboard = () => render(
  <MemoryRouter initialEntries={['/dashboard']}>
    <Routes>
      <Route
        path="/dashboard"
        element={(
          <ProtectedRoute path="/dashboard">
            <div>Protected dashboard</div>
          </ProtectedRoute>
        )}
      />
      <Route path="/login" element={<div>Login page</div>} />
    </Routes>
  </MemoryRouter>
);

beforeEach(() => {
  localStorage.clear();
});

test('redirects to login without a session', () => {
  renderDashboard();

  expect(screen.getByText('Login page')).toBeInTheDocument();
});

test('redirects to login for an expired JWT', () => {
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('accessToken', createToken({
    sub: 'user-id',
    exp: Math.floor(Date.now() / 1000) - 1
  }));

  renderDashboard();

  expect(screen.getByText('Login page')).toBeInTheDocument();
  expect(localStorage.getItem('accessToken')).toBeNull();
});

test('renders the protected page for a valid JWT and matching role', () => {
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('roleId', 'ROLE_ADMIN');
  localStorage.setItem('accessToken', createToken({
    sub: 'user-id',
    exp: Math.floor(Date.now() / 1000) + 60
  }));

  renderDashboard();

  expect(screen.getByText('Protected dashboard')).toBeInTheDocument();
});
