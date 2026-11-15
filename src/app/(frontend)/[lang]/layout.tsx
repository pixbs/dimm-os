export const metadata = {
  title: 'Dimm OS',
  // The real icon comes with the metadata; an empty one keeps the browser from asking for a missing file.
  icons: { icon: 'data:,' },
}

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params

  return (
    <html lang={lang}>
      <body>{children}</body>
    </html>
  )
}
