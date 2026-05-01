import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/pages/Route/protectedRoute';
import { __resetForTests, setAccessToken } from '@/utils/tokenStorage';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetForTests();
  });

  it('TC-S01: redirects a USER away from the super-admin route', () => {
    setAccessToken('token');
    window.localStorage.setItem('user', JSON.stringify({ role: 'USER', email: 'user@example.com' }));

    render(
      <MemoryRouter initialEntries={['/super-admin']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
            <Route path="/super-admin" element={<div>Super Admin Screen</div>} />
          </Route>
          <Route path="/home" element={<div>User Home Screen</div>} />
          <Route path="/login" element={<div>Login Screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('User Home Screen')).toBeInTheDocument();
    expect(screen.queryByText('Super Admin Screen')).not.toBeInTheDocument();
  });
});
