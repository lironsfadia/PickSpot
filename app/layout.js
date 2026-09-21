import "./globals.css";

export const metadata = {
  title: "Hotspot",
  description: "Internal office seat booking",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
