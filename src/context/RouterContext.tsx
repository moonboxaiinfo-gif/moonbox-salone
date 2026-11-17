import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type AppRoute = 
  | 'landing'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'app'
  | 'superadmin'
  | 'book'
  | 'portfolio';

interface RouterContextType {
  currentPath: string;
  route: AppRoute;
  params: Record<string, string>;
  searchParams: URLSearchParams;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

function getInitialPath(): string {
  if (typeof window === 'undefined') return '/';
  if (window.location.hash && window.location.hash.startsWith('#/')) {
    return window.location.hash.slice(1);
  }
  return window.location.pathname || '/';
}

function parseRoute(pathname: string): { route: AppRoute; params: Record<string, string> } {
  // Normalize path
  let cleanPath = pathname.replace(/\/+$/, '') || '/';
  if (cleanPath.startsWith('#/')) {
    cleanPath = cleanPath.slice(1);
  }

  if (cleanPath === '/' || cleanPath === '' || cleanPath === '/index.html') {
    return { route: 'landing', params: {} };
  }
  if (cleanPath === '/login') {
    return { route: 'login', params: {} };
  }
  if (cleanPath === '/register' || cleanPath === '/signup') {
    return { route: 'register', params: {} };
  }
  if (cleanPath === '/forgot-password' || cleanPath === '/reset-password') {
    return { route: 'forgot-password', params: {} };
  }
  if (
    cleanPath === '/moonbox-control-portal' || 
    cleanPath.startsWith('/moonbox-control-portal/') ||
    cleanPath === '/superadmin' || 
    cleanPath.startsWith('/superadmin/')
  ) {
    return { route: 'superadmin', params: {} };
  }
  
  // Public routes for salons: /book/:salonSlug and /portfolio/:salonSlug
  const parts = cleanPath.split('/').filter(Boolean);
  if (parts.length >= 2) {
    if (parts[0] === 'book') {
      return { route: 'book', params: { salonSlug: parts[1] } };
    }
    if (parts[0] === 'portfolio') {
      return { route: 'portfolio', params: { salonSlug: parts[1] } };
    }
  }

  if (cleanPath.startsWith('/app') || cleanPath.startsWith('/dashboard')) {
    return { route: 'app', params: {} };
  }

  // Fallback default
  return { route: 'landing', params: {} };
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(getInitialPath);

  const [searchParams, setSearchParams] = useState<URLSearchParams>(() => {
    return typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  });

  useEffect(() => {
    const handleLocationChange = () => {
      let path = window.location.pathname;
      if (window.location.hash && window.location.hash.startsWith('#/')) {
        path = window.location.hash.slice(1);
      }
      setCurrentPath(path);
      setSearchParams(new URLSearchParams(window.location.search));
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigate = useCallback((to: string) => {
    if (typeof window === 'undefined') return;
    
    // Check if external link
    if (to.startsWith('http://') || to.startsWith('https://')) {
      window.location.href = to;
      return;
    }

    // Scroll to page section anchor (e.g. #pricing, #features)
    if (to.startsWith('#') && !to.startsWith('#/')) {
      const element = document.querySelector(to);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    const [pathname, search] = to.split('?');
    try {
      window.history.pushState(null, '', to);
    } catch {
      // In restricted iframe environments, pushState can fail silently
    }
    setCurrentPath(pathname || '/');
    setSearchParams(new URLSearchParams(search || ''));
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {}
  }, []);

  const { route, params } = parseRoute(currentPath);

  return (
    <RouterContext.Provider value={{ currentPath, route, params, searchParams, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};
