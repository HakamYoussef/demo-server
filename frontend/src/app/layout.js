import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/authContext";

import { ChakraProvider } from "@chakra-ui/react";
const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "CNESTEN - DERS/UDI Monitoring",
  description: "DERS/UDI Environmental & Radiation Monitoring Dashboard. Real-time data visualization for Air, Water, Soil, and Radiation sensors.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
      <ChakraProvider>
      <AuthProvider>{children}</AuthProvider>
      </ChakraProvider></body>
    </html>
  );
}
