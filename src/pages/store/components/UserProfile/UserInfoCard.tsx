const personalInfo = [
  { label: "First Name", value: "Musharof" },
  { label: "Last Name", value: "Chowdhury" },
  { label: "Email", value: "randomuser@pimjo.com" },
  { label: "Phone", value: "+09 363 398 46" },
  { label: "Role", value: "Operations Lead" },
  { label: "Bio", value: "Team Manager" },
];

export default function UserInfoCard() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Personal Information
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {personalInfo.map((info) => (
          <article key={info.label}>
            <p className="text-xs uppercase tracking-wider text-gray-400">
              {info.label}
            </p>
            <p className="text-sm font-medium text-gray-800 dark:text-white">
              {info.value}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
