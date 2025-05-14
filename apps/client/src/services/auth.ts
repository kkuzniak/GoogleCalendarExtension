import { API_URL } from "./constants";

export const authWithGoogle = async () => {
  window.location.href = (`${API_URL}/auth/google`);
};

export const checkGoogleAuth = async () => {
  try {
    const response = await fetch(`${API_URL}/auth/check`, {
      credentials: 'include',
    });
  
    return response.ok;
  } catch {
    return false;
  }
};

