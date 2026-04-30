import React from "react";

interface TimerProps {
    time: string;
}

export function Timer({ time }: TimerProps) {
    return (
        <div className="flex flex-col items-start gap-1">
            <div className="text-base text-mediumslateblue">Thời gian làm bài:</div>
            <b className="text-[1.5rem] leading-none text-mediumslateblue">{time}</b>
        </div>
    );
}
