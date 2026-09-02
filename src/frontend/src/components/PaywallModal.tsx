import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { PackCode, PaywallDetails, SubscriptionPack } from "../types";

export function PaywallModal({
  details,
  onClose,
  onSubscribed,
}: {
  details: PaywallDetails;
  onClose: () => void;
  onSubscribed: () => void;
}) {
  const [cycle, setCycle] = useState<"WEEKLY" | "ANNUAL">("WEEKLY");
  const [groupId, setGroupId] = useState(details.entitlementGroups[0]?.id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const packs = details.packs.filter((p) => p.billingCycle === cycle);

  async function buy(pack: SubscriptionPack) {
    setBusy(true);
    setError(null);
    try {
      await api.subscribe({
        packCode: pack.code as PackCode,
        billingCycle: cycle,
        purchaseChannel: "WEB",
        entitlementGroupId: pack.code === "PACK_2" ? groupId : undefined,
      });
      onSubscribed();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Purchase failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 p-6 text-white shadow-2xl ring-1 ring-white/10">
        <p className="text-xs uppercase tracking-widest text-rose-400">Paywall</p>
        <h2 className="mt-1 text-2xl font-semibold">
          {details.cliffhanger ? "The cliffhanger continues after this..." : "Unlock the next episode"}
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Subscribe to a pack to keep watching. Entitlements apply on web and mobile from one account.
        </p>

        <div className="mt-4 flex gap-2">
          {(["WEEKLY", "ANNUAL"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                cycle === c ? "bg-rose-500 text-white" : "bg-white/10 text-slate-200"
              }`}
            >
              {c === "WEEKLY" ? "Weekly" : "Annual"}
            </button>
          ))}
        </div>

        {packs.some((p) => p.code === "PACK_2") && (
          <label className="mt-4 block text-sm text-slate-300">
            Pack 2 entitlement group
            <select
              className="mt-1 w-full rounded-md bg-slate-800 px-3 py-2 text-white"
              value={groupId}
              onChange={(e) => setGroupId(Number(e.target.value))}
            >
              {details.entitlementGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <ul className="mt-4 space-y-2">
          {packs.map((pack) => (
            <li key={`${pack.code}-${pack.billingCycle}`}>
              <button
                disabled={busy}
                onClick={() => buy(pack)}
                className="flex w-full items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-left hover:bg-white/10"
              >
                <span>
                  <span className="block font-medium">{pack.name}</span>
                  <span className="text-xs text-slate-400">{pack.description}</span>
                </span>
                <span className="text-sm font-semibold text-rose-300">
                  ${(pack.priceCents / 100).toFixed(2)}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="text-sm text-slate-400 hover:text-white">
            Not now
          </button>
          <Link to="/login" className="text-sm text-rose-300 hover:text-rose-200">
            Need to log in?
          </Link>
        </div>
      </div>
    </div>
  );
}

export function LoginPrompt({
  onClose,
  nextPath,
}: {
  onClose: () => void;
  nextPath: string;
}) {
  const [visible, setVisible] = useState(true);
  useEffect(() => setVisible(true), []);
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-6 text-white ring-1 ring-white/10">
        <h2 className="text-xl font-semibold">Log in to watch</h2>
        <p className="mt-2 text-sm text-slate-300">
          Guest browsing is open. Playing content requires an account.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={() => {
              setVisible(false);
              onClose();
            }}
            className="text-sm text-slate-400"
          >
            Keep browsing
          </button>
          <Link
            to={`/login?next=${encodeURIComponent(nextPath)}`}
            className="rounded-md bg-rose-500 px-3 py-2 text-sm font-medium text-white"
          >
            Log in / Register
          </Link>
        </div>
      </div>
    </div>
  );
}
