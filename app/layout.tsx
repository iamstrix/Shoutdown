import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHOUTDOWN",
  description: "A voice-controlled falling-words game.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

