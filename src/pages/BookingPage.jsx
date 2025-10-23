import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import emailjs from '@emailjs/browser'

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
      <div style={styles.container}>
        <div style={styles.loader}>Chargement...</div>
      </div>
    )
  }

  if (!salon) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Salon non trouvé</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {showInstallButton && (
        <div style={styles.installBanner}>
          <span>📱 Installer l'app pour réserver plus vite</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleInstallPWA} style={styles.installBtn}>
              Installer
            </button>
            <button onClick={() => setShowInstallButton(false)} style={styles.closeBtn}>
              ✕
            </button>
          </div>
        </div>
      )}

      <div style={styles.header}>
        <div style={styles.headerGradient}></div>
        <h1 style={styles.salonName}>{salon.salon_name}</h1>
        <p style={styles.salonInfo}>📍 {salon.city} • ☎️ {salon.phone}</p>
      </div>

      <div style={styles.progressBar}>
        {[1, 2, 3, 4, 5].map(num => (
          <div
            key={num}
            style={{
              ...styles.progressStep,
              ...(step >= num ? styles.progressStepActive : {})
            }}
          >
            {num}
          </div>
        ))}
      </div>

      <div style={styles.content}>
        {step === 1 && (
          <div style={styles.stepContainer}>
            <h2 style={styles.stepTitle}>✨ Choisissez votre service</h2>
            <div style={styles.servicesGrid}>
              {services.map(service => (
                <div
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service)
                    setStep(2) // Go to employee selection
                  }}
                  style={{
                    ...styles.serviceCard,
                    ...(selectedService?.id === service.id ? styles.serviceCardActive : {})
                  }}
                >
                  <div style={styles.serviceIcon}>💇</div>
                  <h3 style={styles.serviceName}>{service.name}</h3>
                  <div style={styles.serviceDetails}>
                    <span style={styles.serviceDuration}>⏱ {service.duration} min</span>
                    <span style={styles.servicePrice}>{service.price}€</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={styles.stepContainer}>
            <button onClick={() => setStep(1)} style={styles.backBtn}>← Retour</button>
            <h2 style={styles.stepTitle}>👥 Choisissez votre employé</h2>
            <div style={styles.employeesGrid}>
              {employees.length === 0 ? (
                <div style={styles.noEmployees}>
                  <p>Aucun employé disponible pour ce service</p>
                  <p style={styles.noEmployeesSubtext}>Vous pouvez continuer sans sélectionner d'employé</p>
                </div>
              ) : (
                employees.map(employee => (
                  <div
                    key={employee.id}
                    onClick={() => {
                      setSelectedEmployee(employee)
                      setStep(3)
                    }}
                    style={{
                      ...styles.employeeCard,
                      ...(selectedEmployee?.id === employee.id ? styles.employeeCardActive : {})
                    }}
                  >
                    <div style={styles.employeeAvatar}>
                      {employee.photo_url ? (
                        <img
                          src={employee.photo_url}
                          alt={employee.name}
                          style={styles.employeePhoto}
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div
                        style={{
                          ...styles.employeeInitial,
                          display: employee.photo_url ? 'none' : 'flex'
                        }}
                      >
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div style={styles.employeeInfo}>
                      <h3 style={styles.employeeName}>{employee.name}</h3>
                      {employee.specialty && (
                        <div style={styles.employeeSpecialty}>{employee.specialty}</div>
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
                style={{
                  ...styles.employeeCard,
                  ...styles.noEmployeeOption,
                  ...(selectedEmployee === null ? styles.employeeCardActive : {})
                }}
              >
                <div style={styles.noEmployeeIcon}>❓</div>
                <div style={styles.employeeInfo}>
                  <h3 style={styles.employeeName}>Peu importe</h3>
                  <div style={styles.employeeSpecialty}>Continuer sans préférence</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={styles.stepContainer}>
            <button onClick={() => setStep(2)} style={styles.backBtn}>← Retour</button>
            <h2 style={styles.stepTitle}>📅 Choisissez la date et l'heure</h2>
            
            <div style={styles.dateTimeSection}>
              <label style={styles.label}>Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={styles.dateInput}
              />

              {selectedDate && (
                <>
                  <label style={styles.label}>Heure disponible</label>
                  <div style={styles.timeSlotsGrid}>
                    {availableSlots.length === 0 ? (
                      <p style={styles.noSlots}>Aucun créneau disponible ce jour</p>
                    ) : (
                      availableSlots.map(slot => {
                        const isBooked = bookedSlots?.includes(slot)
                        console.log('🔍 Slot:', slot, 'Booked:', isBooked, 'bookedSlots:', bookedSlots)
                        return (
                          <button
                            key={slot}
                            onClick={() => !isBooked && setSelectedTime(slot)}
                            disabled={isBooked}
                            style={{
                              ...styles.timeSlot,
                              ...(isBooked ? styles.timeSlotDisabled : {}),
                              ...(selectedTime === slot ? styles.timeSlotActive : {})
                            }}
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
          <div style={styles.stepContainer}>
            <button onClick={() => setStep(3)} style={styles.backBtn}>← Retour</button>
            <h2 style={styles.stepTitle}>👤 Vos informations</h2>
            
            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nom complet *</label>
                <input
                  type="text"
                  value={clientData.name}
                  onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                  style={styles.input}
                  placeholder="Jean Dupont"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email *</label>
                <input
                  type="email"
                  value={clientData.email}
                  onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                  style={styles.input}
                  placeholder="jean.dupont@email.com"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Téléphone</label>
                <input
                  type="tel"
                  value={clientData.phone}
                  onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                  style={styles.input}
                  placeholder="06 12 34 56 78"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Notes (optionnel)</label>
                <textarea
                  value={clientData.notes}
                  onChange={(e) => setClientData({ ...clientData, notes: e.target.value })}
                  style={{...styles.input, minHeight: '80px'}}
                  placeholder="Demandes spéciales..."
                />
              </div>

              <button onClick={handleBooking} disabled={booking} style={styles.confirmBtn}>
                {booking ? '⏳ Réservation en cours...' : '✨ Confirmer le rendez-vous'}
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div style={styles.stepContainer}>
            <div style={styles.successCard}>
              <div style={styles.successIcon}>✅</div>
              <h2 style={styles.successTitle}>Rendez-vous confirmé !</h2>
              <div style={styles.successDetails}>
                <p><strong>Service :</strong> {selectedService.name}</p>
                {selectedEmployee && (
                  <p><strong>Employé :</strong> {selectedEmployee.name}</p>
                )}
                <p><strong>Date :</strong> {new Date(selectedDate).toLocaleDateString('fr-FR')}</p>
                <p><strong>Heure :</strong> {selectedTime}</p>
                <p><strong>Durée :</strong> {selectedService.duration} minutes</p>
                <p><strong>Prix :</strong> {selectedService.price}€</p>
              </div>
              <p style={styles.successMessage}>
                📧 Un email de confirmation a été envoyé à {clientData.email}
              </p>
              <button onClick={() => window.location.reload()} style={styles.newBookingBtn}>
                Nouvelle réservation
              </button>
            </div>
          </div>
        )}
      </div>

      {message && (
        <div style={styles.toast}>
          {message}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a1a 0%, #2d3748 50%, #1a202c 100%)',
    color: '#fff',
    fontFamily: "'Inter', sans-serif"
  },
  header: {
    position: 'relative',
    padding: '60px 20px 40px',
    textAlign: 'center',
    overflow: 'hidden'
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '200px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
    opacity: 0.2,
    filter: 'blur(60px)'
  },
  salonName: {
    position: 'relative',
    fontSize: 'clamp(28px, 6vw, 42px)',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '10px'
  },
  salonInfo: {
    position: 'relative',
    fontSize: 'clamp(14px, 3vw, 16px)',
    color: '#9ca3af',
    margin: 0
  },
  progressBar: {
    display: 'flex',
    justifyContent: 'center',
    gap: 'clamp(10px, 3vw, 15px)',
    padding: '20px',
    maxWidth: '400px',
    margin: '0 auto',
    flexWrap: 'wrap'
  },
  progressStep: {
    width: 'clamp(40px, 10vw, 50px)',
    height: 'clamp(40px, 10vw, 50px)',
    borderRadius: '50%',
    background: '#374151',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'clamp(16px, 4vw, 20px)',
    fontWeight: 'bold',
    color: '#6b7280',
    transition: 'all 0.3s'
  },
  progressStepActive: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
    color: '#fff',
    transform: 'scale(1.1)',
    boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)'
  },
  content: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px'
  },
  stepContainer: {
    animation: 'fadeIn 0.5s ease-in'
  },
  stepTitle: {
    fontSize: 'clamp(24px, 5vw, 32px)',
    fontWeight: '700',
    marginBottom: '30px',
    textAlign: 'center'
  },
  servicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  serviceCard: {
    backgroundColor: '#374151',
    padding: '30px',
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    border: '2px solid transparent'
  },
  serviceCardActive: {
    border: '2px solid #3b82f6',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
    transform: 'translateY(-5px)',
    boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
  },
  serviceIcon: {
    fontSize: 'clamp(36px, 8vw, 48px)',
    marginBottom: '15px'
  },
  serviceName: {
    fontSize: 'clamp(20px, 4vw, 24px)',
    fontWeight: '600',
    marginBottom: '15px'
  },
  serviceDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 'clamp(14px, 3vw, 16px)',
    color: '#9ca3af',
    flexWrap: 'wrap',
    gap: '10px'
  },
  serviceDuration: {
    color: '#9ca3af'
  },
  servicePrice: {
    fontSize: 'clamp(20px, 4vw, 24px)',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  dateTimeSection: {
    backgroundColor: '#374151',
    padding: 'clamp(20px, 4vw, 30px)',
    borderRadius: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '10px',
    fontSize: 'clamp(14px, 3vw, 16px)',
    fontWeight: '600',
    color: '#9ca3af'
  },
  dateInput: {
    width: '100%',
    padding: 'clamp(12px, 3vw, 15px)',
    fontSize: 'clamp(14px, 3vw, 16px)',
    backgroundColor: '#1f2937',
    border: '2px solid #4b5563',
    borderRadius: '10px',
    color: '#fff',
    marginBottom: '30px',
    outline: 'none',
    boxSizing: 'border-box',
    colorScheme: 'dark',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    appearance: 'none',
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\'%3E%3Crect x=\'3\' y=\'4\' width=\'18\' height=\'18\' rx=\'2\' ry=\'2\'%3E%3C/rect%3E%3Cline x1=\'16\' y1=\'2\' x2=\'16\' y2=\'6\'%3E%3C/line%3E%3Cline x1=\'8\' y1=\'2\' x2=\'8\' y2=\'6\'%3E%3C/line%3E%3Cline x1=\'3\' y1=\'10\' x2=\'21\' y2=\'10\'%3E%3C/line%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 15px center',
    backgroundSize: '20px',
    paddingRight: '45px'
  },
  timeSlotsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
    gap: '10px',
    marginTop: '15px'
  },
  timeSlot: {
    padding: 'clamp(12px, 3vw, 15px)',
    backgroundColor: '#1f2937',
    border: '2px solid #4b5563',
    borderRadius: '10px',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontSize: 'clamp(14px, 3vw, 16px)',
    fontWeight: '600'
  },
  timeSlotActive: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
    border: '2px solid #3b82f6',
    transform: 'scale(1.05)'
  },
  noSlots: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: '20px'
  },
  employeesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  employeeCard: {
    backgroundColor: '#374151',
    padding: '20px',
    borderRadius: '15px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    border: '2px solid transparent',
    textAlign: 'center'
  },
  employeeCardActive: {
    border: '2px solid #3b82f6',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
    transform: 'translateY(-5px)',
    boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
  },
  employeeAvatar: {
    position: 'relative',
    width: '80px',
    height: '80px',
    margin: '0 auto 15px',
    borderRadius: '50%',
    overflow: 'hidden'
  },
  employeePhoto: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  employeeInitial: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#fff'
  },
  employeeName: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '5px',
    color: '#fff'
  },
  employeeSpecialty: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
    padding: '4px 12px',
    borderRadius: '15px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#fff',
    display: 'inline-block'
  },
  noEmployeeOption: {
    backgroundColor: '#2d3748',
    border: '2px dashed #4b5563'
  },
  noEmployeeIcon: {
    fontSize: '32px',
    marginBottom: '15px'
  },
  noEmployees: {
    textAlign: 'center',
    padding: '40px 20px',
    backgroundColor: '#374151',
    borderRadius: '15px',
    gridColumn: '1 / -1'
  },
  noEmployeesSubtext: {
    color: '#9ca3af',
    fontSize: '14px',
    marginTop: '10px'
  },
  form: {
    backgroundColor: '#374151',
    padding: 'clamp(20px, 4vw, 30px)',
    borderRadius: '20px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  input: {
    width: '100%',
    padding: 'clamp(12px, 3vw, 15px)',
    fontSize: 'clamp(14px, 3vw, 16px)',
    backgroundColor: '#1f2937',
    border: '2px solid #4b5563',
    borderRadius: '10px',
    color: '#fff',
    outline: 'none',
    boxSizing: 'border-box'
  },
  confirmBtn: {
    width: '100%',
    padding: 'clamp(16px, 4vw, 20px)',
    fontSize: 'clamp(16px, 3vw, 18px)',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
    border: 'none',
    borderRadius: '15px',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginTop: '20px'
  },
  successCard: {
    backgroundColor: '#374151',
    padding: 'clamp(30px, 6vw, 50px) clamp(20px, 4vw, 30px)',
    borderRadius: '20px',
    textAlign: 'center'
  },
  successIcon: {
    fontSize: 'clamp(60px, 12vw, 80px)',
    marginBottom: '20px'
  },
  successTitle: {
    fontSize: 'clamp(24px, 5vw, 32px)',
    fontWeight: '700',
    marginBottom: '30px',
    background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  successDetails: {
    textAlign: 'left',
    backgroundColor: '#1f2937',
    padding: 'clamp(15px, 3vw, 20px)',
    borderRadius: '10px',
    marginBottom: '20px',
    lineHeight: '2',
    fontSize: 'clamp(14px, 3vw, 16px)'
  },
  successMessage: {
    color: '#9ca3af',
    marginBottom: '30px',
    fontSize: 'clamp(14px, 3vw, 16px)'
  },
  newBookingBtn: {
    padding: 'clamp(12px, 3vw, 15px) clamp(30px, 6vw, 40px)',
    background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: 'clamp(14px, 3vw, 16px)',
    fontWeight: '600',
    cursor: 'pointer'
  },
  backBtn: {
    padding: '10px 20px',
    backgroundColor: '#4b5563',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    cursor: 'pointer',
    marginBottom: '20px',
    fontSize: 'clamp(12px, 2.5vw, 14px)'
  },
  installBanner: {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#3b82f6',
    padding: 'clamp(12px, 3vw, 15px) clamp(20px, 4vw, 30px)',
    borderRadius: '15px',
    boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(15px, 3vw, 20px)',
    maxWidth: '90%',
    fontSize: 'clamp(13px, 2.5vw, 15px)',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  installBtn: {
    padding: 'clamp(8px, 2vw, 10px) clamp(15px, 3vw, 20px)',
    backgroundColor: '#fff',
    color: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: 'clamp(12px, 2.5vw, 14px)'
  },
  closeBtn: {
    backgroundColor: 'transparent',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: 'clamp(18px, 4vw, 20px)'
  },
  toast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: '#374151',
    padding: 'clamp(12px, 3vw, 15px) clamp(20px, 4vw, 25px)',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    zIndex: 1000,
    fontSize: 'clamp(13px, 2.5vw, 15px)',
    maxWidth: '90%'
  },
  loader: {
    textAlign: 'center',
    padding: '100px 20px',
    fontSize: 'clamp(20px, 4vw, 24px)',
    color: '#9ca3af'
  },
  error: {
    textAlign: 'center',
    padding: '100px 20px',
    fontSize: 'clamp(20px, 4vw, 24px)',
    color: '#ef4444'
  },
  timeSlotDisabled: {
    opacity: 0.5,
    backgroundColor: '#6b7280',
    cursor: 'not-allowed',
    border: '2px solid #4b5563'
  }
}

export default BookingPage
