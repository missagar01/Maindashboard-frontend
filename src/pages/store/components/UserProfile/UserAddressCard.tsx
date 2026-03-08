const addressDetails = [
  { name: "Country", value: "United States" },
  { name: "City/State", value: "Phoenix, Arizona" },
  { name: "Postal Code", value: "85001" },
  { name: "TAX ID", value: "AS4568384" },
];

export default function UserAddressCard() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Address
        </h2>
        <button className="rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-400 dark:border-gray-700 dark:text-gray-300">
          Update
        </button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {addressDetails.map((detail) => (
          <article key={detail.name}>
            <p className="text-xs uppercase tracking-wider text-gray-400">
              {detail.name}
            </p>
            <p className="text-sm font-medium text-gray-800 dark:text-white">
              {detail.value}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
