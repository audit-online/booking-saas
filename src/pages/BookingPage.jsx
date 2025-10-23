import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import emailjs from '@emailjs/browser'
import './BookingPage.css'

const BookingPage = () => {
  const { slug } = useParams()
  const [salon, setSalon] = useState(null)
  const [services, setServices] = useState([])
  const [availability, setAvailability] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState(null)
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])
  const [bookedSlots, setBookedSlots] = useState([])
  const [clientData, setClientData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  })
  const [step, setStep] = useState(1)
  const [booking, setBooking] = useState(false)
  const [message, setMessage] = useState('')
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallButton, setShowInstallButton] = useState(false)

  useEffect(() => {
    if (slug) {
      fetchSalonData()
    }
  }, [slug])

  useEffect(() => {
    if (selectedService && selectedDate) {
      generateTimeSlots()
    }
  }, [selectedService, selectedDate, availability, selectedEmployee])

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false)
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallButton(true)
    }
    
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return
    
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setShowInstallButton(false)
    }
    setDeferredPrompt(null)
  }

  const fetchSalonData = async () => {
    try {
      const salonName = slug.replace(/-/g, ' ')
      const { data: salonData, error: salonError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('salon_name', `%${salonName}%`)
        .single()

      if (salonError) throw salonError
      setSalon(salonData)

      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', salonData.id)

      setServices(servicesData || [])

      const { data: availabilityData } = await supabase
        .from('availability')
        .select('*')
        .eq('user_id', salonData.id)

      setAvailability(availabilityData || [])

      // Fetch employees after salon data is loaded
      await fetchEmployees(salonData.id)

      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const fetchEmployees = async (salonId) => {
    if (!salonId) return  // Protection plus robuste

    try {
      const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('salon_id', salonId)
        .eq('active', true)
        .order('name')

      console.log('✅ Employés chargés:', data)  // Debug
      setEmployees(data || [])
    } catch (error) {
      console.error('❌ Erreur fetch employés:', error)
    }
  }

  const generateTimeSlots = async () => {
    // Mapping français → anglais
    const dayMapping = {
      'monday': 'lundi',
      'tuesday': 'mardi',
      'wednesday': 'mercredi',
      'thursday': 'jeudi',
      'friday': 'vendredi',
      'saturday': 'samedi',
      'sunday': 'dimanche'
    }
    
    const dayOfWeekEnglish = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const dayOfWeekFrench = dayMapping[dayOfWeekEnglish]
    
    console.log('Jour sélectionné (anglais):', dayOfWeekEnglish)
    console.log('Jour sélectionné (français):', dayOfWeekFrench)
    console.log('Disponibilités:', availability)
    
    const dayAvailability = availability.find(a => {
      const dayValue = a.day_of_week
      console.log('Valeur day_of_week:', dayValue, 'Type:', typeof dayValue)
      
      // Si c'est une string
      if (typeof dayValue === 'string') {
        return dayValue.toLowerCase() === dayOfWeekFrench || dayValue.toLowerCase() === dayOfWeekEnglish
      }
      
      // Si c'est un nombre (0=dimanche, 1=lundi, etc. ou 1=lundi, 2=mardi, etc.)
      if (typeof dayValue === 'number') {
        const dayIndex = new Date(selectedDate).getDay() // 0=dimanche, 1=lundi...
        return dayValue === dayIndex || dayValue === (dayIndex === 0 ? 7 : dayIndex)
      }
      
      return false
    })

    console.log('Disponibilité trouvée:', dayAvailability)

    if (!dayAvailability) {
      console.log('Aucune disponibilité configurée pour ce jour')
      setAvailableSlots([])
      return
    }

    // Si le jour existe dans availability, c'est qu'il est disponible
    console.log('Jour disponible, génération des créneaux...')

    const slots = []
    const [startHour] = dayAvailability.start_time.split(':').map(Number)
    const [endHour] = dayAvailability.end_time.split(':').map(Number)
    const serviceDuration = selectedService.duration

    console.log('Heure début:', startHour, 'Heure fin:', endHour, 'Durée service:', serviceDuration)

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += serviceDuration) {
        if (hour * 60 + minute + serviceDuration <= endHour * 60) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          slots.push(timeString)
        }
      }
    }

    console.log('Créneaux générés:', slots)

    // Récupère les RDV confirmés de cet employé ce jour
    const { data: bookedAppointments } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('employee_id', selectedEmployee?.id)
      .eq('appointment_date', selectedDate)
      .eq('status', 'confirmed')

    // Remplit bookedSlots avec les heures occupées
    console.log('📌 Employé sélectionné ID:', selectedEmployee?.id)
    console.log('📦 RDV trouvés:', bookedAppointments)
    setBookedSlots(bookedAppointments?.map(apt => apt.appointment_time.slice(0, 5)) || [])

    console.log('Créneaux générés:', slots)
    setAvailableSlots(slots)
  }

  const handleBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !clientData.name || !clientData.email) {
      setMessage('Veuillez remplir tous les champs obligatoires')
      return
    }

    setBooking(true)

    try {
      // Vérifier que le créneau n'est pas déjà pris
      const { data: existingBooking } = await supabase
        .from('appointments')
        .select('id')
        .eq('employee_id', selectedEmployee.id || null)
        .eq('appointment_date', selectedDate)
        .eq('appointment_time', selectedTime)
        .eq('status', 'confirmed')

      if (existingBooking && existingBooking.length > 0) {
        setMessage('❌ Ce créneau est déjà réservé')
        return
      }

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          professional_id: salon.id,
          service_id: selectedService.id,
          employee_id: selectedEmployee?.id || null,
          duration: selectedService.duration,
          client_name: clientData.name,
          client_email: clientData.email,
          client_phone: clientData.phone,
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          notes: clientData.notes,
          status: 'confirmed'
        })
        .select()
        .single()

      if (error) throw error

      // Envoi email de confirmation via EmailJS
      try {
        emailjs.init('O9z_URjC71IUF978k')
        
        const templateParams = {
          client_email: clientData.email,
          client_name: clientData.name,
          salon_name: salon.salon_name,
          date: new Date(selectedDate).toLocaleDateString('fr-FR'),
          time: selectedTime,
          service: selectedService.name + ' (' + selectedService.duration + ' min - ' + selectedService.price + '€)'
        }
        
        console.log('📧 Envoi email avec params:', templateParams)
        
        await emailjs.send(
          'default_service',
          'template_jd8j5os',
          templateParams
        )
        
        console.log('✅ Email de confirmation envoyé à', clientData.email)
      } catch (emailError) {
        console.error('❌ Erreur envoi email:', emailError)
        console.log('Le RDV est quand même enregistré')
      }

      setMessage('✅ Rendez-vous confirmé ! Vous allez recevoir un email de confirmation.')
      setStep(5)
    } catch (error) {
      console.error('Error:', error)
      setMessage('❌ Erreur lors de la réservation. Veuillez réessayer.')
    } finally {
      setBooking(false)
    }
  }

  if (loading) {
    return (
      <div className="booking-container">
        <div className="booking-loader">Chargement...</div>
      </div>
    )
  }

  if (!salon) {
    return (
      <div className="booking-container">
        <div className="booking-error">Salon non trouvé</div>
      </div>
    )
  }

  return (
    <div className="booking-container">
      {showInstallButton && (
        <div className="booking-install-banner">
          <span>📱 Installer l'app pour réserver plus vite</span>
          <div>
            <button onClick={handleInstallPWA} className="booking-install-btn">
              Installer
            </button>
            <button onClick={() => setShowInstallButton(false)} className="booking-close-btn">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="booking-header">
        <div className="booking-header-gradient"></div>
        <h1 className="booking-salon-name">{salon.salon_name}</h1>
        <p className="booking-salon-info">📍 {salon.city} • ☎️ {salon.phone}</p>
      </div>

      <div className="booking-progress-bar">
        {[1, 2, 3, 4, 5].map(num => (
          <div
            key={num}
            className={`booking-progress-step ${step >= num ? 'booking-progress-step-active' : ''}`}
          >
            {num}
          </div>
        ))}
      </div>

      <div className="booking-content">
        {step === 1 && (
          <div className="booking-step-container">
            <h2 className="booking-step-title">✨ Choisissez votre service</h2>
            <div className="booking-services-grid">
              {services.map(service => (
                <div
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service)
                    setStep(2) // Go to employee selection
                  }}
                  className={`booking-service-card ${selectedService?.id === service.id ? 'booking-service-card-active' : ''}`}
                >
                  <div className="booking-service-icon">💇</div>
                  <h3 className="booking-service-name">{service.name}</h3>
                  <div className="booking-service-details">
                    <span className="booking-service-duration">⏱ {service.duration} min</span>
                    <span className="booking-service-price">{service.price}€</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="booking-step-container">
            <button onClick={() => setStep(1)} className="booking-back-btn">← Retour</button>
            <h2 className="booking-step-title">👥 Choisissez votre employé</h2>
            <div className="booking-employees-grid">
              {employees.length === 0 ? (
                <div className="booking-no-employees">
                  <p>Aucun employé disponible pour ce service</p>
                  <p className="booking-no-employees-subtext">Vous pouvez continuer sans sélectionner d'employé</p>
                </div>
              ) : (
                employees.map(employee => (
                  <div
                    key={employee.id}
                    onClick={() => {
                      setSelectedEmployee(employee)
                      setStep(3)
                    }}
                    className={`booking-employee-card ${selectedEmployee?.id === employee.id ? 'booking-employee-card-active' : ''}`}
                  >
                    <div className="booking-employee-avatar">
                      {employee.photo_url ? (
                        <img
                          src={employee.photo_url}
                          alt={employee.name}
                          className="booking-employee-photo"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div
                        className="booking-employee-initial"
                        style={{display: employee.photo_url ? 'none' : 'flex'}}
                      >
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="booking-employee-info">
                      <h3 className="booking-employee-name">{employee.name}</h3>
                      {employee.specialty && (
                        <div className="booking-employee-specialty">{employee.specialty}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {/* Option to continue without selecting an employee */}
              <div
                onClick={() => {
                  setSelectedEmployee(null)
                  setStep(3)
                }}
                className={`booking-employee-card booking-no-employee-option ${selectedEmployee === null ? 'booking-employee-card-active' : ''}`}
              >
                <div className="booking-no-employee-icon">❓</div>
                <div className="booking-employee-info">
                  <h3 className="booking-employee-name">Peu importe</h3>
                  <div className="booking-employee-specialty">Continuer sans préférence</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="booking-step-container">
            <button onClick={() => setStep(2)} className="booking-back-btn">← Retour</button>
            <h2 className="booking-step-title">📅 Choisissez la date et l'heure</h2>
            
            <div className="booking-datetime-section">
              <label className="booking-label">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="booking-date-input"
              />

              {selectedDate && (
                <>
                  <label className="booking-label">Heure disponible</label>
                  <div className="booking-time-slots-grid">
                    {availableSlots.length === 0 ? (
                      <p className="booking-no-slots">Aucun créneau disponible ce jour</p>
                    ) : (
                      availableSlots.map(slot => {
                        const isBooked = bookedSlots?.includes(slot)
                        console.log('🔍 Slot:', slot, 'Booked:', isBooked, 'bookedSlots:', bookedSlots)
                        return (
                          <button
                            key={slot}
                            onClick={() => !isBooked && setSelectedTime(slot)}
                            disabled={isBooked}
                            className={`booking-time-slot ${isBooked ? 'booking-time-slot-disabled' : ''} ${selectedTime === slot ? 'booking-time-slot-active' : ''}`}
                          >
                            {slot}
                          </button>
                        )
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="booking-step-container">
            <button onClick={() => setStep(3)} className="booking-back-btn">← Retour</button>
            <h2 className="booking-step-title">👤 Vos informations</h2>
            
            <div className="booking-form">
              <div className="booking-form-group">
                <label className="booking-label">Nom complet *</label>
                <input
                  type="text"
                  value={clientData.name}
                  onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                  className="booking-input"
                  placeholder="Jean Dupont"
                />
              </div>

              <div className="booking-form-group">
                <label className="booking-label">Email *</label>
                <input
                  type="email"
                  value={clientData.email}
                  onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                  className="booking-input"
                  placeholder="jean.dupont@email.com"
                />
              </div>

              <div className="booking-form-group">
                <label className="booking-label">Téléphone</label>
                <input
                  type="tel"
                  value={clientData.phone}
                  onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                  className="booking-input"
                  placeholder="06 12 34 56 78"
                />
              </div>

              <div className="booking-form-group">
                <label className="booking-label">Notes (optionnel)</label>
                <textarea
                  value={clientData.notes}
                  onChange={(e) => setClientData({ ...clientData, notes: e.target.value })}
                  className="booking-input" style={{minHeight: '80px'}}
                  placeholder="Demandes spéciales..."
                />
              </div>

              <button onClick={handleBooking} disabled={booking} className="booking-confirm-btn">
                {booking ? '⏳ Réservation en cours...' : '✨ Confirmer le rendez-vous'}
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="booking-step-container">
            <div className="booking-success-card">
              <div className="booking-success-icon">✅</div>
              <h2 className="booking-success-title">Rendez-vous confirmé !</h2>
              <div className="booking-success-details">
                <p><strong>Service :</strong> {selectedService.name}</p>
                {selectedEmployee && (
                  <p><strong>Employé :</strong> {selectedEmployee.name}</p>
                )}
                <p><strong>Date :</strong> {new Date(selectedDate).toLocaleDateString('fr-FR')}</p>
                <p><strong>Heure :</strong> {selectedTime}</p>
                <p><strong>Durée :</strong> {selectedService.duration} minutes</p>
                <p><strong>Prix :</strong> {selectedService.price}€</p>
              </div>
              <p className="booking-success-message">
                📧 Un email de confirmation a été envoyé à {clientData.email}
              </p>
              <button onClick={() => window.location.reload()} className="booking-new-booking-btn">
                Nouvelle réservation
              </button>
            </div>
          </div>
        )}
      </div>

      {message && (
        <div className="booking-toast">
          {message}
        </div>
      )}
    </div>
  )
}

export default BookingPage
