import { useState, useRef, useEffect } from "react";

const events = [
  {
    title: "Strategy Review",
    date: "April 10",
    time: "09:00 AM",
    location: "Conference Room A",
  },
  {
    title: "Customer Roundtable",
    date: "April 14",
    time: "02:00 PM",
    location: "Online",
  },
  {
    title: "Design Sprint",
    date: "April 18",
    time: "11:00 AM",
    location: "Studio B",
  },
];

export default function Calendar() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-gray-400">
          Calendar
        </p>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
          Upcoming Events
        </h1>
        <p className="text-sm text-gray-500">
          Keep an eye on the important meetings and workshops coming up.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => (
          <article
            key={event.title}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {event.title}
            </h2>
            <p className="text-sm text-gray-500">{event.date}</p>
            <p className="text-sm text-gray-500">{event.time}</p>
            <p className="text-sm text-gray-500">{event.location}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
