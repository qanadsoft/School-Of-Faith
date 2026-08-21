import { useMemo, useState } from "react";
import { Download, HeartHandshake, LogOut, MessageSquareHeart, Receipt, Ticket, UserRoundCog } from "lucide-react";
import Dashboard from "../components/Dashboard";
import MemberActivity from "../components/MemberActivity";
import ProfileHeader from "../components/ProfileHeader";
import ProfileMenuItem from "../components/ProfileMenuItem";
import SectionCard from "../components/SectionCard";
import StatePanel from "../components/StatePanel";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../state/auth-context";
import { apiFetch } from "../utils/api";
import { formatCurrency, formatDate, formatDateTime } from "../utils/format";

const sections = [
  { key: "savedMessages", title: "Saved Messages", subtitle: "Messages you’ve set aside to revisit.", icon: MessageSquareHeart },
  { key: "downloads", title: "My Downloads", subtitle: "Resources ready whenever you need them.", icon: Download },
  { key: "donations", title: "Giving History", subtitle: "Completed donations shown first.", icon: Receipt },
  { key: "prayerRequests", title: "Prayer Requests", subtitle: "Share updates and mark answered prayers.", icon: HeartHandshake },
  { key: "tickets", title: "Event Tickets", subtitle: "Registrations, attendance, and ticket status.", icon: Ticket },
  { key: "activity", title: "Recent Activity", subtitle: "Everything happening across your member journey.", icon: UserRoundCog },
];

export default function MemberPage() {
  const { logout, token, user } = useAuth();
  const profile = useApi("/member/profile");
  const dashboard = useApi("/member/dashboard");
  const savedMessages = useApi("/member/saved-messages");
  const downloads = useApi("/member/downloads");
  const donations = useApi("/member/donations");
  const prayerRequests = useApi("/member/prayer-requests");
  const tickets = useApi("/member/tickets");
  const activity = useApi("/member/activity");
  const [activeSection, setActiveSection] = useState("savedMessages");
  const [form, setForm] = useState({ title: "", details: "", status: "Active", isPrivate: true });
  const [submittingPrayer, setSubmittingPrayer] = useState(false);

  const sectionData = useMemo(
    () => ({
      savedMessages,
      downloads,
      donations,
      prayerRequests,
      tickets,
      activity,
    }),
    [activity, donations, downloads, prayerRequests, savedMessages, tickets]
  );

  async function removeSavedMessage(id) {
    await apiFetch(`/member/saved-messages/${id}`, { method: "DELETE" }, token);
    savedMessages.setData((current) => current.filter((item) => item.id !== id));
  }

  async function submitPrayerRequest(event) {
    event.preventDefault();
    try {
      setSubmittingPrayer(true);
      const result = await apiFetch(
        "/member/prayer-requests",
        { method: "POST", body: JSON.stringify(form) },
        token
      );
      prayerRequests.setData((current) => [result, ...(current || [])]);
      setForm({ title: "", details: "", status: "Active", isPrivate: true });
    } finally {
      setSubmittingPrayer(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff4db_0,#f8efe3_30%,#eef4ff_100%)] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-[32px] border border-white/70 bg-white/75 px-5 py-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">The School Of Faith</p>
            <h1 className="mt-1 font-serif text-3xl text-slate-900">Member Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            {user?.roles?.includes("admin") ? (
              <a href="/admin" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900">
                Admin Panel
              </a>
            ) : null}
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.65fr_0.95fr]">
          <div className="space-y-6">
            <StatePanel
              loading={profile.loading}
              error={profile.error}
              hasData={Boolean(profile.data)}
              emptyText="No member profile found."
            >
              <ProfileHeader profile={profile.data} />
            </StatePanel>

            <StatePanel
              loading={dashboard.loading}
              error={dashboard.error}
              hasData={Boolean(dashboard.data)}
              emptyText="No dashboard data available yet."
            >
              <Dashboard dashboard={dashboard.data} />
            </StatePanel>
          </div>

          <aside className="space-y-3">
            {sections.map((section) => {
              const payload = sectionData[section.key];
              const count = Array.isArray(payload.data) ? payload.data.length : 0;
              return (
                <ProfileMenuItem
                  key={section.key}
                  title={section.title}
                  subtitle={section.subtitle}
                  count={count}
                  active={activeSection === section.key}
                  onClick={() => setActiveSection(section.key)}
                />
              );
            })}
          </aside>
        </div>

        <div className="mt-6">
          {activeSection === "savedMessages" ? (
            <SectionCard title="Saved Messages" subtitle="Title, speaker, date saved, and direct links back to the original message.">
              <StatePanel
                loading={savedMessages.loading}
                error={savedMessages.error}
                hasData={Boolean(savedMessages.data?.length)}
                emptyText="No saved messages yet."
              >
                <div className="space-y-3">
                  {savedMessages.data?.map((item) => (
                    <div key={item.id} className="flex flex-col gap-4 rounded-[24px] border border-slate-100 bg-slate-50/80 p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.speaker} • {item.category} • Saved {formatDate(item.saved_at)}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <a href={item.original_url} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                          Open
                        </a>
                        <button type="button" onClick={() => removeSavedMessage(item.id)} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </StatePanel>
            </SectionCard>
          ) : null}

          {activeSection === "downloads" ? (
            <SectionCard title="My Downloads" subtitle="Content type, timestamp, and resource links.">
              <StatePanel
                loading={downloads.loading}
                error={downloads.error}
                hasData={Boolean(downloads.data?.length)}
                emptyText="No downloads yet."
              >
                <div className="space-y-3">
                  {downloads.data?.map((item) => (
                    <div key={item.id} className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-base font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {item.resource_type} • {formatDateTime(item.downloaded_at)}
                          </p>
                        </div>
                        <a href={item.resource_url} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                          Resource Link
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </StatePanel>
            </SectionCard>
          ) : null}

          {activeSection === "donations" ? (
            <SectionCard title="Giving History" subtitle="Completed gifts appear first, with full transaction details.">
              <StatePanel
                loading={donations.loading}
                error={donations.error}
                hasData={Boolean(donations.data?.length)}
                emptyText="No giving history yet."
              >
                <div className="space-y-3">
                  {donations.data?.map((item) => (
                    <div key={item.id} className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
                      <div className="grid gap-3 md:grid-cols-[1.2fr_repeat(4,0.8fr)]">
                        <div>
                          <p className="text-base font-semibold text-slate-900">{formatCurrency(item.amount, item.currency)}</p>
                          <p className="text-sm text-slate-500">{item.donation_type}</p>
                        </div>
                        <div className="text-sm text-slate-600">{formatDate(item.donated_at)}</div>
                        <div className="text-sm text-slate-600">{item.method}</div>
                        <div className="text-sm text-slate-600">{item.transaction_id}</div>
                        <div className="text-sm font-semibold text-slate-700">{item.status}</div>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{item.campaign || "General Fund"}</p>
                    </div>
                  ))}
                </div>
              </StatePanel>
            </SectionCard>
          ) : null}

          {activeSection === "prayerRequests" ? (
            <SectionCard
              title="Prayer Requests"
              subtitle="Create, review, mark answered, and archive your personal requests."
              action={
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  Personal + Secure
                </span>
              }
            >
              <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
                <form onSubmit={submitPrayerRequest} className="space-y-4 rounded-[28px] border border-[#eadfca] bg-[#fffaf1] p-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Title</label>
                    <input
                      value={form.title}
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Details</label>
                    <textarea
                      rows="5"
                      value={form.details}
                      onChange={(event) => setForm((current) => ({ ...current, details: event.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    />
                  </div>
                  <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                    {submittingPrayer ? "Saving..." : "Add Request"}
                  </button>
                </form>
                <StatePanel
                  loading={prayerRequests.loading}
                  error={prayerRequests.error}
                  hasData={Boolean(prayerRequests.data?.length)}
                  emptyText="No prayer requests yet."
                >
                  <div className="space-y-3">
                    {prayerRequests.data?.map((item) => (
                      <div key={item.id} className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold text-slate-900">{item.title}</p>
                            <p className="mt-1 text-sm text-slate-500">{item.details}</p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </StatePanel>
              </div>
            </SectionCard>
          ) : null}

          {activeSection === "tickets" ? (
            <SectionCard title="Event Tickets" subtitle="Event, ticket number, registration date, attendance, and ticket status.">
              <StatePanel
                loading={tickets.loading}
                error={tickets.error}
                hasData={Boolean(tickets.data?.length)}
                emptyText="No event tickets yet."
              >
                <div className="space-y-3">
                  {tickets.data?.map((item) => (
                    <div key={item.id} className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
                      <div className="grid gap-3 md:grid-cols-[1.5fr_repeat(4,0.8fr)]">
                        <div>
                          <p className="text-base font-semibold text-slate-900">{item.event_title}</p>
                          <p className="text-sm text-slate-500">{item.ticket_number}</p>
                        </div>
                        <div className="text-sm text-slate-600">{formatDate(item.registration_date)}</div>
                        <div className="text-sm text-slate-600">{item.attendance_status}</div>
                        <div className="text-sm font-semibold text-slate-700">{item.ticket_status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </StatePanel>
            </SectionCard>
          ) : null}

          {activeSection === "activity" ? (
            <SectionCard title="Recent Activity" subtitle="Sourced directly from the central member activity log.">
              <StatePanel
                loading={activity.loading}
                error={activity.error}
                hasData={Boolean(activity.data?.length)}
                emptyText="No recent activity yet."
              >
                <MemberActivity items={activity.data || []} />
              </StatePanel>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </main>
  );
}
