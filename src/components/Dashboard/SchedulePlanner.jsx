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

  // États pour la configuration des emplois du temps
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [editingSchedule, setEditingSchedule] = useState({
    1: { enabled: false, start: '09:00', end: '18:00' },
    2: { enabled: false, start: '09:00', end: '18:00' },
    3: { enabled: false, start: '09:00', end: '18:00' },
    4: { enabled: false, start: '09:00', end: '18:00' },
    5: { enabled: false, start: '09:00', end: '18:00' },
    6: { enabled: false, start: '09:00', end: '18:00' },
    0: { enabled: false, start: '09:00', end: '18:00' }
  })
  const [saveMessage, setSaveMessage] = useState('')

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

  // Charger les horaires de l'employé sélectionné
  useEffect(() => {
    if (selectedEmployeeId && employeeSchedules[selectedEmployeeId]) {
      const schedule = employeeSchedules[selectedEmployeeId]
      const newEditingSchedule = {}

      daysOfWeek.forEach(day => {
        const daySchedule = schedule[day.id]
        newEditingSchedule[day.id] = {
          enabled: daySchedule?.is_working || false,
          start: daySchedule?.start_time || '09:00',
          end: daySchedule?.end_time || '18:00'
        }
      })

      setEditingSchedule(newEditingSchedule)
    } else {
      // Réinitialiser
      setEditingSchedule({
        1: { enabled: false, start: '09:00', end: '18:00' },
        2: { enabled: false, start: '09:00', end: '18:00' },
        3: { enabled: false, start: '09:00', end: '18:00' },
        4: { enabled: false, start: '09:00', end: '18:00' },
        5: { enabled: false, start: '09:00', end: '18:00' },
        6: { enabled: false, start: '09:00', end: '18:00' },
        0: { enabled: false, start: '09:00', end: '18:00' }
      })
    }
  }, [selectedEmployeeId, employeeSchedules])

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

  // Sauvegarder les horaires de l'employé
  const handleSaveEmployeeSchedule = async () => {
    if (!selectedEmployeeId) {
      setSaveMessage('Veuillez sélectionner un employé')
      setTimeout(() => setSaveMessage(''), 3000)
      return
    }

    try {
      const schedule = employeeSchedules[selectedEmployeeId] || {}

      for (const dayId of Object.keys(editingSchedule)) {
        const dayIdNum = parseInt(dayId)
        const dayData = editingSchedule[dayIdNum]
        const existingDay = schedule[dayIdNum]

        if (existingDay && existingDay.id) {
          // Update
          await supabase
            .from('availability')
            .update({
              is_working: dayData.enabled,
              start_time: dayData.start,
              end_time: dayData.end
            })
            .eq('id', existingDay.id)
        } else {
          // Insert
          await supabase
            .from('availability')
            .insert({
              employee_id: selectedEmployeeId,
              day_of_week: dayIdNum,
              is_working: dayData.enabled,
              start_time: dayData.start,
              end_time: dayData.end
            })
        }
      }

      // Recharger les données
      await fetchEmployeeSchedule(selectedEmployeeId)
      setSaveMessage('✓ Horaires enregistrés avec succès !')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      console.error('Erreur sauvegarde horaires:', error)
      setSaveMessage('✗ Erreur lors de la sauvegarde')
      setTimeout(() => setSaveMessage(''), 3000)
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
            <span className="text-xl">🟩</span>
            <span className="text-gray-700">Employé présent</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xl">🟥</span>
            <span className="text-gray-700">Employé en repos/congé</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xl">🟦</span>
            <span className="text-gray-700">Rendez-vous client</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xl">🟨</span>
            <span className="text-gray-700">Horaires d'ouverture du salon</span>
          </div>
        </div>
      </div>

      {/* SECTION 1 : TABLEAU DE PLANNING VISUEL */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <span className="text-2xl mr-2">📊</span>
            TABLEAU PLANNING VISUEL
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Vue d'ensemble des présences et rendez-vous de la semaine
          </p>
        </div>

        {/* Horaires d'ouverture du salon (JAUNE) */}
        <div className="p-6 border-b bg-yellow-50">
          <h4 className="font-bold text-gray-900 mb-3 flex items-center">
            <span className="text-xl mr-2">🟨</span>
            Horaires d'ouverture du salon
          </h4>
          <div className="grid grid-cols-7 gap-3">
            {weekDates.map(({ dayId, formatted }) => {
              const dayName = daysOfWeek.find(d => d.id === dayId)?.short || ''
              const isOpen = isSalonOpen(dayId)
              const hours = getSalonHours(dayId)

              return (
                <div
                  key={dayId}
                  className={`p-3 rounded-lg border-2 text-center ${
                    isOpen ? 'bg-yellow-100 border-yellow-400' : 'bg-gray-100 border-gray-300'
                  }`}
                >
                  <div className="font-bold text-sm text-gray-900">{dayName}</div>
                  <div className="text-xs text-gray-600 mb-1">{formatted}</div>
                  <div className={`text-xs font-bold ${isOpen ? 'text-yellow-900' : 'text-gray-600'}`}>
                    {hours}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tableau des employés */}
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
                      <th key={dayId} className="px-3 py-3 text-center text-xs font-bold text-gray-900 min-w-[150px]">
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
                          <td key={dayId} className="px-2 py-2">
                            {!isSalonOpenDay ? (
                              <div className="text-center p-3 bg-gray-100 rounded-lg">
                                <div className="text-xs text-gray-500 italic">Salon fermé</div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {/* VERT = Présent ou ROUGE = Repos */}
                                <div className={`p-3 rounded-lg border-2 text-center ${
                                  isWorking
                                    ? 'bg-green-100 border-green-400'
                                    : 'bg-red-100 border-red-400'
                                }`}>
                                  {isWorking ? (
                                    <>
                                      <div className="text-lg mb-1">🟩</div>
                                      <div className="text-xs font-bold text-green-900">
                                        {daySchedule.start_time} - {daySchedule.end_time}
                                      </div>
                                      <div className="text-xs text-green-700 mt-1">
                                        {(calculateDayMinutes(daySchedule.start_time, daySchedule.end_time) / 60).toFixed(1)}h
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="text-lg mb-1">🟥</div>
                                      <div className="text-xs font-bold text-red-900">En repos</div>
                                    </>
                                  )}
                                </div>

                                {/* BLEU = RDV clients */}
                                {dayAppointments.length > 0 && (
                                  <div className="space-y-1">
                                    {dayAppointments.map(apt => (
                                      <div
                                        key={apt.id}
                                        className="p-2 bg-blue-100 border-2 border-blue-400 rounded-lg text-center"
                                      >
                                        <div className="text-lg mb-1">🟦</div>
                                        <div className="text-xs font-bold text-blue-900">
                                          {apt.appointment_time}
                                        </div>
                                        <div className="text-xs text-blue-700 font-medium truncate">
                                          {apt.client_name}
                                        </div>
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

      {/* Séparateur visuel */}
      <div className="border-t-4 border-gray-300"></div>

      {/* SECTION 2 : CONFIGURATION EMPLOIS DU TEMPS */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center mb-2">
            <span className="text-2xl mr-2">⚙️</span>
            CONFIGURATION EMPLOIS DU TEMPS
          </h3>
          <p className="text-sm text-gray-600">
            Sélectionnez un employé et configurez ses horaires de travail hebdomadaires
          </p>
        </div>

        {/* Sélection employé */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sélectionner un employé
          </label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Choisir un employé --</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} {emp.specialty ? `(${emp.specialty})` : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedEmployeeId && (
          <>
            {/* Configuration des jours */}
            <div className="space-y-4 mb-6">
              <h4 className="font-medium text-gray-900">Jours de travail</h4>

              {daysOfWeek.map(day => (
                <div key={day.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      id={`day-${day.id}`}
                      checked={editingSchedule[day.id]?.enabled || false}
                      onChange={(e) => {
                        setEditingSchedule(prev => ({
                          ...prev,
                          [day.id]: {
                            ...prev[day.id],
                            enabled: e.target.checked
                          }
                        }))
                      }}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor={`day-${day.id}`} className="ml-3 font-medium text-gray-900">
                      {day.name}
                    </label>
                  </div>

                  {editingSchedule[day.id]?.enabled ? (
                    <div className="grid grid-cols-2 gap-4 ml-8">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Heure de début</label>
                        <input
                          type="time"
                          value={editingSchedule[day.id]?.start || '09:00'}
                          onChange={(e) => {
                            setEditingSchedule(prev => ({
                              ...prev,
                              [day.id]: {
                                ...prev[day.id],
                                start: e.target.value
                              }
                            }))
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Heure de fin</label>
                        <input
                          type="time"
                          value={editingSchedule[day.id]?.end || '18:00'}
                          onChange={(e) => {
                            setEditingSchedule(prev => ({
                              ...prev,
                              [day.id]: {
                                ...prev[day.id],
                                end: e.target.value
                              }
                            }))
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="ml-8 text-sm text-gray-500 italic">
                      En repos
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bouton Enregistrer */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSaveEmployeeSchedule}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center space-x-2 transition-colors"
              >
                <span>💾</span>
                <span>Enregistrer les horaires</span>
              </button>

              {saveMessage && (
                <div className={`px-4 py-2 rounded-lg ${
                  saveMessage.includes('✓')
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {saveMessage}
                </div>
              )}
            </div>
          </>
        )}

        {!selectedEmployeeId && (
          <div className="text-center py-8 text-gray-500">
            Veuillez sélectionner un employé pour configurer ses horaires
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
