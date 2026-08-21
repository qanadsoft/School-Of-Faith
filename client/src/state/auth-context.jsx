import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

const AuthContext = createContext(null);
const STORAGE_KEY = "school-of-faith-auth";

export function AuthProvider({ children }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      setToken(parsed.token);
      setUser(parsed.user);
    }
  }, []);

  function persistAuth(nextToken, nextUser) {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: nextToken, user: nextUser }));
  }

  async function login(credentials) {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    persistAuth(data.token, data.user);
    return data;
  }

  async function register(payload) {
    const data = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    persistAuth(data.token, data.user);
    return data;
  }

  function logout() {
    setToken("");
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
