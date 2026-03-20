import React from "react";

interface ExamLayoutProps {
  content: React.ReactNode;
  sidebar: React.ReactNode;
}

export function ExamLayout({ content, sidebar }: ExamLayoutProps) {
  return (
    <div className="w-full min-h-screen bg-aliceblue font-roboto lg:px-24 md:px-12 px-4 py-8 md:py-12">
      <div className="max-w-[1248px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_294px] gap-6 items-start">
        {/* Main Content Area */}
        <main className="w-full order-2 lg:order-1 flex flex-col min-w-0">
          {content}
        </main>
        
        {/* Sidebar Area */}
        <aside className="w-full order-1 lg:order-2 lg:sticky lg:top-6 flex flex-col gap-6">
          {sidebar}
        </aside>
      </div>
    </div>
  );
}
