"use client";

import React from "react";
import { ExamLayout } from "@/components/attempt/ExamLayout";
import { Sidebar } from "@/components/attempt/sidebar/Sidebar";
import { ExamContent } from "@/components/attempt/content/ExamContent";
import { Section } from "@/components/attempt/content/Section";
import { Question } from "@/components/attempt/content/Question";
import { MultipleChoice } from "@/components/attempt/questions/MultipleChoice";
import { TrueFalse } from "@/components/attempt/questions/TrueFalse";
import { ShortAnswer } from "@/components/attempt/questions/ShortAnswer";

export default function AttemptPage() {
  const sidebar = (
    <Sidebar 
      time="90:00"
      totalQuestions={22}
      answeredQuestions={[1, 3, 5]}
      onSubmit={() => alert("Nộp bài!")}
      onExit={() => alert("Thoát!")}
      user={{
        name: "User 1",
        fullName: "Hà Trọng Thắng",
        grade: "Lớp 12",
        target: "8.5/10"
      }}
    />
  );

  const content = (
    <ExamContent title="ĐỀ THI THỬ TOÁN THPTQG">
      <Section 
        title="Phần 1: Câu trắc nghiệm nhiều phương án lựa chọn" 
        description="Thí sinh trả lời từ câu 1 đến câu 12, mỗi câu chỉ chọn 1 phương án."
      >
        <Question number={1} text="Hàm số y = x^3 - 3x + 1 nghịch biến trên khoảng nào dưới đây?">
          <MultipleChoice 
            name="q1"
            options={["(0; 2)", "(-1; 1)", "(-∞; -1)", "(1; +∞)"]} 
          />
        </Question>

        <Question number={2} text="Cho khối chóp có đáy là hình vuông cạnh a và chiều cao bằng 3a. Thể tích khối chóp đã cho bằng:">
          <MultipleChoice 
            name="q2"
            options={["a^3", "3a^3", "4a^3", "2a^3"]} 
          />
        </Question>
      </Section>

      <Section 
        title="Phần 2: Câu trắc nghiệm Đúng - Sai" 
        description="Thí sinh trả lời từ câu 3 đến 4, trong các đáp án a - d, chọn đúng - sai."
      >
        <Question number={3} text="Cho hàm số y = f(x) liên tục trên R và có đồ thị như hình vẽ. Khẳng định sau đây là đúng hay sai?">
          <TrueFalse 
            questionIndex={3}
            statements={[
              "Hàm số nghịch biến trên khoảng (0; 1)",
              "Hàm số đạt cực đại tại x = 0",
              "Giá trị lớn nhất của hàm số là 2",
              "Đồ thị cắt trục hoành tại 3 điểm phân biệt"
            ]} 
          />
        </Question>

        <Question number={4} text="Trong không gian Oxyz, cho mặt phẳng (P): x + 2y - z + 1 = 0">
          <TrueFalse 
            questionIndex={4}
            statements={[
              "Mặt phẳng (P) đi qua điểm M(-1; 0; 0)",
              "Vectơ pháp tuyến của (P) là n=(1; 2; -1)",
              "Khoảng cách từ gốc tọa độ đến (P) bằng 1",
              "(P) vuông góc với mặt phẳng (Q): 2x - y + z = 0"
            ]} 
          />
        </Question>
      </Section>

      <Section 
        title="Phần 3: Câu trắc nghiệm trả lời ngắn" 
        description="Thí sinh trả lời từ câu 5 đến câu 6."
      >
        <Question number={5} text="Có bao nhiêu giá trị nguyên của m để phương trình x^2 - 2mx + m^2 - 1 = 0 có hai nghiệm phân biệt?">
          <ShortAnswer name="q5" />
        </Question>

        <Question number={6} text="Một vật chuyển động với vận tốc v(t) = 3t^2 + 2t (m/s). Quãng đường vật đi được trong 3 giây đầu tiên là bao nhiêu mét?">
          <ShortAnswer name="q6" />
        </Question>
      </Section>
    </ExamContent>
  );

  return <ExamLayout sidebar={sidebar} content={content} />;
}
