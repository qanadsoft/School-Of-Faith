import { useEffect, useState } from "react";
import { useAuth } from "../state/auth-context";
import { apiFetch } from "../utils/api";

export function useApi(path) {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const result = await apiFetch(path, {}, token);
        if (active) {
          setData(result);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load your information. Please try again.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (token) {
      load();
    }

    return () => {
      active = false;
    };
  }, [path, token]);

  return { data, loading, error, setData };
}
