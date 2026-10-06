// Layout delle pagine fuori dall'app (accesso, recupero password): sfondo e
// titolo centrato, identici allo splash di avvio in App.jsx.
export function AuthLayout({ subtitle, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full">
        <h1 className="text-2xl font-bold text-center text-mikai-400 mb-2">Mikai Eventi</h1>
        {subtitle && <p className="text-center text-gray-500 mb-8">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}
