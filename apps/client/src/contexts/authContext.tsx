import { createContext, useState, useEffect } from 'react';
import { checkGoogleAuth } from '../services/auth';

export const AuthContext = createContext<{
  isAuthenticated: boolean;
  checkAuth: () => Promise<void>;
}>({
  isAuthenticated: false,
  checkAuth: async () => {},
});


// I know we could use useQuery here instead to make it simpler, but don't have time for this now
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = async () => {
    const isAuth = await checkGoogleAuth();
    setIsAuthenticated(isAuth);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};