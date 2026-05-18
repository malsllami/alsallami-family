import {

  BrowserRouter,

  Routes,

  Route,

} from 'react-router-dom'

/**************************************************
 * Layout
 **************************************************/

import MainLayout from './layouts/MainLayout'

/**************************************************
 * Pages
 **************************************************/

import App from './App'

import Login from './pages/Login'

import Register from './pages/Register'

import FamilyTree from './pages/FamilyTree'

import MemberDashboard from './pages/MemberDashboard'

import PendingRequests from './pages/PendingRequests'

import AdminDashboard from './pages/AdminDashboard'

import Articles from './pages/Articles'

import Funds from './pages/Funds'

import TreeViewer from './pages/TreeViewer'

/**************************************************
 * Protected Route
 **************************************************/

import ProtectedRoute from './components/ProtectedRoute'

export default function Router() {

  return (

    <BrowserRouter basename={import.meta.env.BASE_URL}>

      <Routes>

        {/* شجرة العائلة — صفحة مستقلة بلا navbar (فل سكرين) */}
        <Route path="/family-tree" element={<FamilyTree />} />

        {/* مشاهد الشجرة — للأهل بدون تسجيل */}
        <Route path="/tree-view" element={<TreeViewer />} />

        {/* Layout — باقي الصفحات */}

        <Route element={<MainLayout />}>

          {/* الرئيسية */}

          <Route
            path="/"
            element={<App />}
          />

          {/* المقالات */}

          <Route path="/articles" element={<Articles />} />

          {/* الصناديق */}

          <Route path="/funds" element={<Funds />} />

          {/* تسجيل الدخول */}

          <Route
            path="/login"
            element={<Login />}
          />

          {/* التسجيل */}

          <Route
            path="/register"
            element={<Register />}
          />

          {/* لوحة العضو */}

          <Route
            path="/member-dashboard"
            element={

              <ProtectedRoute

                allowedRoles={[

                  'member',

                  'admin',

                ]}

              >

                <MemberDashboard />

              </ProtectedRoute>

            }
          />

          {/* لوحة المدير */}

          <Route
            path="/admin-dashboard"
            element={

              <ProtectedRoute

                allowedRoles={['admin']}

              >

                <AdminDashboard />

              </ProtectedRoute>

            }
          />

          {/* الطلبات المعلقة */}

          <Route
            path="/pending-requests"
            element={

              <ProtectedRoute

                allowedRoles={['admin']}

              >

                <PendingRequests />

              </ProtectedRoute>

            }
          />

        </Route>

      </Routes>

    </BrowserRouter>

  )

}