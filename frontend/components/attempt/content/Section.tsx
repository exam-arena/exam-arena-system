import React from "react";

interface SectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function Section({ title, description, children }: SectionProps) {
  return (
    <div className="flex flex-col gap-8 w-full border-b border-cornflowerblue-100/20 pb-12 last:border-b-0 last:pb-0">
      <div className="flex flex-col gap-2">
        <b className="text-[1.5rem] leading-[2rem] text-mediumslateblue font-bold">{title}</b>
        <div className="text-base leading-[1.75rem] text-cornflowerblue-100">{description}</div>
      </div>
      <div className="flex flex-col gap-14 w-full text-xl">
        {children}
      </div>
    </div>
  );
}
