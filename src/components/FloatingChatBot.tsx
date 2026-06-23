import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { MessageCircle, X, Bot } from "lucide-react";
import StoreChatBot from "../pages/store/pages/store/ChatBot";

export default function FloatingChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const location = useLocation();

  // If we are on the dedicated chatbot page, do not show the floating widget
  if (location.pathname === "/store/chatbot") {
    return null;
  }

  const handleToggle = () => {
    if (!hasBeenOpened) {
      setHasBeenOpened(true);
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={handleToggle}
        className={`fixed bottom-6 right-6 z-[999] flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-all duration-300 hover:bg-emerald-500 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 ${
          isOpen ? "rotate-90 bg-slate-800 hover:bg-slate-700 focus:ring-slate-500/30" : ""
        }`}
        title={isOpen ? "Close Store ChatBot" : "Open Store ChatBot"}
      >
        {isOpen ? <X className="size-6" /> : <Bot className="size-6 animate-pulse" />}
      </button>

      {/* Popover Chat Window */}
      {hasBeenOpened && (
        <div
          className={`fixed bottom-24 right-6 z-[999] flex w-[420px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-[#efeae2] shadow-2xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-950 ${
            isOpen
              ? "translate-y-0 scale-100 opacity-100 pointer-events-auto"
              : "translate-y-4 scale-95 opacity-0 pointer-events-none"
          }`}
          style={{
            height: "580px",
            maxHeight: "calc(100vh-120px)",
          }}
        >
          {/* Custom Sleek Header */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-2 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/90">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                <Bot className="size-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-none">
                  Sagar Pipe Agent
                </h4>
                <p className="text-[10px] mt-1 font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 leading-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* ChatBot Content */}
          <div className="flex-1 overflow-hidden">
            <StoreChatBot isFloating={true} />
          </div>
        </div>
      )}
    </>
  );
}
