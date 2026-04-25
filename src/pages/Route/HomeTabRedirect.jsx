import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const HOME_TABS = new Set(['workspace', 'group']);

export function buildHomeTabRedirectLocation(tab = 'workspace', search = '') {
  const searchParams = new URLSearchParams(search || '');
  const normalizedTab = HOME_TABS.has(tab) ? tab : 'workspace';

  searchParams.set('tab', normalizedTab);

  const nextSearch = searchParams.toString();

  return {
    pathname: '/home',
    search: nextSearch ? `?${nextSearch}` : '',
  };
}

function HomeTabRedirect({ tab = 'workspace' }) {
  const location = useLocation();

  return (
    <Navigate
      replace
      to={buildHomeTabRedirectLocation(tab, location.search)}
    />
  );
}

export default HomeTabRedirect;
