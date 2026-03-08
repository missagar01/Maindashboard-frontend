const statistics = [
  { label: "Total Customers", value: "1,248", change: "+4.6%" },
  { label: "Active Projects", value: "86", change: "+1 this week" },
  { label: "New Signups", value: "214", change: "+12%" },
];

const highlights = [
  {
    title: "Revenue Snapshot",
    copy: "Revenue is steady throughout the month with a healthy pipeline for Q1.",
  },
  {
    title: "Engagement",
    copy: "User engagement is up thanks to the refreshed onboarding modal.",
  },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-gray-400">
          Dashboard
        </p>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
          Welcome back, Alex!
        </h1>
        <p className="text-sm text-gray-500">
          Review the recent activity and see how the team is progressing.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {statistics.map((stat) => (
          <article
            key={stat.label}
            className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-gray-800 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
          >
            <p className="text-xs uppercase tracking-widest text-gray-400">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
            <p className="text-xs text-green-600">{stat.change}</p>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {highlights.map((item) => (
          <section
            key={item.title}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {item.title}
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {item.copy}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
