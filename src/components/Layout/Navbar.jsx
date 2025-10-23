import React from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Navbar({ user }) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-blue-600">
              BookingSaaS
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="text-gray-700 hover:text-blue-600 font-medium"
                >
                  Dashboard
                </Link>
                <span className="text-gray-500 text-sm">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn-secondary text-sm"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-blue-600">
                  Connexion
                </Link>
                <Link to="/signup" className="btn-primary">
                  Essai gratuit
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

