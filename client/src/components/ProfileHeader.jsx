import { CalendarDays, Crown, ShieldCheck } from "lucide-react";
import MemberBadge from "./MemberBadge";
import { formatDate } from "../utils/format";

export default function ProfileHeader({ profile }) {
  return (
    <section className="rounded-[36px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <img
            src={profile.avatar_url}
            alt={`${profile.first_name} ${profile.last_name}`}
            className="h-28 w-28 rounded-[30px] object-cover shadow-lg"
          />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-3xl text-slate-900 md:text-4xl">
                {profile.first_name} {profile.last_name}
              </h1>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                {profile.membership_status}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">{profile.bio}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.tags.map((tag) => (
                <MemberBadge key={tag.id} tag={tag} />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Joined {formatDate(profile.join_date)}
              </span>
              <span className="inline-flex items-center gap-2">
                <Crown className="h-4 w-4" />
                {profile.membership_type}
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Member Access
              </span>
            </div>
          </div>
        </div>
        <button className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800">
          View Membership
        </button>
      </div>
    </section>
  );
}
