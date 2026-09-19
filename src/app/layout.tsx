import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudEbuddy",
  description:
    "StudEbuddy is an AI-powered study companion that helps students decide what to study, when to study, and how to study.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
