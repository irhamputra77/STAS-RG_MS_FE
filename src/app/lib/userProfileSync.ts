import React from "react";
import { getStoredUser, setStoredUser } from "./api";

export function updateStoredUserProfile(payload: Record<string, unknown>) {
  const currentUser = getStoredUser();

  if (!currentUser) return null;

  const updatedUser = {
    ...currentUser,
    ...payload,
  };

  setStoredUser(updatedUser);

  return updatedUser;
}

export function useSyncedStoredUser() {
  const [currentUser, setCurrentUser] = React.useState(() => getStoredUser());

  React.useEffect(() => {
    const syncUser = () => {
      setCurrentUser(getStoredUser());
    };

    window.addEventListener("stas:user-updated", syncUser);
    return () => {
      window.removeEventListener("stas:user-updated", syncUser);
    };
  }, []);

  return currentUser;
}
