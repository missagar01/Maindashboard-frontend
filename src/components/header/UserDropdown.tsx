import { useState, useRef, useEffect } from "react";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface UserDropdownProps {
  variant?: "avatar" | "settings";
}

export default function UserDropdown({ variant = "avatar" }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {variant === "settings" ? (
        <button
          onClick={() => setIsOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#374151] text-white shadow-sm transition hover:bg-[#1f2937]"
          aria-label="Open user menu"
        >
          <Settings className="h-5 w-5" />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen((open) => !open)}
          className="flex items-center text-gray-700 dark:text-gray-400"
        >
          <span className="mr-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
            {user?.username ? (
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                {user.username.charAt(0).toUpperCase()}
              </span>
            ) : (
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">U</span>
            )}
          </span>
          <span className="mr-1 block font-medium text-theme-sm">
            {user?.username || user?.user_name || "User"}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      )}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-3 w-52 rounded-2xl border border-gray-200 bg-white p-3 text-sm text-gray-700 shadow-[0_20px_45px_rgba(15,23,42,0.16)] dark:border-gray-800 dark:bg-gray-900 dark:text-white/90">
          <p className="font-semibold">{user?.username || user?.user_name || "User"}</p>
          <p className="mb-3 text-xs text-gray-500">
            {user?.email_id || user?.role || "No email"}
          </p>
          <div className="space-y-2">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
