import React from "react";

export default function PageHeader({ title, subtitle, children }) {
  return (
    <div style={{ background: "linear-gradient(135deg, #0a1628 0%, #0d1f35 100%)", borderBottom: "1px solid #1e3a5f" }} className="text-white px-4 pt-10 pb-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-wide" style={{ color: "#e2e8f0" }}>{title}</h1>
            {subtitle && <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
