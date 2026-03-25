import { useEffect, useState } from "react";
import { apiGet } from "./api";

export interface SystemBranding {
  appName: string;
  universityName: string;
  logoDataUrl: string | null;
}

const DEFAULT_BRANDING: SystemBranding = {
  appName: "STAS-RG MS",
  universityName: "Telkom University",
  logoDataUrl: null
};

export function useSystemBranding() {
  const [branding, setBranding] = useState<SystemBranding>(DEFAULT_BRANDING);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const brandingApi = await apiGet<any>("/health/branding");
        if (!active) return;
        setBranding({
          appName: brandingApi?.appName || DEFAULT_BRANDING.appName,
          universityName: brandingApi?.universityName || DEFAULT_BRANDING.universityName,
          logoDataUrl: brandingApi?.logoDataUrl || null
        });
      } catch {
        if (!active) return;
        setBranding(DEFAULT_BRANDING);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onSettingsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<any>;
      const umum = customEvent?.detail?.umum;
      if (!umum) return;
      setBranding({
        appName: umum.appName || DEFAULT_BRANDING.appName,
        universityName: umum.universityName || DEFAULT_BRANDING.universityName,
        logoDataUrl: umum.logoDataUrl || null
      });
    };

    window.addEventListener("stas:settings-updated", onSettingsUpdated as EventListener);
    return () => {
      window.removeEventListener("stas:settings-updated", onSettingsUpdated as EventListener);
    };
  }, []);

  return branding;
}
