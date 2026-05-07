import './globals.css';

export const metadata = {
  title: 'Script Generator — Caparison Lab',
  description: 'AI-powered video script generator with timestamps. Create professional video scripts in seconds.',
  keywords: 'video script, AI script generator, YouTube script, timestamp script',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="bg-mesh" />
        {children}
      </body>
    </html>
  );
}
