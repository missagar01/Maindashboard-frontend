import React from "react";
import { Link } from "react-router";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col flex-1 justify-center w-full min-h-screen lg:flex-row">
        {children}
        <div className="hidden w-full h-full p-6 text-white rounded-xl lg:flex lg:w-1/2 lg:items-center lg:justify-center bg-gradient-to-br from-indigo-600 to-sky-500">
          <div className="space-y-4 text-center max-w-sm">
            <Link to="/" className="inline-block">
              <img
                width={231}
                height={48}
                src="/images/logo/auth-logo.svg"
                alt="Logo"
              />
            </Link>
            <p className="text-sm leading-relaxed text-white/80">
              Free and Open-Source Tailwind CSS Admin Dashboard Template with
              modern React tooling.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
