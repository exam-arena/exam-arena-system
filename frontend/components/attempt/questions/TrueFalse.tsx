import React from "react";

interface TrueFalseProps {
  statements: string[];
  questionIndex: number; // to uniquely group radio buttons
}

export function TrueFalse({ statements, questionIndex }: TrueFalseProps) {
  const labels = ["a", "b", "c", "d", "e", "f"];
  
  return (
    <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
      <div className="min-w-[500px] w-full max-w-3xl grid grid-cols-[1fr_80px_80px] gap-x-3 gap-y-2 text-mediumslateblue text-base">
        {/* Header row */}
        <div className="bg-mediumslateblue text-white py-[0.437rem] px-[1.5rem] flex items-center justify-center text-center font-bold h-full">Khẳng định</div>
        <div className="bg-mediumslateblue text-white py-[0.437rem] px-2 flex items-center justify-center text-center font-bold">Đúng</div>
        <div className="bg-mediumslateblue text-white py-[0.437rem] px-2 flex items-center justify-center text-center font-bold">Sai</div>
        
        {/* Rows */}
        {statements.map((stmt, idx) => (
          <React.Fragment key={idx}>
            <div className="flex items-center px-[1.5rem] py-3 bg-aliceblue text-foreground border border-aliceblue hover:border-cornflowerblue-200 transition-colors min-h-[48px]">
              <b className="font-bold mr-2 text-mediumslateblue shrink-0">{labels[idx]}.</b> 
              <span className="leading-[1.5rem]">{stmt}</span>
            </div>
            <div className="flex items-center justify-center p-2 bg-aliceblue hover:bg-cornflowerblue-200 transition-colors cursor-pointer min-h-[48px]">
              <input 
                type="radio" 
                name={`q${questionIndex}-stmt${idx}`} 
                value="true" 
                className="w-5 h-5 accent-mediumslateblue cursor-pointer scale-110" 
              />
            </div>
            <div className="flex items-center justify-center p-2 bg-aliceblue hover:bg-cornflowerblue-200 transition-colors cursor-pointer min-h-[48px]">
              <input 
                type="radio" 
                name={`q${questionIndex}-stmt${idx}`} 
                value="false" 
                className="w-5 h-5 accent-mediumslateblue cursor-pointer scale-110" 
              />
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
