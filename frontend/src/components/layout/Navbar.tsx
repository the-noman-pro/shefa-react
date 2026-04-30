import { Link, NavLink } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store';
import { logout } from '@/store/auth.slice';

export default function Navbar() {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-emerald-600">Shefa</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <NavLink
              to="/charities"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-emerald-600' : 'text-gray-600 hover:text-emerald-600'
                }`
              }
            >
              Charities
            </NavLink>
            <NavLink
              to="/campaigns"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-emerald-600' : 'text-gray-600 hover:text-emerald-600'
                }`
              }
            >
              Campaigns
            </NavLink>
            <NavLink
              to="/waqf"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? 'text-emerald-600' : 'text-gray-600 hover:text-emerald-600'
                }`
              }
            >
              Waqf
            </NavLink>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {user?.user_type === 'admin' && (
                  <Link to="/admin" className="text-sm text-gray-600 hover:text-emerald-600">
                    Dashboard
                  </Link>
                )}
                <Link to="/wallet" className="text-sm text-gray-600 hover:text-emerald-600">
                  Wallet
                </Link>
                <NavLink to="/donations" className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive ? 'text-emerald-600' : 'text-gray-600 hover:text-emerald-600'
                  }`
                }>
                  Donations
                </NavLink>
                <Link to="/profile" className="text-sm text-gray-600 hover:text-emerald-600">
                  {user?.first_name || user?.email}
                </Link>
                <button
                  onClick={() => dispatch(logout())}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                  Login
                </Link>
                <Link to="/register" className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}