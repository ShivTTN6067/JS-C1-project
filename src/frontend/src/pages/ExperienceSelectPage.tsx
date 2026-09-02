import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../session";

export default function ExperienceSelectPage() {
  const { config, loading, setExperience, token } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !config) return;
    if (config.deploymentMode === "VR_ONLY") {
      setExperience("VR");
      navigate("/vr", { replace: true });
    } else if (config.deploymentMode === "MD_ONLY") {
      setExperience("MD");
      navigate("/md", { replace: true });
    }
  }, [config, loading, navigate, setExperience]);

  if (loading || config?.deploymentMode !== "HYBRID") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090f] text-slate-400">
        Loading experience...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090f] px-4 text-white">
      <p className="text-sm uppercase tracking-[0.3em] text-rose-400">VideoReady</p>
      <h1 className="mt-3 text-4xl font-semibold">Choose your experience</h1>
      <p className="mt-2 max-w-md text-center text-slate-400">
        One account. Two isolated catalogs. Pick VideoReady or Micro Drama to continue.
      </p>
      <div className="mt-10 grid w-full max-w-3xl gap-6 sm:grid-cols-2">
        <button
          onClick={() => {
            setExperience("VR");
            navigate(token ? "/who-is-watching" : "/vr");
          }}
          className="rounded-3xl bg-gradient-to-br from-indigo-700 to-slate-900 p-8 text-left shadow-xl ring-1 ring-white/10 hover:ring-indigo-300"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-indigo-200">
            Standard VOD
          </span>
          <h2 className="mt-3 text-2xl font-semibold">VideoReady</h2>
          <p className="mt-2 text-sm text-slate-300">
            Horizontal catalog, documentaries, and classic titles.
          </p>
        </button>
        <button
          onClick={() => {
            setExperience("MD");
            navigate("/md");
          }}
          className="rounded-3xl bg-gradient-to-br from-rose-700 to-slate-900 p-8 text-left shadow-xl ring-1 ring-white/10 hover:ring-rose-300"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-rose-200">
            Vertical series
          </span>
          <h2 className="mt-3 text-2xl font-semibold">Micro Drama</h2>
          <p className="mt-2 text-sm text-slate-300">
            9:16 reel player, cliffhangers, and pack-gated episodes.
          </p>
        </button>
      </div>
    </div>
  );
}
