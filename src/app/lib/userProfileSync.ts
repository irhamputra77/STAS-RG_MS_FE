import React from "react";
import { getStoredUser } from "./api";

export function updateStoredUserProfile(payload: Record<string, unknown>) {
  const currentUser = getStoredUser();

  if (!currentUser) return null;

  const updatedUser = {
    ...currentUser,
    ...payload,
  };

  localStorage.setItem("user", JSON.stringify(updatedUser));
  window.dispatchEvent(new Event("stas:user-updated"));

  return updatedUser;
}

export function useSyncedStoredUser() {
  const [currentUser, setCurrentUser] = React.useState(() => getStoredUser());

  React.useEffect(() => {
    const syncUser = () => {
      setCurrentUser(getStoredUser());
    };

    window.addEventListener("stas:user-updated", syncUser);
    window.addEventListener("storage", syncUser);

    return () => {
      window.removeEventListener("stas:user-updated", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  return currentUser;
}