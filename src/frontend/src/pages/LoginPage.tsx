import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { homePath, useSession } from "../session";

export default function LoginPage() {
  const { applyAuth, setExperience, experience } = useSession();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("priya@example.com");
  const [password, setPassword] = useState("password123");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const next = params.get("next") ?? "";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const session =
        mode === "login"
          ? await api.login(email, password)
          : await api.register(name || "New viewer", email, password);
      applyAuth(session);
      if (next.startsWith("/md")) {
        setExperience("MD");
        navigate(next);
        return;
      }
      if (next.startsWith("/vr")) {
        setExperience("VR");
        navigate("/who-is-watching");
        return;
      }
      if (experience === "MD") navigate(homePath("MD"));
      else navigate("/who-is-watching");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090f] px-4 text-white">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl bg-slate-900 p-6 ring-1 ring-white/10"
      >
        <h1 className="text-2xl font-semibold">
          {mode === "login" ? "Log in" : "Create account"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Demo: priya@example.com (All Access), meera@example.com (Pack 2 Group A),
          arjun@example.com (free). Password: password123.
        </p>
        {mode === "register" && (
          <input
            className="input mt-4 bg-slate-800 text-white"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <input
          className="input mt-4 bg-slate-800 text-white"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input mt-3 bg-slate-800 text-white"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        <button className="mt-5 w-full rounded-md bg-rose-500 py-2 font-medium text-white">
          {mode === "login" ? "Continue" : "Register"}
        </button>
        <button
          type="button"
          className="mt-3 w-full text-sm text-slate-400"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Need an account? Register" : "Have an account? Log in"}
        </button>
        <Link to="/" className="mt-4 block text-center text-sm text-slate-500">
          Back to experience select
        </Link>
      </form>
    </div>
  );
}
