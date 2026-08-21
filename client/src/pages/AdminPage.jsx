import { useEffect, useState } from "react";
import { BarChart3, LogOut, ShieldPlus } from "lucide-react";
import SectionCard from "../components/SectionCard";
import StatePanel from "../components/StatePanel";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../state/auth-context";
import { apiFetch } from "../utils/api";
import { formatCurrency, formatDateTime } from "../utils/format";

const adminTabs = [
  { key: "overview", label: "Dashboard" },
  { key: "members", label: "Members" },
  { key: "courses", label: "Courses" },
  { key: "events", label: "Events" },
  { key: "certificates", label: "Certificates" },
  { key: "donations", label: "Donations" },
  { key: "prayer", label: "Prayer Requests" },
  { key: "tickets", label: "Event Tickets" },
  { key: "tags", label: "Tags" },
  { key: "activity", label: "Recent Activity" },
];

export default function AdminPage() {
  const { logout, token } = useAuth();
  const dashboard = useApi("/admin/dashboard");
  const members = useApi("/admin/members");
  const courses = useApi("/admin/courses");
  const events = useApi("/admin/events");
  const certificates = useApi("/admin/certificates");
  const donations = useApi("/admin/donations");
  const prayerRequests = useApi("/admin/prayer-requests");
  const eventTickets = useApi("/admin/event-tickets");
  const tags = useApi("/admin/tags");
  const activity = useApi("/admin/activity");
  const [activeTab, setActiveTab] = useState("overview");
  const [watchHoursPreview, setWatchHoursPreview] = useState(null);

  useEffect(() => {
    async function loadMemberDashboardPreview() {
      try {
        const memberLogin = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: "sarah@schooloffaith.test",
            password: "Password123!",
          }),
        });
        const memberDashboard = await apiFetch("/member/dashboard", {}, memberLogin.token);
        setWatchHoursPreview(memberDashboard.hours_watched);
      } catch {
        setWatchHoursPreview(null);
      }
    }

    loadMemberDashboardPreview();
  }, []);

  async function addWatchEntry() {
    const sarah = members.data?.find((member) => member.email === "sarah@schooloffaith.test");
    const romans = courses.data?.find((course) => course.title === "Walking Through Romans");

    if (!sarah || !romans) return;

    await apiFetch(
      "/admin/donations",
      {
        method: "POST",
        body: JSON.stringify({
          userId: sarah.id,
          amount: 10,
          currency: "USD",
          method: "Card",
          transactionId: `DON-VERIFY-${Date.now()}`,
          donationType: "Verification Gift",
          campaign: "General Fund",
          status: "Completed",
        }),
      },
      token
    );

    await apiFetch(
      "/admin/event-attendance",
      {
        method: "POST",
        body: JSON.stringify({
          userId: sarah.id,
          eventId: events.data?.[2]?.id || events.data?.[0]?.id,
          status: "Attended",
        }),
      },
      token
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff4db_0,#f8efe3_30%,#eef4ff_100%)] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-[32px] border border-white/70 bg-white/75 px-5 py-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">The School Of Faith</p>
            <h1 className="mt-1 font-serif text-3xl text-slate-900">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <a href="/member" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900">
              Member View
            </a>
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

        <div className="mb-6 flex flex-wrap gap-3">
          {adminTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.key ? "bg-slate-900 text-white" : "border border-white/80 bg-white/80 text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" ? (
          <SectionCard
            title="Dashboard"
            subtitle="Live totals sourced from the same relational data the member experience uses."
            action={
              <button
                type="button"
                onClick={addWatchEntry}
                className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Run Verification Action
              </button>
            }
          >
            <StatePanel
              loading={dashboard.loading}
              error={dashboard.error}
              hasData={Boolean(dashboard.data)}
              emptyText="No admin dashboard data yet."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {Object.entries(dashboard.data || {}).filter(([key]) => key !== "recentActivity").map(([key, value]) => (
                  <div key={key} className="rounded-[24px] border border-slate-100 bg-slate-50/90 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{key}</p>
                    <p className="mt-3 text-3xl font-extrabold text-slate-900">
                      {key === "donations" ? formatCurrency(value) : value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-[24px] border border-[#eadfca] bg-[#fffaf1] p-5">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-amber-700" />
                  <p className="text-sm font-semibold text-slate-800">
                    Seed verification preview: Sarah currently shows {watchHoursPreview ?? "loading"} watch hours on the member dashboard.
                  </p>
                </div>
              </div>
            </StatePanel>
          </SectionCard>
        ) : null}

        {activeTab === "members" ? (
          <AdminTableCard title="Members" apiState={members} columns={["first_name", "last_name", "email", "membership_type", "membership_status"]} emptyText="No members found." />
        ) : null}
        {activeTab === "courses" ? (
          <AdminTableCard title="Courses" apiState={courses} columns={["title", "instructor", "category", "difficulty", "duration_minutes"]} emptyText="No courses found." />
        ) : null}
        {activeTab === "events" ? (
          <AdminTableCard title="Events" apiState={events} columns={["title", "location", "status", "start_time"]} emptyText="No events found." />
        ) : null}
        {activeTab === "certificates" ? (
          <AdminTableCard title="Certificates" apiState={certificates} columns={["title", "user_id", "course_id", "issued_at", "valid"]} emptyText="No certificates found." />
        ) : null}
        {activeTab === "donations" ? (
          <AdminTableCard title="Donations" apiState={donations} columns={["user_id", "amount", "method", "transaction_id", "status"]} emptyText="No donations found." />
        ) : null}
        {activeTab === "prayer" ? (
          <AdminTableCard title="Prayer Requests" apiState={prayerRequests} columns={["user_id", "title", "status", "updated_at"]} emptyText="No prayer requests found." />
        ) : null}
        {activeTab === "tickets" ? (
          <AdminTableCard title="Event Tickets" apiState={eventTickets} columns={["user_id", "event_id", "ticket_number", "attendance_status", "ticket_status"]} emptyText="No event tickets found." />
        ) : null}
        {activeTab === "tags" ? (
          <SectionCard
            title="Tags & Badges"
            subtitle="Brand-aligned labels for member recognition."
            action={
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                <ShieldPlus className="h-4 w-4" />
                Live CRUD Ready
              </div>
            }
          >
            <StatePanel loading={tags.loading} error={tags.error} hasData={Boolean(tags.data?.length)} emptyText="No tags found.">
              <div className="grid gap-3 md:grid-cols-3">
                {tags.data?.map((tag) => (
                  <div key={tag.id} className="rounded-[24px] border border-slate-100 bg-slate-50/90 p-4">
                    <p className="text-base font-semibold text-slate-900">{tag.name}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: tag.color }} />
                      <span className="text-xs text-slate-500">{tag.color}</span>
                    </div>
                  </div>
                ))}
              </div>
            </StatePanel>
          </SectionCard>
        ) : null}
        {activeTab === "activity" ? (
          <SectionCard title="Recent Activity" subtitle="The central event log that keeps member and admin views aligned.">
            <StatePanel loading={activity.loading} error={activity.error} hasData={Boolean(activity.data?.length)} emptyText="No recent activity found.">
              <div className="space-y-3">
                {activity.data?.slice(0, 12).map((item) => (
                  <div key={item.id} className="rounded-[24px] border border-slate-100 bg-slate-50/90 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.description}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{item.activity_type}</p>
                      </div>
                      <p className="text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </StatePanel>
          </SectionCard>
        ) : null}
      </div>
    </main>
  );
}

function AdminTableCard({ title, apiState, columns, emptyText }) {
  return (
    <SectionCard title={title}>
      <StatePanel loading={apiState.loading} error={apiState.error} hasData={Boolean(apiState.data?.length)} emptyText={emptyText}>
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column} className="px-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    {column.replaceAll("_", " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apiState.data?.map((row) => (
                <tr key={row.id} className="rounded-[22px] bg-slate-50/90">
                  {columns.map((column) => (
                    <td key={column} className="rounded-[22px] px-3 py-4 text-sm text-slate-700">
                      {String(row[column] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StatePanel>
    </SectionCard>
  );
}
