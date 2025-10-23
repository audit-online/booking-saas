import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function SalonProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState({
    salon_name: '',
    phone: '',
    city: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('salon_name, phone, city')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setProfile({
        salon_name: data.salon_name || '',
        phone: data.phone || '',
        city: data.city || ''
      })
    } catch (error) {
      console.error('Erreur fetch profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          salon_name: profile.salon_name,
          phone: profile.phone,
          city: profile.city
        })
        .eq('id', user.id)

      if (error) throw error

      setMessage('Profil mis à jour avec succès !')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Erreur save profile:', error)
      setMessage('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return <div className="text-center">Chargement...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Informations du Salon</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Nom du salon *
          </label>
          <input
            type="text"
            value={profile.salon_name}
            onChange={(e) => handleChange('salon_name', e.target.value)}
            placeholder="ex: Salon Coiffure Paris, Beauty Center..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Ce nom apparaîtra sur votre page de réservation
          </p>
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Téléphone
          </label>
          <input
            type="tel"
            value={profile.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="ex: 01 23 45 67 89"
          />
          <p className="text-xs text-gray-500 mt-1">
            Numéro visible par vos clients pour vous contacter
          </p>
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Ville
          </label>
          <input
            type="text"
            value={profile.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="ex: Paris, Lyon, Marseille..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Aide vos clients à vous localiser
          </p>
        </div>

        <div className="flex items-center space-x-4 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>

          {message && (
            <span className={`text-sm ${message.includes('succès') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </span>
          )}
        </div>
      </form>

      {profile.salon_name && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">Lien de réservation</h4>
          <p className="text-green-800 text-sm mb-2">
            Vos clients peuvent réserver via ce lien :
          </p>
          <div className="bg-white p-2 rounded border text-sm text-gray-700 font-mono">
            http://188.34.156.30:5173/book/{profile.salon_name.toLowerCase().replace(/\s+/g, '-')}
          </div>
          <p className="text-xs text-green-600 mt-2">
            Partagez ce lien sur vos réseaux sociaux, site web, ou par SMS !
          </p>
        </div>
      )}
    </div>
  )
}
