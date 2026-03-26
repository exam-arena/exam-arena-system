"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/swiper-bundle.css";
import RoomCard from "@/components/room/RoomCard";
import mockData from "@/data.json";

export default function HotExam() {
    return (
        <section className="w-full bg-white py-9 md:py-[36px]">

            {/* Container*/}
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[96px]">

                {/* Title block */}
                <div className="flex flex-col items-center gap-1 mb-6 md:mb-[24px]">

                    <h2 className="text-xl sm:text-2xl md:text-[32px] font-bold text-[#004EDC] text-center leading-tight">
                        PHÒNG LUYỆN THI HOT 🔥
                    </h2>

                    <p className="text-sm md:text-base text-[#92B8FF] text-center">
                        Đa dạng các đề theo các năm của Bộ giáo dục và Đào tạo
                    </p>

                </div>

                {/* Card*/}
                <div className="max-w-[1248px] mx-auto pb-8">

                    <Swiper
                        modules={[Pagination, Autoplay]}
                        pagination={{ clickable: true }}
                        autoplay={{
                            delay: 3500,
                            disableOnInteraction: false,
                            pauseOnMouseEnter: true,
                        }}
                        spaceBetween={32}
                        breakpoints={{
                            0: { slidesPerView: 1.1 },
                            640: { slidesPerView: 2 },
                            1024: { slidesPerView: 3 },
                        }}
                    >
                        {mockData.exam_rooms.map((room) => (
                            <SwiperSlide key={room.room_id} className="pb-12">
                                <RoomCard {...room} />
                            </SwiperSlide>
                        ))}
                    </Swiper>

                </div>
            </div>
        </section>
    );
}