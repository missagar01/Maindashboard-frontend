const quickLinks = [
  { name: "Team Manager", value: "Musharof Chowdhury" },
  { name: "Location", value: "Arizona, USA" },
  { name: "Status", value: "Active" },
];

export default function UserMetaCard() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white/90">
      <div className="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
        <div className="flex flex-col items-center gap-3 md:flex-row md:items-start">
          <div className="h-20 w-20 rounded-full bg-gray-200 dark:bg-white/10" />
          <div>
            <p className="text-sm text-gray-400">Profile owner</p>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Musharof Chowdhury
            </h2>
          </div>
        </div>
        <button className="rounded-full border border-gray-300 px-5 py-2 text-sm text-gray-600 transition hover:border-gray-400 dark:border-gray-700 dark:text-gray-300">
          Edit profile
        </button>
      </div>
      <div className="mt-6 flex flex-wrap gap-4">
        {quickLinks.map((link) => (
          <div
            key={link.name}
            className="flex flex-col rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
          >
            <span className="text-xs uppercase tracking-wider text-gray-400">
              {link.name}
            </span>
            <span className="text-base font-semibold text-gray-900 dark:text-white">
              {link.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
