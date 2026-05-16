import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({

  children,

  allowedRoles = [],

}) {

  /**************************************************
   * بيانات المستخدم
   **************************************************/

  const user = JSON.parse(

    localStorage.getItem('user')

  )

  /**************************************************
   * المستخدم غير مسجل دخول
   **************************************************/

  if (!user) {

    return <Navigate to="/login" />

  }

  /**************************************************
   * إجبار تغيير كلمة المرور
   **************************************************/

  if (

    user.mustChangePassword === 'Y' &&

    window.location.pathname !==

      '/member-dashboard'

  ) {

    return (

      <Navigate to="/member-dashboard" />

    )

  }

  /**************************************************
   * التحقق من الصلاحيات
   **************************************************/

  const hasRole = allowedRoles.some(

    (role) =>

      user.roles.includes(role)

  )

  if (!hasRole) {

    return <Navigate to="/" />

  }

  /**************************************************
   * السماح بالدخول
   **************************************************/

  return children

}