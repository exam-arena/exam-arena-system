import React from "react";

interface QuestionProps {
  number?: string | number;
  text: React.ReactNode;
  imageUrl?: string | null;
  children?: React.ReactNode;
}

export function Question({ number, text, imageUrl, children }: QuestionProps) {
  return (
    <div className="flex flex-col gap-6 w-full text-foreground border border-transparent hover:border-cornflowerblue-200 p-4 -m-4 rounded-xl transition-all">
      <div className="flex flex-col w-full">
        {number && <b className="text-lg leading-[1.75rem] text-mediumslateblue mb-2">Câu {number}:</b>}
        <div className="text-[1.125rem] leading-[2rem] flex flex-col items-start gap-4">
          <div className="w-full">{text}</div>
          
          {imageUrl && (
            <div className="w-full max-w-2xl mt-2 rounded-lg overflow-hidden border border-cornflowerblue-100/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={imageUrl} 
                alt="Hình minh họa" 
                className="w-full h-auto object-contain" 
              />
            </div>
          )}
        </div>
      </div>
      {children && (
        <div className="w-full text-base">
          {children}
        </div>
      )}
    </div>
  );
}
