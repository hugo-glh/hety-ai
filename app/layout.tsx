import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Hety — L'IA française",
  description: "Hety, l'IA française créée par Hugo GALMICHE. Parlez, écrivez, analysez des fichiers — la meilleure IA, simple et pure.",
  openGraph: {
    title: "Hety — L'IA française",
    description: "Hety, l'IA française créée par Hugo GALMICHE. Parlez, écrivez, analysez des fichiers — la meilleure IA, simple et pure.",
    url: "https://hety-ai.vercel.app",
    siteName: "Hety",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Hety — L'IA française",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>{children}</body>
    </html>
  );
}