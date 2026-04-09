export const metadata = {
  title: 'Joanie AI Ops Monitor',
  description: 'Live dashboard for Joanie AI activity tracking',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
