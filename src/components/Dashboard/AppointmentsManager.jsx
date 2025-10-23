import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function AppointmentsManager() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('upcoming') // upcoming, today, all
  const [selectedDate, setSelectedDate] = useState('')

  useEffect(() => {
    if (user) {
      fetchAppointments()
    }
  }, [user, filter, selectedDate])

  const fetchAppointments = async () => {
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          services(name, duration, price)
        `)
        .eq('professional_id', user.id)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })

      // Filtres
      const today = new Date().toISOString().split('T')[0]
      
      if (filter === 'today') {
        query = query.eq('appointment_date', today)
      } else if (filter === 'upcoming') {
        query = query.gte('appointment_date', today)
      }

      if (selectedDate) {
        query = query.eq('appointment_date', selectedDate)
      }

      const { data, error } = await query

      if (error) throw error
      setAppointments(data || [])
    } catch (error) {
      console.error('Erreur fetch appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId)

      if (error) throw error
      fetchAppointments()
    } catch (error) {
      console.error('Erreur update status:', error)
    }
  }

  const deleteAppointment = async (appointmentId) => {
    if (!confirm('Supprimer ce rendez-vous ?')) return

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId)

      if (error) throw error
      fetchAppointments()
    } catch (error) {
      console.error('Erreur delete appointment:', error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'no-show': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed': return 'Confirmé'
      case 'cancelled': return 'Annulé'
      case 'completed': return 'Terminé'
      case 'no-show': return 'Absent'
      default: return status
    }
  }

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0]
    const todayAppointments = appointments.filter(apt => apt.appointment_date === today)
    
    return {
      total: todayAppointments.length,
      confirmed: todayAppointments.filter(apt => apt.status === 'confirmed').length,
      revenue: todayAppointments
        .filter(apt => apt.status === 'completed')
        .reduce((sum, apt) => sum + (apt.price || 0), 0)
    }
  }

  const stats = getTodayStats()

  if (loading) {
    return <div className="text-center">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      {/* Stats du jour */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900">Aujourd'hui</h3>
          <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
          <p className="text-xs text-blue-700">rendez-vous</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-900">Confirmés</h3>
          <p className="text-2xl font-bold text-green-900">{stats.confirmed}</p>
          <p className="text-xs text-green-700">à venir</p>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-900">Revenus</h3>
          <p className="text-2xl font-bold text-yellow-900">{stats.revenue}€</p>
          <p className="text-xs text-yellow-700">aujourd'hui</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Affichage
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="today">Aujourd'hui</option>
              <option value="upcoming">À venir</option>
              <option value="all">Tous</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date spécifique
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="mt-6 text-sm text-blue-600 hover:underline"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Liste des RDV */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Rendez-vous ({appointments.length})
          </h3>
        </div>

        {appointments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Aucun rendez-vous pour cette période.</p>
          </div>
        ) : (
          <div className="divide-y">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {appointment.client_name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {appointment.services?.name || 'Service supprimé'}
                        </p>
                      </div>
                      
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)}`}>
                        {getStatusText(appointment.status)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                      <span>
                        📅 {new Date(appointment.appointment_date).toLocaleDateString('fr-FR')}
                      </span>
                      <span>
                        🕐 {appointment.appointment_time}
                      </span>
                      <span>
                        ⏱️ {appointment.duration} min
                      </span>
                      <span>
                        💰 {appointment.price}€
                      </span>
                    </div>

                    {appointment.client_email && (
                      <div className="mt-1 text-sm text-gray-600">
                        📧 {appointment.client_email}
                      </div>
                    )}

                    {appointment.client_phone && (
                      <div className="mt-1 text-sm text-gray-600">
                        📱 {appointment.client_phone}
                      </div>
                    )}

                    {appointment.notes && (
                      <div className="mt-2 text-sm text-gray-700 bg-gray-100 p-2 rounded">
                        💬 {appointment.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {appointment.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Terminé
                        </button>
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Annuler
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => deleteAppointment(appointment.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}