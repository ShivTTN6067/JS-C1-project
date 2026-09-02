import { useNavigate } from "react-router-dom";
import { homePath, useSession } from "../session";
import { api } from "../api/client";

export default function WhosWatchingPage() {
  const { profiles, applyAuth, token, setExperience } = useSession();
  const navigate = useNavigate();

  if (!token) {
    navigate("/login?next=/who-is-watching");
    return null;
  }

  async function pick(profileId: number) {
    const result = await api.selectProfile(profileId);
    if (token) {
      applyAuth({
        token,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        account: { id: 0, email: "", name: result.profile.name },
        profile: result.profile,
        profiles,
      });
    }
    setExperience("VR");
    navigate(homePath("VR"));
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090f] px-4 text-white">
      <h1 className="text-3xl font-semibold">Who&apos;s watching?</h1>
      <p className="mt-2 text-sm text-slate-400">
        Kids profiles cannot open Micro Drama from Account.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-6">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => pick(profile.id)}
            className="flex w-32 flex-col items-center gap-3"
          >
            <span
              className={`flex h-24 w-24 items-center justify-center rounded-2xl text-2xl font-bold ${
                profile.type === "KIDS" ? "bg-emerald-600" : "bg-indigo-600"
              }`}
            >
              {profile.name.slice(0, 1)}
            </span>
            <span>{profile.name}</span>
            <span className="text-xs uppercase text-slate-500">{profile.type}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
