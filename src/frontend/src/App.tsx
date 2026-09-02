import { Link, Navigate, Outlet, Route, Routes } from "react-router-dom";
import TicketListPage from "./pages/TicketListPage";
import TicketCreatePage from "./pages/TicketCreatePage";
import TicketDetailPage from "./pages/TicketDetailPage";
import UserListPage from "./pages/UserListPage";
import UserProfilePage from "./pages/UserProfilePage";
import ExperienceSelectPage from "./pages/ExperienceSelectPage";
import LoginPage from "./pages/LoginPage";
import WhosWatchingPage from "./pages/WhosWatchingPage";
import HomePage from "./pages/HomePage";
import SeriesPage from "./pages/SeriesPage";
import PlayerPage from "./pages/PlayerPage";
import MySpacePage from "./pages/MySpacePage";
import SearchPage from "./pages/SearchPage";
import AccountPage from "./pages/AccountPage";
import { ExperienceShell } from "./components/ExperienceShell";

function TicketShell() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/tickets" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              ST
            </span>
            <span className="text-lg font-semibold text-slate-900">Support Tickets</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              VideoReady
            </Link>
            <Link
              to="/users"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Profiles
            </Link>
            <Link
              to="/tickets/new"
              className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
            >
              New Ticket
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ExperienceSelectPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/who-is-watching" element={<WhosWatchingPage />} />
      <Route path="/md" element={<ExperienceShell experience="MD" />}>
        <Route index element={<HomePage experience="MD" />} />
        <Route path="search" element={<SearchPage experience="MD" />} />
        <Route path="my-space" element={<MySpacePage experience="MD" />} />
        <Route path="account" element={<AccountPage experience="MD" />} />
        <Route path="series/:id" element={<SeriesPage experience="MD" />} />
        <Route path="watch/:episodeId" element={<PlayerPage experience="MD" />} />
      </Route>
      <Route path="/vr" element={<ExperienceShell experience="VR" />}>
        <Route index element={<HomePage experience="VR" />} />
        <Route path="search" element={<SearchPage experience="VR" />} />
        <Route path="my-space" element={<MySpacePage experience="VR" />} />
        <Route path="account" element={<AccountPage experience="VR" />} />
        <Route path="series/:id" element={<SeriesPage experience="VR" />} />
        <Route path="watch/:episodeId" element={<PlayerPage experience="VR" />} />
      </Route>
      <Route element={<TicketShell />}>
        <Route path="/tickets" element={<TicketListPage />} />
        <Route path="/tickets/new" element={<TicketCreatePage />} />
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
        <Route path="/users" element={<UserListPage />} />
        <Route path="/users/:id" element={<UserProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
