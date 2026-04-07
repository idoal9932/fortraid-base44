import React from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

const AppLayout = React.memo(({ role }) => {
  return (
    <div className="min-h-screen bg-[#070d18] font-heebo" dir="rtl">
      <main className="pb-20 min-h-screen">
        <Outlet />
      </main>
      <BottomNav role={role} />
    </div>
  );
});

AppLayout.displayName = "AppLayout";

export default AppLayout;