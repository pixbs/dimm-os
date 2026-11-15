import React from 'react'

export const metadata = {
  title: 'Dimm OS',
  // The real icon comes with the metadata; an empty one keeps the browser from asking for a missing file.
  icons: { icon: 'data:,' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
