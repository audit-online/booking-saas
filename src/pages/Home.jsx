import React from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Gérez vos rendez-vous facilement
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Solution complète de réservation pour professionnels de la beauté.
          Planning intelligent, notifications automatiques, paiements sécurisés.
        </p>
        
        <div className="bg-blue-50 p-6 rounded-lg max-w-md mx-auto mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🎉 Essai gratuit 15 jours
          </h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>✅ Réservations illimitées</li>
            <li>✅ Notifications automatiques</li>
            <li>✅ Planning intelligent</li>
            <li>✅ Aucune carte requise</li>
          </ul>
        </div>

        <div className="space-x-4">
          <Link to="/signup" className="btn-primary text-lg px-8 py-3">
            Commencer maintenant
          </Link>
          <Link to="/login" className="btn-secondary text-lg px-8 py-3">
            Se connecter
          </Link>
        </div>

        <p className="text-gray-500 text-sm mt-6">
          Déjà utilisé par 200+ professionnels
        </p>
      </div>
    </div>
  )
}

