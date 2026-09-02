import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, getStoredToken, setStoredToken } from "./api/client";
import type {
  AuthSession,
  DeploymentMode,
  Experience,
  PlatformConfig,
  ViewerProfile,
} from "./types";

const EXPERIENCE_KEY = "videoready.experience";

interface SessionState {
  token: string | null;
  accountName: string | null;
  profile: ViewerProfile | null;
  profiles: ViewerProfile[];
  config: PlatformConfig | null;
  experience: Experience | null;
  loading: boolean;
  setExperience: (experience: Experience | null) => void;
  applyAuth: (session: AuthSession) => void;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [accountName, setAccountName] = useState<string | null>(null);
  const [profile, setProfile] = useState<ViewerProfile | null>(null);
  const [profiles, setProfiles] = useState<ViewerProfile[]>([]);
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [experience, setExperienceState] = useState<Experience | null>(() => {
    const stored = localStorage.getItem(EXPERIENCE_KEY);
    return stored === "MD" || stored === "VR" ? stored : null;
  });
  const [loading, setLoading] = useState(true);

  const setExperience = useCallback((next: Experience | null) => {
    setExperienceState(next);
    if (next) localStorage.setItem(EXPERIENCE_KEY, next);
    else localStorage.removeItem(EXPERIENCE_KEY);
  }, []);

  const applyAuth = useCallback((session: AuthSession) => {
    setStoredToken(session.token);
    setToken(session.token);
    setAccountName(session.account.name);
    setProfile(session.profile);
    setProfiles(session.profiles);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // token may already be invalid
    }
    setStoredToken(null);
    setToken(null);
    setAccountName(null);
    setProfile(null);
    setProfiles([]);
    setExperience(null);
  }, [setExperience]);

  const refreshMe = useCallback(async () => {
    if (!getStoredToken()) {
      setToken(null);
      return;
    }
    try {
      const me = await api.me();
      setAccountName(me.account.name);
      setProfiles(me.profiles);
      setProfile(me.profiles.find((p) => p.id === me.profileId) ?? me.profiles[0] ?? null);
    } catch {
      setStoredToken(null);
      setToken(null);
      setAccountName(null);
      setProfile(null);
      setProfiles([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await api.getPlatformConfig();
        if (!cancelled) {
          setConfig(cfg);
          if (cfg.deploymentMode === "VR_ONLY") setExperience("VR");
          if (cfg.deploymentMode === "MD_ONLY") setExperience("MD");
        }
        await refreshMe();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMe, setExperience]);

  const value = useMemo<SessionState>(
    () => ({
      token,
      accountName,
      profile,
      profiles,
      config,
      experience,
      loading,
      setExperience,
      applyAuth,
      logout,
      refreshMe,
    }),
    [
      token,
      accountName,
      profile,
      profiles,
      config,
      experience,
      loading,
      setExperience,
      applyAuth,
      logout,
      refreshMe,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

export function homePath(experience: Experience) {
  return experience === "MD" ? "/md" : "/vr";
}

export function modeLabel(mode: DeploymentMode) {
  if (mode === "VR_ONLY") return "VideoReady only";
  if (mode === "MD_ONLY") return "Micro Drama only";
  return "Hybrid";
}
