import type { Metadata } from "next";
import "./global.css";

export const metadata: Metadata = {
  title: "LearnTrack",
  description: "LearnTrack is an online education platform. ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
