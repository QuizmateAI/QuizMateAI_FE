import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import HomeTabRedirect from '@/Pages/Route/HomeTabRedirect';

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
}

describe('HomeTabRedirect', () => {
  it('TC-S02: redirects /workspaces/ to the workspace tab on home', () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/?source=legacy']}>
        <Routes>
          <Route path="/workspaces" element={<HomeTabRedirect tab="workspace" />} />
          <Route path="/home" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    const redirectedLocation = screen.getByTestId('location').textContent;
    const searchParams = new URLSearchParams(redirectedLocation?.split('?')[1] ?? '');

    expect(redirectedLocation?.startsWith('/home')).toBe(true);
    expect(searchParams.get('source')).toBe('legacy');
    expect(searchParams.get('tab')).toBe('workspace');
  });

  it('TC-S03: redirects /group-workspaces to the group tab on home', () => {
    render(
      <MemoryRouter initialEntries={['/group-workspaces']}>
        <Routes>
          <Route path="/group-workspaces" element={<HomeTabRedirect tab="group" />} />
          <Route path="/home" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    const redirectedLocation = screen.getByTestId('location').textContent;
    const searchParams = new URLSearchParams(redirectedLocation?.split('?')[1] ?? '');

    expect(redirectedLocation?.startsWith('/home')).toBe(true);
    expect(searchParams.get('tab')).toBe('group');
  });
});
