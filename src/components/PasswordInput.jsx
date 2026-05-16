import { useState } from 'react'

const EyeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const EyeOffIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

/**
 * حقل كلمة مرور مع زر إظهار/إخفاء
 * يقبل نفس props الـ <input> العادي
 */
export default function PasswordInput({ className = 'form-input', style, ...props }) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className={className}
        style={{ paddingLeft: 48, ...style }}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        style={{
          position: 'absolute',
          left: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          padding: 6,
          borderRadius: 8,
          color: 'rgba(255,255,255,0.35)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.2s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(198,161,107,0.85)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  )
}
