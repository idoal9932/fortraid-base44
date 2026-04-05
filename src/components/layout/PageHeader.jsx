import React from "react";

export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="bg-[#1e2a38] text-white px-4 pt-10 pb-6 rounded-b-3xl">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            {subtitle && <p className="text-white/70 text-sm mt-0.5">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}