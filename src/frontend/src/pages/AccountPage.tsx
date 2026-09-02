import { useNavigate } from "react-router-dom";
import { homePath, useSession } from "../session";
import type { Experience } from "../types";

export default function AccountPage({ experience }: { experience: Experience }) {
  const { profile, config, setExperience, token } = useSession();
  const navigate = useNavigate();
  const hybrid = !config || config.deploymentMode === "HYBRID";
  const isKids = profile?.type === "KIDS";

  function switchTo(next: Experience) {
    setExperience(next);
    if (next === "VR") navigate("/who-is-watching");
    else navigate(homePath("MD"));
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">{experience === "MD" ? "Profile" : "Account"}</h1>
      <p className="mt-2 text-sm text-slate-400">
        Signed in as {profile?.name ?? (token ? "Regular profile" : "Guest")}. Shared account and
        entitlements apply across VideoReady and Micro Drama.
      </p>

      {hybrid && experience === "VR" && !isKids && (
        <button
          onClick={() => switchTo("MD")}
          className="mt-6 w-full rounded-xl bg-rose-600 px-4 py-3 text-left font-medium"
        >
          Switch to Micro Drama
        </button>
      )}

      {hybrid && experience === "VR" && isKids && (
        <p className="mt-6 rounded-xl bg-white/5 p-4 text-sm text-slate-400">
          Micro Drama is hidden for Kids profiles.
        </p>
      )}

      {hybrid && experience === "MD" && (
        <button
          onClick={() => switchTo("VR")}
          className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-left font-medium"
        >
          Switch to VideoReady
        </button>
      )}

      <p className="mt-6 text-xs text-slate-500">
        Deployment mode: {config?.deploymentMode ?? "HYBRID"}. Ad slot every {config?.adSlotEveryN ?? 4}{" "}
        items.
      </p>
    </div>
  );
}
