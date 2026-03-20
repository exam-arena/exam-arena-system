import React from "react";

interface QuestionNavigatorProps {
  total: number;
  answered: number[];
  currentIndex?: number;
  onSelect?: (index: number) => void;
}

export function QuestionNavigator({ total, answered, currentIndex = 0, onSelect }: QuestionNavigatorProps) {
  const items = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className="grid grid-cols-5 gap-2">
      {items.map((num, i) => {
        const isAnswered = answered.includes(num);
        const isActive = currentIndex === i;
        
        let btnClass = "bg-cornflowerblue-200 border-cornflowerblue-200 border-solid text-mediumslateblue hover:bg-mediumslateblue/10 font-normal";
        if (isActive) {
          btnClass = "border-mediumslateblue bg-mediumslateblue/10 text-mediumslateblue font-bold ring-2 ring-mediumslateblue/50 ring-offset-1";
        }
        if (isAnswered) {
          btnClass = "bg-mediumslateblue text-white font-bold border-mediumslateblue";
          if (isActive) {
             btnClass += " ring-2 ring-mediumslateblue/50 ring-offset-2";
          }
        }
        
        return (
          <button
            key={num}
            onClick={() => onSelect?.(i)}
            className={`w-[2.275rem] h-[2.275rem] border rounded-num-8 flex items-center justify-center p-2 box-border transition-all outline-none cursor-pointer text-base ${btnClass}`}
          >
            {num}
          </button>
        );
      })}
    </div>
  );
}
