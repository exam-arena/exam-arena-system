import React from "react";

interface ExamContentProps {
  title: string;
  children: React.ReactNode;
}

export function ExamContent({ title, children }: ExamContentProps) {
  return (
    <div className="flex flex-col w-full text-xl text-foreground bg-white rounded-num-30 overflow-hidden shadow-[0px_2px_8px_rgba(146,184,255,0.2)]">
      <div className="bg-white px-6 py-5 lg:px-10 lg:py-6 border-b border-cornflowerblue-100/20 flex items-center justify-center lg:justify-start">
        <b className="leading-6 text-center lg:text-left text-mediumslateblue text-2xl uppercase">{title}</b>
      </div>
      <div className="bg-white px-4 py-6 md:px-8 md:py-10 lg:px-12 lg:py-12 flex flex-col gap-12 text-foreground">
        {children}
      </div>
    </div>
  );
}
