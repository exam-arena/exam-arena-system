import React from "react";

interface QuestionProps {
  number: number;
  text: React.ReactNode;
  children: React.ReactNode;
}

export function Question({ number, text, children }: QuestionProps) {
  return (
    <div className="flex flex-col gap-6 w-full text-foreground border border-transparent hover:border-cornflowerblue-200 p-4 -m-4 rounded-xl transition-all">
      <div className="flex flex-col w-full">
        <b className="text-lg leading-[1.75rem] text-mediumslateblue mb-2">Câu {number}:</b>
        <div className="text-base leading-[1.75rem] min-h-[5rem] overflow-hidden flex flex-col items-start gap-4">
          {text}
        </div>
      </div>
      <div className="w-full text-base">
        {children}
      </div>
    </div>
  );
}
