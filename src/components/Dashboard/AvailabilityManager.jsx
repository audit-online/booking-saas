import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function AvailabilityManager() {
  const { user } = useAuth()
  const [availability, setAvailability] = useState([])
  const [loading, setLoading] = useState(true)

  const daysOfWeek = [
    { id: 1, name: 'Lundi' },
    { id: 2, name: 'Mardi' },
    { id: 3, name: 'Mercredi' },
    { id: 4, name: 'Jeudi' },
    { id: 5, name: 'Vendredi' },
    { id: 6, name: 'Samedi' },
    { id: 0, name: 'Dimanche' }
  ]

  useEffect(() => {
    if (user) {
      fetchAvailability()
    }
  }, [user])

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      // Créer un tableau avec tous les jours
      const availabilityMap = {}
      if (data) {
        data.forEach(item => {
          availabilityMap[item.day_of_week] = item
        })
      }

      // Remplir avec des valeurs par défaut
      const fullAvailability = daysOfWeek.map(day => {
        return availabilityMap[day.id] || {
          day_of_week: day.id,
          day_name: day.name,
          is_working: day.id >= 1 && day.id <= 5, // Lun-Ven par défaut
          start_time: '09:00',
          end_time: '18:00'
        }
      })

      setAvailability(fullAvailability)
    } catch (error) {
      console.error('Erreur fetch availability:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleDay = async (dayIndex) => {
    const updatedAvailability = [...availability]
    updatedAvailability[dayIndex].is_working = !updatedAvailability[dayIndex].is_working
    setAvailability(updatedAvailability)
    await saveAvailability(updatedAvailability[dayIndex])
  }

  const handleTimeChange = async (dayIndex, field, value) => {
    const updatedAvailability = [...availability]
    updatedAvailability[dayIndex][field] = value
    setAvailability(updatedAvailability)
    await saveAvailability(updatedAvailability[dayIndex])
  }

  const saveAvailability = async (dayData) => {
    try {
      if (dayData.id) {
        // Update existing
        const { error } = await supabase
          .from('availability')
          .update({
            is_working: dayData.is_working,
            start_time: dayData.start_time,
            end_time: dayData.end_time
          })
          .eq('id', dayData.id)

        if (error) throw error

        // Feedback visuel temporaire
        console.log('Horaires sauvegardés !')
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('availability')
          .insert({
            user_id: user.id,
            day_of_week: dayData.day_of_week,
            is_working: dayData.is_working,
            start_time: dayData.start_time,
            end_time: dayData.end_time
          })
          .select()

        if (error) throw error

        // Update local state with the new ID
        const updatedAvailability = [...availability]
        const dayIndex = updatedAvailability.findIndex(d => d.day_of_week === dayData.day_of_week)
        if (dayIndex >= 0 && data && data[0]) {
          updatedAvailability[dayIndex].id = data[0].id
          setAvailability(updatedAvailability)
        }
      }
    } catch (error) {
      console.error('Erreur save availability:', error)
    }
  }

  if (loading) {
    return <div className="text-center">Chargement...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Mes Horaires</h3>

      <div className="space-y-4">
        {availability.map((day, index) => (
          <div key={day.day_of_week} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="w-20">
                <span className="font-medium text-gray-900">{day.day_name || daysOfWeek.find(d => d.id === day.day_of_week)?.name}</span>
              </div>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={day.is_working}
                  onChange={() => handleToggleDay(index)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-600">
                  {day.is_working ? 'Ouvert' : 'Fermé'}
                </span>
              </label>
            </div>

            {day.is_working && (
              <div className="flex items-center space-x-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ouverture</label>
                  <input
                    type="time"
                    value={day.start_time}
                    onChange={(e) => handleTimeChange(index, 'start_time', e.target.value)}
                    className="px-2 py-1 border rounded text-sm"
                  />
                </div>
                
                <span className="text-gray-400">-</span>
                
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fermeture</label>
                  <input
                    type="time"
                    value={day.end_time}
                    onChange={(e) => handleTimeChange(index, 'end_time', e.target.value)}
                    className="px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Conseil</h4>
        <p className="text-blue-800 text-sm">
          Vos horaires déterminent quand vos clients peuvent prendre rendez-vous. 
          Vous pouvez les modifier à tout moment selon vos besoins.
        </p>
      </div>
    </div>
  )
}
