import React from "react";

interface QuestionNavigatorProps {
  total: number;
  answered: number[];
}

export function QuestionNavigator({ total, answered }: QuestionNavigatorProps) {
  const items = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className="grid grid-cols-5 gap-2">
      {items.map((num) => {
        const isAnswered = answered.includes(num);
        return (
          <button
            key={num}
            className={`w-[2.275rem] h-[2.275rem] rounded-num-8 flex items-center justify-center p-2 box-border transition-colors outline-none cursor-pointer text-base ${
              isAnswered
                ? "bg-mediumslateblue text-white font-bold"
                : "bg-cornflowerblue-200 border-cornflowerblue-200 border border-solid text-mediumslateblue hover:bg-mediumslateblue/10 font-normal"
            }`}
          >
            {num}
          </button>
        );
      })}
    </div>
  );
}
