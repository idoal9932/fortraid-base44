import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Plus, Users, Package, Settings, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const paramedicTabs = [
  { path: "/new-event", label: "אירוע חדש", icon: Plus },
  { path: "/my-patients", label: "המטופלים שלי", icon: Users },
  { path: "/inventory", label: "ציוד", icon: Package },
  { path: "/settings", label: "הגדרות", icon: Settings },
];

const doctorTabs = [
  { path: "/dashboard", label: "דשבורד", icon: LayoutDashboard },
  { path: "/doctor/patients", label: "מטופלים", icon: Users },
  { path: "/doctor/inventory", label: "ציוד", icon: Package },
  { path: "/settings", label: "הגדרות", icon: Settings },
];

export default function BottomNav({ role }) {
  const location = useLocation();
  const { user } = useAuth();
  
  const isAdmin = user?.email === 'idoal9932@gmail.com';
  const settingsPath = isAdmin ? "/admin/settings" : "/settings";

  const baseTabs = role === "doctor" ? doctorTabs : paramedicTabs;

  const tabs = baseTabs.map(tab =>
    tab.label === "הגדרות" ? { ...tab, path: settingsPath } : tab
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab, idx) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <Link
              key={idx}
              to={tab.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[64px]
                ${isActive 
                  ? "text-red-600" 
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? "bg-red-50" : ""}`}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}