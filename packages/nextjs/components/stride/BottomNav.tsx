import React from "react";

export type NavTab = "home" | "track" | "pools" | "profile";

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isLiveTracking?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab, isLiveTracking = false }) => {
  const tabs: { id: NavTab; label: string; icon: string }[] = [
    { id: "home", label: "home", icon: "🏠" },
    { id: "track", label: "track", icon: isLiveTracking ? "🔴" : "⚡" },
    { id: "pools", label: "pools", icon: "🏆" },
    { id: "profile", label: "profile", icon: "👤" },
  ];

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 px-4 pointer-events-none">
      <nav className="max-w-sm mx-auto bg-[#12100C]/90 backdrop-blur-xl border-2 border-[#362A5E] rounded-3xl p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.8)] flex items-center justify-between pointer-events-auto">
        {tabs.map(tab => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 select-none ${
                isActive
                  ? "bg-[#CCFF00] text-black shadow-[0_4px_12px_rgba(204,255,0,0.35)]"
                  : "text-[#C7BEEA]/70 hover:text-white hover:bg-white/5 active:scale-95"
              }`}
            >
              <span className="text-xl leading-none mb-0.5">{tab.icon}</span>
              <span
                className={`text-[11px] font-black lowercase tracking-tight leading-none ${isActive ? "text-black" : "text-inherit"}`}
              >
                {tab.label}
              </span>
              {tab.id === "track" && isLiveTracking && (
                <span className="absolute -top-1 right-3 w-2.5 h-2.5 rounded-full bg-[#FF3B30] beacon-pulse" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
