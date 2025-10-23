import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function SchedulePlanner() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState([])
  const [availability, setAvailability] = useState({})
  const [employeeSchedules, setEmployeeSchedules] = useState({})
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState(0) // 0 = semaine courante

  const daysOfWeek = [
    { id: 1, name: 'Lundi', short: 'Lun' },
    { id: 2, name: 'Mardi', short: 'Mar' },
    { id: 3, name: 'Mercredi', short: 'Mer' },
    { id: 4, name: 'Jeudi', short: 'Jeu' },
    { id: 5, name: 'Vendredi', short: 'Ven' },
    { id: 6, name: 'Samedi', short: 'Sam' },
    { id: 0, name: 'Dimanche', short: 'Dim' }
  ]

  // Calculer les dates de la semaine sélectionnée
  const getWeekDates = () => {
    const now = new Date()
    const currentDay = now.getDay() // 0 = Dimanche
    const diff = currentDay === 0 ? -6 : 1 - currentDay // Lundi de cette semaine
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff + (selectedWeek * 7))

    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      weekDates.push({
        date: date,
        dateString: date.toISOString().split('T')[0],
        dayId: (i + 1) % 7, // Lundi=1, ..., Dimanche=0
        formatted: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      })
    }
    return weekDates
  }

  const weekDates = getWeekDates()

  useEffect(() => {
    if (user) {
      fetchAllData()
    }
  }, [user, selectedWeek])

  const fetchAllData = async () => {
    setLoading(true)
    await Promise.all([
      fetchEmployees(),
      fetchSalonAvailability(),
      fetchAppointmentsForWeek()
    ])
    setLoading(false)
  }

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('salon_id', user.id)
        .eq('active', true)
        .order('name')

      if (error) throw error

      const employeesList = data || []
      setEmployees(employeesList)

      // Charger les horaires de chaque employé
      for (const employee of employeesList) {
        await fetchEmployeeSchedule(employee.id)
      }
    } catch (error) {
      console.error('Erreur fetch employees:', error)
    }
  }

  const fetchSalonAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('user_id', user.id)
        .is('employee_id', null)

      if (error) throw error

      const availabilityMap = {}
      if (data) {
        data.forEach(item => {
          availabilityMap[item.day_of_week] = item
        })
      }

      setAvailability(availabilityMap)
    } catch (error) {
      console.error('Erreur fetch salon availability:', error)
    }
  }

  const fetchEmployeeSchedule = async (employeeId) => {
    try {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('employee_id', employeeId)

      if (error) throw error

      const scheduleMap = {}
      if (data) {
        data.forEach(item => {
          scheduleMap[item.day_of_week] = item
        })
      }

      setEmployeeSchedules(prev => ({
        ...prev,
        [employeeId]: scheduleMap
      }))
    } catch (error) {
      console.error('Erreur fetch employee schedule:', error)
    }
  }

  const fetchAppointmentsForWeek = async () => {
    try {
      const startDate = weekDates[0].dateString
      const endDate = weekDates[6].dateString

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          services(name, duration, price),
          employees(name)
        `)
        .eq('professional_id', user.id)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .in('status', ['confirmed', 'completed'])

      if (error) throw error
      setAppointments(data || [])
    } catch (error) {
      console.error('Erreur fetch appointments:', error)
    }
  }

  // Calculer les heures travaillées par employé pour la semaine
  const calculateWeeklyHours = (employeeId) => {
    const schedule = employeeSchedules[employeeId] || {}
    let totalMinutes = 0

    weekDates.forEach(({ dayId }) => {
      const daySchedule = schedule[dayId]
      if (daySchedule && daySchedule.is_working) {
        const minutes = calculateDayMinutes(daySchedule.start_time, daySchedule.end_time)
        totalMinutes += minutes
      }
    })

    return (totalMinutes / 60).toFixed(1)
  }

  const calculateDayMinutes = (startTime, endTime) => {
    if (!startTime || !endTime) return 0

    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)

    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    return endMinutes - startMinutes
  }

  // Obtenir la couleur selon les heures travaillées
  const getHoursColor = (hours) => {
    const h = parseFloat(hours)
    if (h > 35) return 'bg-red-100 text-red-900 border-red-300'
    if (h >= 33) return 'bg-orange-100 text-orange-900 border-orange-300'
    return 'bg-green-100 text-green-900 border-green-300'
  }

  // Obtenir les RDV pour un employé et un jour donné
  const getAppointmentsForEmployeeAndDay = (employeeId, dateString) => {
    return appointments.filter(apt =>
      apt.employee_id === employeeId &&
      apt.appointment_date === dateString
    )
  }

  // Vérifier si le salon est ouvert ce jour
  const isSalonOpen = (dayId) => {
    const salonDay = availability[dayId]
    return salonDay && salonDay.is_working
  }

  // Obtenir les horaires du salon
  const getSalonHours = (dayId) => {
    const salonDay = availability[dayId]
    if (salonDay && salonDay.is_working) {
      return `${salonDay.start_time} - ${salonDay.end_time}`
    }
    return 'Fermé'
  }

  const handleUpdateSchedule = async (employeeId, dayId, field, value) => {
    const schedule = employeeSchedules[employeeId] || {}
    const daySchedule = schedule[dayId]

    try {
      if (daySchedule && daySchedule.id) {
        // Update
        const { error } = await supabase
          .from('availability')
          .update({ [field]: value })
          .eq('id', daySchedule.id)

        if (error) throw error
      } else {
        // Insert
        const { error } = await supabase
          .from('availability')
          .insert({
            employee_id: employeeId,
            day_of_week: dayId,
            [field]: value,
            is_working: field === 'is_working' ? value : true,
            start_time: field === 'start_time' ? value : '09:00',
            end_time: field === 'end_time' ? value : '18:00'
          })

        if (error) throw error
      }

      // Recharger
      await fetchEmployeeSchedule(employeeId)
    } catch (error) {
      console.error('Erreur update schedule:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-600">Chargement du planning...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec navigation de semaine */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Planning de l'équipe</h2>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedWeek(selectedWeek - 1)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
            >
              ← Semaine précédente
            </button>

            <span className="text-sm font-medium text-gray-700">
              {selectedWeek === 0 ? 'Semaine courante' :
               selectedWeek > 0 ? `+${selectedWeek} semaine${selectedWeek > 1 ? 's' : ''}` :
               `${selectedWeek} semaine${selectedWeek < -1 ? 's' : ''}`}
            </span>

            {selectedWeek !== 0 && (
              <button
                onClick={() => setSelectedWeek(0)}
                className="px-3 py-1 text-sm text-blue-600 hover:underline"
              >
                Aujourd'hui
              </button>
            )}

            <button
              onClick={() => setSelectedWeek(selectedWeek + 1)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
            >
              Semaine suivante →
            </button>
          </div>
        </div>

        {/* Légende des couleurs */}
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
            <span className="text-gray-700">{"< 33h (Normal)"}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-100 border-2 border-orange-300 rounded"></div>
            <span className="text-gray-700">33-35h (Attention)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
            <span className="text-gray-700">{"> 35h (Dépassement)"}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
            <span className="text-gray-700">Rendez-vous client</span>
          </div>
        </div>
      </div>

      {/* Amplitude d'ouverture du commerce */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Horaires d'ouverture du commerce</h3>
        <div className="grid grid-cols-7 gap-4">
          {weekDates.map(({ dayId, formatted, date }) => {
            const dayName = daysOfWeek.find(d => d.id === dayId)?.short || ''
            const isOpen = isSalonOpen(dayId)

            return (
              <div
                key={dayId}
                className={`p-3 rounded-lg border-2 text-center ${
                  isOpen ? 'bg-blue-50 border-blue-300' : 'bg-gray-100 border-gray-300'
                }`}
              >
                <div className="font-bold text-sm text-gray-900">{dayName}</div>
                <div className="text-xs text-gray-600 mb-2">{formatted}</div>
                <div className={`text-xs font-medium ${isOpen ? 'text-blue-900' : 'text-gray-600'}`}>
                  {getSalonHours(dayId)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Planning des employés */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">Emplois du temps des salariés</h3>
          <p className="text-sm text-gray-600 mt-1">
            Durée légale : 35 heures hebdomadaires maximum
          </p>
        </div>

        {employees.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Aucun employé actif. Ajoutez des employés dans l'onglet "Équipe".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 sticky left-0 bg-gray-100 z-10">
                    Employé
                  </th>
                  {weekDates.map(({ dayId, formatted }) => {
                    const dayName = daysOfWeek.find(d => d.id === dayId)?.short || ''
                    return (
                      <th key={dayId} className="px-3 py-3 text-center text-xs font-bold text-gray-900 min-w-[140px]">
                        <div>{dayName}</div>
                        <div className="text-gray-600 font-normal">{formatted}</div>
                      </th>
                    )
                  })}
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 sticky right-0 bg-gray-100 z-10">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {employees.map(employee => {
                  const weeklyHours = calculateWeeklyHours(employee.id)
                  const schedule = employeeSchedules[employee.id] || {}

                  return (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 sticky left-0 bg-white z-10 border-r">
                        <div className="font-medium text-gray-900">{employee.name}</div>
                        <div className="text-xs text-gray-600">{employee.specialty}</div>
                      </td>

                      {weekDates.map(({ dayId, dateString }) => {
                        const daySchedule = schedule[dayId]
                        const isWorking = daySchedule && daySchedule.is_working
                        const isSalonOpenDay = isSalonOpen(dayId)
                        const dayAppointments = getAppointmentsForEmployeeAndDay(employee.id, dateString)

                        return (
                          <td key={dayId} className="px-2 py-2 text-center">
                            {!isSalonOpenDay ? (
                              <div className="text-xs text-gray-500 italic">Fermé</div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center justify-center space-x-1">
                                  <input
                                    type="checkbox"
                                    checked={isWorking || false}
                                    onChange={(e) => handleUpdateSchedule(employee.id, dayId, 'is_working', e.target.checked)}
                                    className="w-3 h-3"
                                  />
                                  <span className="text-xs text-gray-700">
                                    {isWorking ? '✓' : '✗'}
                                  </span>
                                </div>

                                {isWorking && (
                                  <div className="space-y-1">
                                    <input
                                      type="time"
                                      value={daySchedule?.start_time || '09:00'}
                                      onChange={(e) => handleUpdateSchedule(employee.id, dayId, 'start_time', e.target.value)}
                                      className="w-full text-xs px-1 py-1 border rounded"
                                    />
                                    <input
                                      type="time"
                                      value={daySchedule?.end_time || '18:00'}
                                      onChange={(e) => handleUpdateSchedule(employee.id, dayId, 'end_time', e.target.value)}
                                      className="w-full text-xs px-1 py-1 border rounded"
                                    />

                                    {daySchedule && (
                                      <div className="text-xs font-medium text-gray-700">
                                        {(calculateDayMinutes(daySchedule.start_time, daySchedule.end_time) / 60).toFixed(1)}h
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* RDV clients */}
                                {dayAppointments.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {dayAppointments.map(apt => (
                                      <div
                                        key={apt.id}
                                        className="text-xs bg-blue-100 border border-blue-300 rounded px-1 py-1"
                                        title={`${apt.client_name} - ${apt.services?.name || 'Service'}`}
                                      >
                                        <div className="font-medium text-blue-900">{apt.appointment_time}</div>
                                        <div className="text-blue-700 truncate">{apt.client_name}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        )
                      })}

                      <td className="px-4 py-4 sticky right-0 bg-white z-10 border-l">
                        <div className={`inline-flex px-3 py-2 rounded-lg font-bold border-2 ${getHoursColor(weeklyHours)}`}>
                          {weeklyHours}h
                        </div>
                        {parseFloat(weeklyHours) > 35 && (
                          <div className="text-xs text-red-600 font-medium mt-1">
                            ⚠ Dépassement légal
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Statistiques de la semaine */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Total rendez-vous</h4>
          <p className="text-3xl font-bold text-blue-600">{appointments.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Employés actifs</h4>
          <p className="text-3xl font-bold text-green-600">{employees.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Alertes dépassement 35h</h4>
          <p className="text-3xl font-bold text-red-600">
            {employees.filter(emp => parseFloat(calculateWeeklyHours(emp.id)) > 35).length}
          </p>
        </div>
      </div>

      {/* Conseils */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Rappel légal</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>La durée légale du travail en France est de 35 heures par semaine</li>
                <li>Les heures supplémentaires doivent être rémunérées ou compensées</li>
                <li>Veillez à respecter les temps de repos obligatoires</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
