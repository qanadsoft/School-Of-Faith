import { Award, BookOpen, CalendarRange, PlayCircle } from "lucide-react";
import StatCard from "./StatCard";
import ReadingPlanCard from "./ReadingPlanCard";

export default function Dashboard({ dashboard }) {
  const statCards = [
    { label: "Courses", value: dashboard.courses, icon: BookOpen, accent: "#E0F2FE" },
    { label: "Hours Watched", value: dashboard.hours_watched, icon: PlayCircle, accent: "#FEF3C7" },
    { label: "Events", value: dashboard.events, icon: CalendarRange, accent: "#DCFCE7" },
    { label: "Certificates", value: dashboard.certificates, icon: Award, accent: "#FCE7F3" },
  ];

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
      <ReadingPlanCard plan={dashboard.reading_plan} />
    </section>
  );
}
