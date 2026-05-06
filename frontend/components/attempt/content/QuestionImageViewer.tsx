"use client";

import React, { useEffect, useRef, useState } from "react";

interface QuestionImageViewerProps {
    imageUrl: string;
    alt?: string;
    className?: string;
}

interface MagnifierPosition {
    x: number;
    y: number;
    xPercent: number;
    yPercent: number;
    width: number;
    height: number;
}

const ZOOM_SCALE = 2.5;

export function QuestionImageViewer({
    imageUrl,
    alt = "Hình minh họa",
    className = "",
}: QuestionImageViewerProps) {
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMagnifierVisible, setIsMagnifierVisible] = useState(false);
    const [magnifierPosition, setMagnifierPosition] = useState<MagnifierPosition | null>(null);

    useEffect(() => {
        if (!isModalOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsModalOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isModalOpen]);

    const updateMagnifierPosition = (event: React.MouseEvent<HTMLButtonElement>) => {
        const image = imageRef.current;
        if (!image) return;

        const rect = image.getBoundingClientRect();
        const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
        const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);

        setMagnifierPosition({
            x,
            y,
            xPercent: rect.width > 0 ? (x / rect.width) * 100 : 0,
            yPercent: rect.height > 0 ? (y / rect.height) * 100 : 0,
            width: rect.width,
            height: rect.height,
        });
    };

    const showMagnifier = (event: React.MouseEvent<HTMLButtonElement>) => {
        updateMagnifierPosition(event);
        setIsMagnifierVisible(true);
    };

    const hideMagnifier = () => {
        setIsMagnifierVisible(false);
        setMagnifierPosition(null);
    };

    return (
        <>
            <figure className={`w-full mt-2 flex flex-col items-center gap-2 ${className}`}>
                <button
                    type="button"
                    className="relative inline-flex max-w-full cursor-zoom-in items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mediumslateblue focus-visible:ring-offset-2"
                    onClick={() => setIsModalOpen(true)}
                    onMouseEnter={showMagnifier}
                    onMouseMove={updateMagnifierPosition}
                    onMouseLeave={hideMagnifier}
                    aria-label="Mở ảnh minh họa lớn hơn"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        ref={imageRef}
                        src={imageUrl}
                        alt={alt}
                        className="max-w-full max-h-75 md:max-h-105 w-auto h-auto object-contain rounded-lg border border-cornflowerblue-100/30 bg-white"
                        draggable={false}
                    />

                    {isMagnifierVisible && magnifierPosition && (
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute z-10 hidden h-72 w-72 rounded-full border-2 border-white bg-white shadow-2xl ring-1 ring-black/15 md:block"
                            style={{
                                left: magnifierPosition.x,
                                top: magnifierPosition.y,
                                transform: "translate(-50%, -50%)",
                                backgroundImage: `url("${imageUrl}")`,
                                backgroundRepeat: "no-repeat",
                                backgroundSize: `${magnifierPosition.width * ZOOM_SCALE}px ${magnifierPosition.height * ZOOM_SCALE}px`,
                                backgroundPosition: `${magnifierPosition.xPercent}% ${magnifierPosition.yPercent}%`,
                            }}
                        />
                    )}
                </button>

                <figcaption className="text-xs leading-5 text-slate-500">
                    Nhấn vào ảnh để xem lớn hơn
                </figcaption>
            </figure>

            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Xem ảnh minh họa lớn hơn"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div className="relative flex max-h-[90vh] max-w-[95vw] items-center justify-center" onClick={(event) => event.stopPropagation()}>
                        <button
                            type="button"
                            className="absolute -right-3 -top-12 z-10 rounded-full bg-white/95 px-3 py-1.5 text-sm font-medium text-slate-900 shadow-lg transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:-right-4"
                            aria-label="Đóng ảnh lớn"
                            onClick={() => setIsModalOpen(false)}
                        >
                            Đóng
                        </button>

                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={imageUrl}
                            alt={alt}
                            className="max-h-[90vh] max-w-[95vw] object-contain"
                            draggable={false}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
