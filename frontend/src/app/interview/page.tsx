"use strict";
import InterviewScreen from "@/components/interview/InterviewScreen";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Interview | SayBee AI",
  description: "Experience a seamless AI-driven interview session.",
};

export default function InterviewPage() {
  return <InterviewScreen />;
}
