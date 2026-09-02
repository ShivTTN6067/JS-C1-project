import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { homePath, useSession } from "../session";
import type { Experience } from "../types";

export function ExperienceShell({ experience }: { experience: Experience }) {
  const { token, profile, logout, config } = useSession();
  const navigate = useNavigate();
  const base = homePath(experience);
  const isMd = experience === "MD";
  const hybrid = !config || config.deploymentMode === "HYBRID";
  const canSwitchToMd = hybrid && profile?.type !== "KIDS";

  return (
    <div className="min-h-screen bg-[#0b0b12] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0b12]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to={base} className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-xs font-bold">
              {isMd ? "MD" : "VR"}
            </span>
            <span className="font-semibold">
              {isMd ? "Micro Drama" : "VideoReady"}
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <NavLink to={`${base}/search`} className={navClass}>
              Search
            </NavLink>
            <NavLink to={`${base}/my-space`} className={navClass}>
              My Space
            </NavLink>
            <NavLink to={`${base}/account`} className={navClass}>
              {isMd ? "Profile" : "Account"}
            </NavLink>
            {token ? (
              <button
                onClick={async () => {
                  await logout();
                  navigate("/");
                }}
                className="rounded-md px-3 py-1.5 text-slate-300 hover:bg-white/10"
              >
                Log out
              </button>
            ) : (
              <Link to={`/login?next=${base}`} className="rounded-md px-3 py-1.5 text-rose-300">
                Log in
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      {canSwitchToMd && !isMd ? (
        <span className="sr-only">Micro Drama is available under Account</span>
      ) : null}
      {isMd && hybrid ? (
        <span className="sr-only">VideoReady is available under Profile</span>
      ) : null}
    </div>
  );
}

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-md px-3 py-1.5 ${isActive ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10"}`;
}
