import './globals.css';

export const metadata = {
  title: 'Email Extraction · Outlook',
  description: 'Extract Outlook email as plain text via Microsoft Graph',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
