import { useState, useRef, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import logo from '../assets/logo.png'

export default function MainLayout() {
  const location           = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef          = useRef(null)

  const user               = JSON.parse(localStorage.getItem('user'))
  const mustChangePassword = user?.mustChangePassword
  const forcePasswordMode  = user && mustChangePassword === 'Y'

  /* إغلاق القائمة عند النقر خارجها */
  useEffect(() => {
    if (!menuOpen) return
    const fn = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target))
        setMenuOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [menuOpen])

  const handleLogout = () => {
    localStorage.removeItem('user')
    sessionStorage.removeItem('adminUnlocked')
    window.location.href = import.meta.env.BASE_URL
  }

  const adminUnlocked = sessionStorage.getItem('adminUnlocked') === '1'

  const navItems = [
    { name: 'الرئيسية', path: '/'        },
    { name: 'المقالات', path: '/articles' },
    { name: 'الصناديق', path: '/funds'   },
    ...(user                             ? [{ name: 'شجرة العائلة', path: '/family-tree'    }] : []),
    ...(user                             ? [{ name: 'لوحة العضو',   path: '/member-dashboard' }] : []),
    ...(user?.roles?.includes('admin')   ? [{ name: 'لوحة المدير',  path: '/admin-dashboard', adminLock: !adminUnlocked }] : []),
  ]

  const active = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-[#36404a] text-white">

      <header ref={headerRef} className="px-5 lg:px-10 pt-6 relative z-50">

        {/* ══════ شريط التنقل الرئيسي ══════ */}
        <div
          className="min-h-[90px] flex items-center justify-between rounded-[30px] px-6 py-4"
          style={{
            background:          'rgba(255,255,255,0.03)',
            border:              '1px solid rgba(255,255,255,0.07)',
            backdropFilter:      'blur(24px) saturate(1.4)',
            WebkitBackdropFilter:'blur(24px) saturate(1.4)',
            boxShadow:           '0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >

          {/* القائمة — شاشات كبيرة */}
          {!forcePasswordMode && (
            <nav className="hidden md:flex items-center gap-10 text-lg font-semibold font-nav">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link flex items-center gap-1.5 transition-colors duration-300 ${
                    active(item.path)
                      ? 'text-[var(--gold-main)] nav-link--active'
                      : 'text-white/80 hover:text-[var(--gold-main)]'
                  }`}
                >
                  {item.name}
                  {item.adminLock && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ opacity: 0.55, flexShrink: 0, marginTop: 1 }}>
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  )}
                </Link>
              ))}
            </nav>
          )}

          {/* زر الهامبرجر — جوال وتابلت */}
          {!forcePasswordMode && (
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="القائمة"
              className="md:hidden flex flex-col items-center justify-center w-10 h-10 rounded-xl gap-[5px] hover:bg-white/5 transition-all duration-200"
              style={{ color: menuOpen ? 'var(--gold-main)' : 'rgba(255,255,255,0.75)' }}
            >
              <span
                className="block h-[1.5px] bg-current rounded-full transition-all duration-300"
                style={{ width: 20, transform: menuOpen ? 'rotate(45deg) translateY(6.5px)' : 'none' }}
              />
              <span
                className="block h-[1.5px] bg-current rounded-full transition-all duration-200"
                style={{ width: menuOpen ? 20 : 14, opacity: menuOpen ? 0 : 1 }}
              />
              <span
                className="block h-[1.5px] bg-current rounded-full transition-all duration-300"
                style={{ width: 20, transform: menuOpen ? 'rotate(-45deg) translateY(-6.5px)' : 'none' }}
              />
            </button>
          )}

          {/* اللوقو */}
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border:     '1px solid rgba(198,161,107,0.22)',
                boxShadow:  'inset 0 3px 8px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(255,255,255,0.04), 0 6px 18px rgba(0,0,0,0.3)',
              }}
            >
              <img
                src={logo}
                alt="شعار عائلة السلامي"
                className="w-full h-full object-contain"
                style={{
                  filter: 'contrast(1.3) saturate(1.5) brightness(0.92) drop-shadow(0 2px 4px rgba(0,0,0,0.5)) drop-shadow(0 -1px 1px rgba(220,170,70,0.2))',
                }}
              />
            </div>
            <div className="hidden sm:block text-right">
              <h2 className="font-brand font-bold text-base tracking-wide">عائلة السلامي</h2>
              <p className="font-nav text-xs text-[var(--gold-main)] opacity-80 tracking-widest">جذورنا واحدة</p>
            </div>
          </div>

          {/* المستخدم */}
          {!user ? (
            <Link
              to="/login"
              className="btn-outline font-nav border border-[var(--gold-main)] text-[var(--gold-main)] px-6 py-3 rounded-2xl hover:bg-[var(--gold-main)] hover:text-black"
            >
              تسجيل الدخول
            </Link>
          ) : (
            <div className="flex items-center gap-5">
              {!forcePasswordMode && (
                <div className="hidden sm:block text-right">
                  <p className="text-sm text-gray-300">مرحباً</p>
                  <p className="font-bold text-[var(--gold-main)]">{user.firstName}</p>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="font-nav border border-red-500 text-red-400 px-5 py-2 rounded-2xl hover:bg-red-500 hover:text-white duration-300"
              >
                تسجيل الخروج
              </button>
            </div>
          )}

        </div>

        {/* ══════ قائمة الجوال المنسدلة ══════ */}
        {!forcePasswordMode && (
          <div
            className="md:hidden"
            style={{
              display: 'grid',
              gridTemplateRows: menuOpen ? '1fr' : '0fr',
              opacity:          menuOpen ? 1 : 0,
              transition:       'grid-template-rows 0.42s cubic-bezier(0.23,1,0.32,1), opacity 0.28s ease',
            }}
          >
            {/* wrapper يمنع تسرّب المحتوى */}
            <div style={{ overflow: 'hidden' }}>
              <nav
                className="mt-3 mb-1 rounded-[24px] px-4 py-4 flex flex-col gap-0.5"
                style={{
                  background:          'rgba(20,28,36,0.94)',
                  border:              '1px solid rgba(198,161,107,0.13)',
                  backdropFilter:      'blur(28px)',
                  WebkitBackdropFilter:'blur(28px)',
                  boxShadow:           '0 20px 56px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                {navItems.map((item, i) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={`font-nav text-base font-semibold px-4 py-3 rounded-xl flex items-center justify-between ${
                      active(item.path)
                        ? 'text-[var(--gold-main)]'
                        : 'text-white/75'
                    }`}
                    style={{
                      background:      active(item.path) ? 'rgba(198,161,107,0.08)' : 'transparent',
                      opacity:         menuOpen ? 1 : 0,
                      transform:       menuOpen ? 'translateY(0)' : 'translateY(-6px)',
                      transition:      `opacity 0.32s ease ${i * 45}ms, transform 0.38s cubic-bezier(0.23,1,0.32,1) ${i * 45}ms, background 0.2s ease, color 0.2s ease`,
                    }}
                    onMouseEnter={e => {
                      if (!active(item.path)) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                        e.currentTarget.style.color = 'var(--gold-main)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active(item.path)) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
                      }
                    }}
                  >
                    <span>{item.name}</span>
                    {item.adminLock && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ opacity: 0.45, flexShrink: 0 }}>
                        <rect x="3" y="11" width="18" height="11" rx="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    )}
                  </Link>
                ))}

                {/* فاصل */}
                <div
                  className="my-2 mx-4"
                  style={{
                    height: 1,
                    background: 'rgba(255,255,255,0.07)',
                    opacity: menuOpen ? 1 : 0,
                    transition: `opacity 0.3s ease ${navItems.length * 45}ms`,
                  }}
                />

                {/* خروج أو دخول */}
                {user ? (
                  <button
                    onClick={() => { setMenuOpen(false); handleLogout() }}
                    className="font-nav text-base text-right px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all duration-200"
                    style={{
                      opacity:   menuOpen ? 1 : 0,
                      transform: menuOpen ? 'translateY(0)' : 'translateY(-6px)',
                      transition:`opacity 0.32s ease ${(navItems.length + 1) * 45}ms, transform 0.38s cubic-bezier(0.23,1,0.32,1) ${(navItems.length + 1) * 45}ms`,
                    }}
                  >
                    تسجيل الخروج
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="font-nav text-base text-right px-4 py-3 rounded-xl text-[var(--gold-main)] hover:bg-[var(--gold-main)]/10 transition-all duration-200"
                    style={{
                      opacity:   menuOpen ? 1 : 0,
                      transform: menuOpen ? 'translateY(0)' : 'translateY(-6px)',
                      transition:`opacity 0.32s ease ${(navItems.length + 1) * 45}ms, transform 0.38s cubic-bezier(0.23,1,0.32,1) ${(navItems.length + 1) * 45}ms`,
                    }}
                  >
                    تسجيل الدخول
                  </Link>
                )}

              </nav>
            </div>
          </div>
        )}

      </header>

      <main>
        <Outlet />
      </main>

    </div>
  )
}
