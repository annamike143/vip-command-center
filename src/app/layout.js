// --- src/app/layout.js (Success Cockpit) ---
import "./globals.css";
import { Inter, Poppins } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], variable: '--font-heading', weight: ['600', '700'], display: 'swap' });

export const metadata = {
  title: "The Mike Salazar Academy - Command Center",
  description: "Admin portal for all courses and students.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${poppins.variable}`}>
        {children}
      </body>
    </html>
  );
}