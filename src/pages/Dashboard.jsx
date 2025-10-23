import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ShareTab from '../components/Dashboard/ShareTab'
import SchedulePlanner from '../components/Dashboard/SchedulePlanner'
import './Dashboard.css'

const Dashboard = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [services, setServices] = useState([])
  const [appointments, setAppointments] = useState([])
  const [availability, setAvailability] = useState({
    0: { enabled: false, start: '09:00', end: '18:00' }, // Dimanche
    1: { enabled: true, start: '09:00', end: '18:00' },  // Lundi
    2: { enabled: true, start: '09:00', end: '18:00' },  // Mardi
    3: { enabled: true, start: '09:00', end: '18:00' },  // Mercredi
    4: { enabled: true, start: '09:00', end: '18:00' },  // Jeudi
    5: { enabled: true, start: '09:00', end: '18:00' },  // Vendredi
    6: { enabled: false, start: '09:00', end: '18:00' }  // Samedi
  })
  const [loading, setLoading] = useState(true)
  const [trialDaysLeft, setTrialDaysLeft] = useState(0)
  
  // États pour les formulaires
  const [salonInfo, setSalonInfo] = useState({
    salon_name: '',
    phone: '',
    city: '',
    address: ''
  })
  const [newService, setNewService] = useState({
    name: '',
    duration: 30,
    price: 0
  })
  const [employees, setEmployees] = useState([])
  const [employeeSchedules, setEmployeeSchedules] = useState({})
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    specialty: '',
    customSpecialty: '',
    email: '',
    phone: '',
    photo: null,
    photoPreview: ''
  })

  useEffect(() => {
    checkUser()
  }, [])

  // Charger horaires SALON au démarrage
  useEffect(() => {
    if (user) {
      fetchSalonAvailability(user.id)
    }
  }, [user])

  // Charger horaires EMPLOYÉS au démarrage
  useEffect(() => {
    if (user && employees.length > 0) {
      employees.forEach(employee => {
        fetchEmployeeSchedules(employee.id)
      })
    }
  }, [user, employees])

  // Charger horaires quand on sélectionne un employé
  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeSchedules(selectedEmployee)
    }
  }, [selectedEmployee])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      navigate('/')
      return
    }

    setUser(user)
    await fetchUserData(user.id)
  }

  const fetchUserData = async (userId) => {
    try {
      // Profil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      setProfile(profileData)
      setSalonInfo({
        salon_name: profileData?.salon_name || '',
        phone: profileData?.phone || '',
        city: profileData?.city || '',
        address: profileData?.address || ''
      })

      // Calcul jours restants trial
      if (profileData?.trial_end) {
        const daysLeft = Math.ceil((new Date(profileData.trial_end) - new Date()) / (1000 * 60 * 60 * 24))
        setTrialDaysLeft(daysLeft > 0 ? daysLeft : 0)
      }

      // Services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', userId)
      setServices(servicesData || [])

      // Rendez-vous
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('*, services(*)')
        .eq('professional_id', userId)
        .order('appointment_date', { ascending: false })
      setAppointments(appointmentsData || [])

      // Horaires salon
      await fetchSalonAvailability(userId)

      // Employés
      await fetchEmployees(userId)

      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const updateSalonInfo = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(salonInfo)
        .eq('id', user.id)
      
      if (!error) {
        alert('✅ Informations mises à jour')
        fetchUserData(user.id)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const addService = async () => {
    if (!newService.name || newService.price <= 0) {
      alert('⚠️ Remplissez tous les champs')
      return
    }

    try {
      const { error } = await supabase
        .from('services')
        .insert({
          user_id: user.id,
          ...newService
        })
      
      if (!error) {
        alert('✅ Service ajouté')
        setNewService({ name: '', duration: 30, price: 0 })
        fetchUserData(user.id)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const deleteService = async (id) => {
    if (!confirm('Supprimer ce service ?')) return

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id)
      
      if (!error) {
        alert('✅ Service supprimé')
        fetchUserData(user.id)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const updateAppointmentStatus = async (id, status) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id)
      
      if (!error) {
        alert(`✅ Rendez-vous ${status === 'completed' ? 'terminé' : 'annulé'}`)
        fetchUserData(user.id)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // 🔍 RÉCUPÉRER horaires salon
  const fetchSalonAvailability = async (userId) => {
    try {
      console.log('🏪 Récupération horaires salon')

      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('user_id', userId)
        .is('employee_id', null) // ← CRUCIAL : Seulement horaires salon

      if (error) throw error

      console.log('📊 Horaires salon récupérés:', data)

      if (data && data.length > 0) {
        const formattedAvailability = {}

        // Initialiser tous les jours à false
        for (let i = 0; i <= 6; i++) {
          formattedAvailability[i] = {
            enabled: false,
            start: '09:00',
            end: '18:00'
          }
        }

        // Remplir avec les données de la DB
        data.forEach(slot => {
          formattedAvailability[slot.day_of_week] = {
            enabled: true,
            start: slot.start_time?.substring(0, 5) || '09:00',
            end: slot.end_time?.substring(0, 5) || '18:00'
          }
        })

        setAvailability(formattedAvailability)
      }
    } catch (error) {
      console.error('❌ Erreur fetch horaires salon:', error)
    }
  }

  // 💾 SAUVEGARDER horaires salon
  const saveAvailability = async () => {
    try {
      console.log('💾 Sauvegarde horaires salon')

      // 1. Supprimer anciennes disponibilités SALON
      const { error: deleteError } = await supabase
        .from('availability')
        .delete()
        .eq('user_id', user.id)
        .is('employee_id', null) // ← CRUCIAL : Seulement horaires salon

      if (deleteError) throw deleteError

      // 2. Préparer nouvelles données
      const availabilityData = []

      Object.entries(availability).forEach(([day, times]) => {
        if (times.enabled && times.start && times.end) {
          availabilityData.push({
            user_id: user.id,
            employee_id: null, // ← Pas d'employé = horaires salon
            day_of_week: parseInt(day), // ← INTEGER 0-6
            start_time: times.start,
            end_time: times.end
          })
        }
      })

      console.log('📝 Horaires salon à insérer:', availabilityData)

      // 3. Insérer nouvelles disponibilités
      if (availabilityData.length > 0) {
        const { error: insertError } = await supabase
          .from('availability')
          .insert(availabilityData)

        if (insertError) throw insertError
      }

      alert('✅ Horaires du salon sauvegardés')
      await fetchSalonAvailability(user.id)

    } catch (error) {
      console.error('❌ Erreur sauvegarde horaires salon:', error)
      alert('❌ Erreur: ' + error.message)
    }
  }

  // 📝 MODIFIER horaire salon
  const handleAvailabilityChange = (day, field, value) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }))
  }

  // 💾 SAUVEGARDER horaires employé
  const saveEmployeeSchedule = async (employeeId) => {
    try {
      console.log('💾 Sauvegarde horaires employé:', employeeId)

      const employee = employees.find(e => e.id === employeeId)
      if (!employee) {
        alert('❌ Employé non trouvé')
        return
      }

      const scheduleData = employeeSchedules[employeeId] || {}

      // 1. Supprimer horaires existants
      const { error: deleteError } = await supabase
        .from('employee_schedules')
        .delete()
        .eq('employee_id', employeeId)

      if (deleteError) throw deleteError

      // 2. Préparer nouvelles données
      const schedulesToInsert = []

      const daysOfWeek = [
        'monday', 'tuesday', 'wednesday', 'thursday',
        'friday', 'saturday', 'sunday'
      ]

      daysOfWeek.forEach(day => {
        const dayData = scheduleData[day]

        if (dayData && dayData.enabled && dayData.start && dayData.end) {
          schedulesToInsert.push({
            employee_id: employeeId,
            day_of_week: day, // ← TEXT "monday", "tuesday"...
            start_time: dayData.start,
            end_time: dayData.end
          })
        }
      })

      console.log('📝 Horaires employé à insérer:', schedulesToInsert)

      // 3. Insérer nouveaux horaires
      if (schedulesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('employee_schedules')
          .insert(schedulesToInsert)

        if (insertError) throw insertError

        alert('✅ Horaires employé sauvegardés')
      } else {
        alert('⚠️ Aucun horaire à sauvegarder')
      }

      await fetchEmployeeSchedules(employeeId)

    } catch (error) {
      console.error('❌ Erreur sauvegarde horaires employé:', error)
      alert('❌ Erreur: ' + error.message)
    }
  }

  // 🔍 RÉCUPÉRER horaires employé
  const fetchEmployeeSchedules = async (employeeId) => {
    try {
      console.log('👤 Récupération horaires employé:', employeeId)

      const { data, error } = await supabase
        .from('employee_schedules')
        .select('*')
        .eq('employee_id', employeeId)

      if (error) throw error

      console.log('📊 Horaires employé récupérés:', data)

      const scheduleByDay = {}

      const daysOfWeek = [
        'monday', 'tuesday', 'wednesday', 'thursday',
        'friday', 'saturday', 'sunday'
      ]

      daysOfWeek.forEach(day => {
        const daySchedule = data?.find(s => s.day_of_week === day)

        if (daySchedule) {
          scheduleByDay[day] = {
            enabled: true,
            start: daySchedule.start_time?.substring(0, 5) || '09:00',
            end: daySchedule.end_time?.substring(0, 5) || '18:00'
          }
        } else {
          scheduleByDay[day] = {
            enabled: false,
            start: '09:00',
            end: '18:00'
          }
        }
      })

      console.log('📅 Schedule employé formaté:', scheduleByDay)

      setEmployeeSchedules(prev => ({
        ...prev,
        [employeeId]: scheduleByDay
      }))

      return scheduleByDay

    } catch (error) {
      console.error('❌ Erreur fetch horaires employé:', error)
      return null
    }
  }

  // 📝 MODIFIER horaire employé
  const handleScheduleChange = (employeeId, day, field, value) => {
    console.log(`📝 Modification: employé=${employeeId}, jour=${day}, champ=${field}, valeur=${value}`)

    setEmployeeSchedules(prev => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [day]: {
          ...(prev[employeeId]?.[day] || { enabled: false, start: '09:00', end: '18:00' }),
          [field]: value
        }
      }
    }))
  }

  const fetchEmployees = async (userId) => {
    try {
      const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('salon_id', userId)
        .eq('active', true)
        .order('name')

      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const addEmployee = async () => {
    if (!newEmployee.name) {
      alert('⚠️ Le nom est obligatoire')
      return
    }

    try {
      let photoUrl = null

      // Upload photo if provided
      if (newEmployee.photo) {
        photoUrl = await uploadPhoto(newEmployee.photo)
      }

      // Avant d'envoyer à Supabase
      const finalSpecialty = newEmployee.specialty === 'custom'
        ? newEmployee.customSpecialty
        : newEmployee.specialty

      const { error } = await supabase
        .from('employees')
        .insert({
          salon_id: user.id,
          name: newEmployee.name,
          specialty: finalSpecialty,
          email: newEmployee.email || null,
          phone: newEmployee.phone || null,
          photo_url: photoUrl,
          active: true
        })

      if (!error) {
        alert('✅ Employé ajouté')
        setNewEmployee({
          name: '',
          specialty: '',
          customSpecialty: '',
          email: '',
          phone: '',
          photo: null,
          photoPreview: ''
        })
        fetchEmployees(user.id)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const editEmployee = async (employee) => {
    const updatedName = prompt('Nouveau nom:', employee.name)
    const updatedSpecialty = prompt('Nouvelle spécialité:', employee.specialty)
    const updatedEmail = prompt('Nouvel email:', employee.email)
    const updatedPhone = prompt('Nouveau téléphone:', employee.phone)

    if (updatedName && updatedEmail) {
      try {
        const { error } = await supabase
          .from('employees')
          .update({
            name: updatedName,
            specialty: updatedSpecialty,
            email: updatedEmail,
            phone: updatedPhone
          })
          .eq('id', employee.id)

        if (!error) {
          alert('✅ Employé modifié')
          fetchEmployees(user.id)
        }
      } catch (error) {
        console.error('Error:', error)
      }
    }
  }

  const deleteEmployee = async (id) => {
    if (!confirm('Supprimer cet employé ?')) return

    try {
      const { error } = await supabase
        .from('employees')
        .update({ active: false })
        .eq('id', id)

      if (!error) {
        alert('✅ Employé supprimé')
        fetchEmployees(user.id)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // 1️⃣ VALIDATION FORMAT
    const allowedFormats = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedFormats.includes(file.type)) {
      alert('❌ Format non accepté ! Seulement JPG, PNG ou WebP')
      return
    }

    // 2️⃣ VALIDATION TAILLE (2MB max)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      alert(`❌ Image trop grande ! Max 2MB (votre image : ${sizeMB}MB)`)
      return
    }

    // 3️⃣ REDIMENSIONNER & COMPRESSER (canvas)
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // Créer canvas 400x400
        const canvas = document.createElement('canvas')
        canvas.width = 400
        canvas.height = 400
        const ctx = canvas.getContext('2d')
        
        // Centrer l'image sur le canvas (crop carré)
        const size = Math.min(img.width, img.height)
        const x = (img.width - size) / 2
        const y = (img.height - size) / 2
        
        ctx.drawImage(img, x, y, size, size, 0, 0, 400, 400)
        
        // Convertir en Blob (compressé en WebP)
        canvas.toBlob(
          (blob) => {
            // Créer nouveau File object
            const compressedFile = new File([blob], 'avatar.webp', { type: 'image/webp' })
            
            setNewEmployee({
              ...newEmployee,
              photo: compressedFile,
              photoPreview: canvas.toDataURL('image/webp')
            })
            
            console.log('✅ Photo compressée :', {
              original: file.size,
              compressed: blob.size,
              format: 'WebP',
              dimensions: '400x400'
            })
          },
          'image/webp',
          0.8 // Qualité 80% pour bonne compression
        )
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  const uploadPhoto = async (file) => {
    try {
      // Double vérification avant upload (par sécurité)
      const allowedFormats = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedFormats.includes(file.type)) {
        throw new Error('Format de fichier non valide')
      }

      const maxSize = 2 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error('Fichier trop volumineux')
      }

      // Upload avec nouveau nom standardisé
      const fileExt = 'webp' // Toujours WebP après compression
      const fileName = `${user.id}/${Date.now()}-avatar.${fileExt}`
      
      console.log('📤 Upload de la photo...', { fileName, size: file.size })

      const { data, error } = await supabase.storage
        .from('employee-photos')
        .upload(fileName, file)

      if (error) {
        throw error
      }

      const { data: { publicUrl } } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(fileName)

      console.log('✅ Photo uploadée :', publicUrl)
      return publicUrl
    } catch (error) {
      console.error('❌ Erreur upload photo:', error)
      alert(`❌ Erreur lors de l'upload : ${error.message}`)
      return null
    }
  }

  // Statistiques
  const todayAppointments = appointments.filter(a => 
    new Date(a.appointment_date).toDateString() === new Date().toDateString()
  ).length

  const weekAppointments = appointments.filter(a => {
    const appointmentDate = new Date(a.appointment_date)
    const today = new Date()
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    return appointmentDate >= weekAgo && appointmentDate <= today
  }).length

  const monthRevenue = appointments
    .filter(a => {
      const appointmentDate = new Date(a.appointment_date)
      const today = new Date()
      return appointmentDate.getMonth() === today.getMonth() &&
             appointmentDate.getFullYear() === today.getFullYear() &&
             a.status === 'completed'
    })
    .reduce((sum, a) => sum + (a.services?.price || 0), 0)

  if (loading) {
    return <div className="dashboard-loading">Chargement...</div>
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <h1 className="dashboard-logo">
            <span className="dashboard-logo-booking">Booking</span>
            <span className="dashboard-logo-saas">SaaS</span>
            <span className="dashboard-logo-dashboard">Dashboard</span>
          </h1>
          <div className="dashboard-header-right">
            <span className="dashboard-user-email">{user?.email}</span>
            <button onClick={handleLogout} className="dashboard-logout-btn">
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* Trial Banner */}
      {trialDaysLeft > 0 && (
        <div className="dashboard-trial-banner">
          🎉 <strong>Essai gratuit - {trialDaysLeft} jours restants</strong>
          <p className="dashboard-trial-text">
            Votre essai se termine le {new Date(profile?.trial_end).toLocaleDateString('fr-FR')}
          </p>
        </div>
      )}

      {/* Bienvenue */}
      <div className="dashboard-welcome">
        <h2 className="dashboard-welcome-title">Dashboard</h2>
        <p className="dashboard-welcome-text">Bienvenue, {user?.email}</p>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`dashboard-tab ${activeTab === 'overview' ? 'dashboard-tab-active' : ''}`}
        >
          📊 Vue d'ensemble
        </button>
        <button
          onClick={() => setActiveTab('appointments')}
          className={`dashboard-tab ${activeTab === 'appointments' ? 'dashboard-tab-active' : ''}`}
        >
          📅 Rendez-vous
        </button>
        <button
          onClick={() => setActiveTab('salon')}
          className={`dashboard-tab ${activeTab === 'salon' ? 'dashboard-tab-active' : ''}`}
        >
          🏪 Infos salon
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`dashboard-tab ${activeTab === 'services' ? 'dashboard-tab-active' : ''}`}
        >
          🛠️ Services
        </button>
        <button
          onClick={() => setActiveTab('hours')}
          className={`dashboard-tab ${activeTab === 'hours' ? 'dashboard-tab-active' : ''}`}
        >
          🕐 Horaires
        </button>
        <button
          onClick={() => setActiveTab('share')}
          className={`dashboard-tab ${activeTab === 'share' ? 'dashboard-tab-active' : ''}`}
        >
          📢 Diffusion
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`dashboard-tab ${activeTab === 'team' ? 'dashboard-tab-active' : ''}`}
        >
          👥 Équipe
        </button>
        <button
          onClick={() => setActiveTab('planning')}
          className={`dashboard-tab ${activeTab === 'planning' ? 'dashboard-tab-active' : ''}`}
        >
          📅 Planning
        </button>
      </div>

      {/* Content */}
      <div className="dashboard-content">
        
        {/* VUE D'ENSEMBLE */}
        {activeTab === 'overview' && (
          <div>
            <div className="dashboard-stats-grid">
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-icon">📅</div>
                <div className="dashboard-stat-label">RDV Aujourd'hui</div>
                <div className="dashboard-stat-value">{todayAppointments}</div>
              </div>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-icon">📊</div>
                <div className="dashboard-stat-label">Cette Semaine</div>
                <div className="dashboard-stat-value">{weekAppointments}</div>
              </div>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-icon">💰</div>
                <div className="dashboard-stat-label">Revenus du Mois</div>
                <div className="dashboard-stat-value">{monthRevenue}€</div>
              </div>
            </div>

            <div className="dashboard-section">
              <h3 className="dashboard-section-title">Prochains Rendez-vous</h3>
              {appointments.filter(a => a.status === 'confirmed').slice(0, 5).map(apt => (
                <div key={apt.id} className="dashboard-appointment-item">
                  <div>
                    <strong>{apt.client_name}</strong> - {apt.services?.name}
                    <br />
                    <span className="dashboard-appointment-date">
                      {new Date(apt.appointment_date).toLocaleDateString('fr-FR')} à {apt.appointment_time}
                    </span>
                  </div>
                  <span className="dashboard-appointment-price">{apt.services?.price}€</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RENDEZ-VOUS */}
        {activeTab === 'appointments' && (
          <div className="dashboard-section">
            <h3 className="dashboard-section-title">Tous les Rendez-vous</h3>
            {appointments.map(apt => (
              <div key={apt.id} className="dashboard-appointment-card">
                <div className="dashboard-appointment-header">
                  <div>
                    <strong className="dashboard-client-name">{apt.client_name}</strong>
                    <div className="dashboard-appointment-details">
                      📧 {apt.client_email} • ☎️ {apt.client_phone || 'Non renseigné'}
                    </div>
                  </div>
                  <span className={`dashboard-status-badge ${
                    apt.status === 'confirmed' ? 'dashboard-status-confirmed' :
                    apt.status === 'completed' ? 'dashboard-status-completed' :
                    apt.status === 'cancelled' ? 'dashboard-status-cancelled' : ''
                  }`}>
                    {apt.status === 'confirmed' && '✅ Confirmé'}
                    {apt.status === 'completed' && '✔️ Terminé'}
                    {apt.status === 'cancelled' && '❌ Annulé'}
                  </span>
                </div>
                <div className="dashboard-appointment-info">
                  <div>🛠️ {apt.services?.name}</div>
                  <div>📅 {new Date(apt.appointment_date).toLocaleDateString('fr-FR')}</div>
                  <div>🕐 {apt.appointment_time}</div>
                  <div>⏱️ {apt.duration} min</div>
                  <div>💰 {apt.services?.price}€</div>
                </div>
                {apt.notes && (
                  <div className="dashboard-appointment-notes">
                    📝 Notes: {apt.notes}
                  </div>
                )}
                {apt.status === 'confirmed' && (
                  <div className="dashboard-appointment-actions">
                    <button
                      onClick={() => updateAppointmentStatus(apt.id, 'completed')}
                      className="dashboard-btn-complete"
                    >
                      ✅ Marquer terminé
                    </button>
                    <button
                      onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                      className="dashboard-btn-cancel"
                    >
                      ❌ Annuler
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* INFOS SALON */}
        {activeTab === 'salon' && (
          <div className="dashboard-section">
            <h3 className="dashboard-section-title">Informations du Salon</h3>
            <div className="dashboard-form">
              <div className="dashboard-form-group">
                <label className="dashboard-label">Nom du salon</label>
                <input
                  type="text"
                  value={salonInfo.salon_name}
                  onChange={(e) => setSalonInfo({...salonInfo, salon_name: e.target.value})}
                  className="dashboard-input"
                />
              </div>
              <div className="dashboard-form-group">
                <label className="dashboard-label">Téléphone</label>
                <input
                  type="tel"
                  value={salonInfo.phone}
                  onChange={(e) => setSalonInfo({...salonInfo, phone: e.target.value})}
                  className="dashboard-input"
                />
              </div>
              <div className="dashboard-form-group">
                <label className="dashboard-label">Ville</label>
                <input
                  type="text"
                  value={salonInfo.city}
                  onChange={(e) => setSalonInfo({...salonInfo, city: e.target.value})}
                  className="dashboard-input"
                />
              </div>
              <div className="dashboard-form-group">
                <label className="dashboard-label">Adresse complète</label>
                <input
                  type="text"
                  placeholder="Ex: 15 rue de la République"
                  value={salonInfo.address}
                  onChange={(e) => setSalonInfo({...salonInfo, address: e.target.value})}
                  className="dashboard-input"
                />
              </div>
              <button onClick={updateSalonInfo} className="dashboard-btn-primary">
                💾 Enregistrer
              </button>
            </div>
          </div>
        )}

        {/* SERVICES */}
        {activeTab === 'services' && (
          <div className="dashboard-section">
            <h3 className="dashboard-section-title">Ajouter un Service</h3>
            <div className="dashboard-form">
              <div className="dashboard-form-group">
                <label className="dashboard-label">Nom du service *</label>
                <select
                  value={newService.name}
                  onChange={(e) => setNewService({...newService, name: e.target.value})}
                  className="dashboard-input"
                >
                  <option value="">-- Sélectionnez un service --</option>
                  <optgroup label="🧔 Services Hommes">
                    <option value="Coupe homme">Coupe homme</option>
                    <option value="Coupe + barbe">Coupe + barbe</option>
                    <option value="Barbe">Barbe</option>
                    <option value="Tondeuse">Tondeuse</option>
                  </optgroup>
                  <optgroup label="👩 Services Femmes">
                    <option value="Coupe femme">Coupe femme</option>
                    <option value="Brushing">Brushing</option>
                    <option value="Coloration">Coloration</option>
                    <option value="Mèches">Mèches</option>
                    <option value="Balayage">Balayage</option>
                    <option value="Coupe + brushing">Coupe + brushing</option>
                    <option value="Coupe + couleur">Coupe + couleur</option>
                  </optgroup>
                  <optgroup label="🧒 Services Enfants">
                    <option value="Coupe enfant">Coupe enfant</option>
                  </optgroup>
                  <optgroup label="💅 Soins & Autres">
                    <option value="Soin capillaire">Soin capillaire</option>
                    <option value="Défrisage">Défrisage</option>
                    <option value="Lissage">Lissage</option>
                    <option value="Permanente">Permanente</option>
                    <option value="Extension">Extension</option>
                    <option value="Chignon">Chignon</option>
                    <option value="Coiffure mariage">Coiffure mariage</option>
                  </optgroup>
                </select>
                <input
                  type="text"
                  placeholder="Ou entrez un nom de service personnalisé"
                  onChange={(e) => e.target.value && setNewService({...newService, name: e.target.value})}
                  className="dashboard-input" style={{marginTop: '10px'}}
                />
              </div>

              <div className="dashboard-form-group">
                <label className="dashboard-label">Durée (minutes) *</label>
                <select
                  value={newService.duration}
                  onChange={(e) => setNewService({...newService, duration: parseInt(e.target.value)})}
                  className="dashboard-input"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 heure (60 min)</option>
                  <option value={90}>1h30 (90 min)</option>
                  <option value={120}>2 heures (120 min)</option>
                  <option value={150}>2h30 (150 min)</option>
                  <option value={180}>3 heures (180 min)</option>
                </select>
                <input
                  type="number"
                  placeholder="Ou entrez une durée personnalisée"
                  onChange={(e) => e.target.value && setNewService({...newService, duration: parseInt(e.target.value)})}
                  className="dashboard-input" style={{marginTop: '10px'}}
                  min="5"
                  max="480"
                />
              </div>

              <div className="dashboard-form-group">
                <label className="dashboard-label">Prix (€) *</label>
                <select
                  value={newService.price || ''}
                  onChange={(e) => setNewService({...newService, price: parseFloat(e.target.value)})}
                  className="dashboard-input"
                >
                  <option value="">-- Sélectionnez un prix --</option>
                  <option value={15}>15€</option>
                  <option value={20}>20€</option>
                  <option value={25}>25€</option>
                  <option value={30}>30€</option>
                  <option value={35}>35€</option>
                  <option value={40}>40€</option>
                  <option value={45}>45€</option>
                  <option value={50}>50€</option>
                  <option value={60}>60€</option>
                  <option value={70}>70€</option>
                  <option value={80}>80€</option>
                  <option value={90}>90€</option>
                  <option value={100}>100€</option>
                  <option value={120}>120€</option>
                  <option value={150}>150€</option>
                  <option value={200}>200€</option>
                </select>
                <input
                  type="number"
                  placeholder="Ou entrez un prix personnalisé"
                  onChange={(e) => e.target.value && setNewService({...newService, price: parseFloat(e.target.value)})}
                  className="dashboard-input" style={{marginTop: '10px'}}
                  min="0"
                  step="0.5"
                />
              </div>

              <button onClick={addService} className="dashboard-btn-primary">
                ➕ Ajouter le service
              </button>
            </div>

            <h3 className="dashboard-section-title" style={{marginTop: '40px'}}>Services Existants</h3>
            {services.map(service => (
              <div key={service.id} className="dashboard-service-card">
                <div>
                  <strong className="dashboard-service-name">{service.name}</strong>
                  <div className="dashboard-service-details">
                    ⏱️ {service.duration} min • 💰 {service.price}€
                  </div>
                </div>
                <button
                  onClick={() => deleteService(service.id)}
                  className="dashboard-btn-delete"
                >
                  🗑️ Supprimer
                </button>
              </div>
            ))}
          </div>
        )}

        {/* HORAIRES */}
        {activeTab === 'hours' && (
          <div className="dashboard-section">
            <h3 className="dashboard-section-title">🏪 Horaires du Salon</h3>
            <p className="dashboard-hours-description">
              Définissez les horaires d'ouverture globaux de votre salon. Les créneaux de réservation seront générés automatiquement en fonction de ces horaires.
            </p>

            <div className="dashboard-form">
              {[
                { day: 1, label: 'Lundi' },
                { day: 2, label: 'Mardi' },
                { day: 3, label: 'Mercredi' },
                { day: 4, label: 'Jeudi' },
                { day: 5, label: 'Vendredi' },
                { day: 6, label: 'Samedi' },
                { day: 0, label: 'Dimanche' }
              ].map(({ day, label }) => (
                <div key={day} className="dashboard-day-row">
                  <div className="dashboard-day-checkbox">
                    <input
                      type="checkbox"
                      checked={availability[day]?.enabled || false}
                      onChange={(e) => handleAvailabilityChange(day, 'enabled', e.target.checked)}
                      className="dashboard-checkbox"
                    />
                    <div className={`dashboard-day-name ${!availability[day]?.enabled ? 'dashboard-day-name-closed' : ''}`}>
                      {label}
                    </div>
                  </div>

                  {availability[day]?.enabled && (
                    <div className="dashboard-day-inputs">
                      <input
                        type="time"
                        value={availability[day]?.start || '09:00'}
                        onChange={(e) => handleAvailabilityChange(day, 'start', e.target.value)}
                        className="dashboard-time-input"
                      />
                      <span className="dashboard-time-separator">-</span>
                      <input
                        type="time"
                        value={availability[day]?.end || '18:00'}
                        onChange={(e) => handleAvailabilityChange(day, 'end', e.target.value)}
                        className="dashboard-time-input"
                      />
                    </div>
                  )}

                  {!availability[day]?.enabled && (
                    <div className="dashboard-day-closed-label">En repos</div>
                  )}
                </div>
              ))}

              <div className="dashboard-hours-footer">
                <button
                  onClick={saveAvailability}
                  className="dashboard-btn-primary"
                >
                  💾 Enregistrer les horaires du salon
                </button>
                <p className="dashboard-hours-note">
                  ℹ️ Les modifications sont enregistrées automatiquement
                </p>
              </div>
            </div>
          </div>
        )}

        {/* DIFFUSION */}
        {activeTab === 'share' && <ShareTab />}

        {/* ÉQUIPE */}
        {activeTab === 'team' && (
          <div className="dashboard-section">
            <h3 className="dashboard-section-title">Mon Équipe</h3>
            <p className="dashboard-team-description">
              Gérez les membres de votre équipe. Ils pourront accéder à votre planning et gérer les rendez-vous.
            </p>

            {/* Formulaire d'ajout d'employé */}
            <div className="dashboard-form">
              <div className="dashboard-form-group">
                <label className="dashboard-label">Nom complet *</label>
                <input
                  type="text"
                  placeholder="Ex: Marie Dupont"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                  className="dashboard-input"
                />
              </div>

              <div className="dashboard-form-group">
                <label className="dashboard-label">Spécialité</label>
                <select
                  value={newEmployee.specialty}
                  onChange={(e) => setNewEmployee({...newEmployee, specialty: e.target.value})}
                  className="dashboard-select"
                >
                  <option value="">-- Sélectionnez une spécialité --</option>

                  <optgroup label="👥 Coiffure">
                    <option value="Coiffeur(se)">Coiffeur(se)</option>
                    <option value="Barbier">Barbier</option>
                    <option value="Coloriste">Coloriste</option>
                  </optgroup>

                  <optgroup label="💄 Beauté & Esthétique">
                    <option value="Esthéticienne">Esthéticienne</option>
                    <option value="Maquilleur(se)">Maquilleur(se)</option>
                    <option value="Onglerie">Onglerie</option>
                  </optgroup>

                  <optgroup label="🧘 Bien-être">
                    <option value="Masseur(se)">Masseur(se)</option>
                    <option value="Kinésithérapeute">Kinésithérapeute</option>
                    <option value="Thérapeute">Thérapeute</option>
                  </optgroup>

                  <optgroup label="✏️ Autre">
                    <option value="custom">Autre (saisir ci-dessous)</option>
                  </optgroup>
                </select>

                {/* Input libre si "Autre" sélectionné */}
                {newEmployee.specialty === 'custom' && (
                  <input
                    type="text"
                    placeholder="Entrez votre spécialité..."
                    value={newEmployee.customSpecialty || ''}
                    onChange={(e) => setNewEmployee({...newEmployee, customSpecialty: e.target.value})}
                    className="dashboard-input" style={{marginTop: '10px'}}
                  />
                )}
              </div>

              <div className="dashboard-form-group">
                <label className="dashboard-label">Email (optionnel)</label>
                <input
                  type="email"
                  placeholder="Email (optionnel)"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                  className="dashboard-input"
                />
              </div>

              <div className="dashboard-form-group">
                <label className="dashboard-label">Téléphone (optionnel)</label>
                <input
                  type="tel"
                  placeholder="Téléphone (optionnel)"
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
                  className="dashboard-input"
                />
              </div>

              <div className="dashboard-form-group">
                <label className="dashboard-label">Photo</label>
                <div className="dashboard-photo-upload">
                  {newEmployee.photoPreview && (
                    <div className="dashboard-photo-preview">
                      <img
                        src={newEmployee.photoPreview}
                        alt="Preview"
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoChange(e)}
                    className="dashboard-file-input"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="dashboard-file-label">
                    📷 Choisir une photo
                  </label>
                </div>
              </div>

              <button onClick={addEmployee} className="dashboard-btn-primary">
                ➕ Ajouter l'employé
              </button>
            </div>

            {/* Liste des employés */}
            <h3 className="dashboard-section-title" style={{marginTop: '40px'}}>Employés ({employees.length})</h3>
            {employees.length === 0 ? (
              <div className="dashboard-empty-state">
                <div className="dashboard-empty-icon">👥</div>
                <p className="dashboard-empty-text">Aucun employé pour le moment</p>
                <p className="dashboard-empty-subtext">Ajoutez votre premier employé pour commencer</p>
              </div>
            ) : (
              employees.map(employee => (
                <div key={employee.id} className="dashboard-employee-card">
                  <div className="dashboard-employee-info">
                    <div className="dashboard-employee-header">
                      <div className="dashboard-employee-photo-container">
                        <img
                          src={employee.photo_url || '/default-avatar.png'}
                          alt={employee.name}
                          className="dashboard-employee-photo"
                          onError={(e) => {
                            e.target.src = '/default-avatar.png'
                          }}
                        />
                      </div>
                      <div>
                        <strong className="dashboard-employee-name">{employee.name}</strong>
                        {employee.specialty && (
                          <div><span className="dashboard-employee-specialty">{employee.specialty}</span></div>
                        )}
                      </div>
                    </div>
                    <div className="dashboard-employee-details">
                      {employee.email && `📧 ${employee.email}`}
                      {employee.phone && ` • ☎️ ${employee.phone}`}
                    </div>
                  </div>
                  <div className="dashboard-employee-actions">
                    <button
                      onClick={() => editEmployee(employee)}
                      className="dashboard-btn-edit"
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => deleteEmployee(employee.id)}
                      className="dashboard-btn-delete"
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* PLANNING */}
        {activeTab === 'planning' && (
          <SchedulePlanner />
        )}

      </div>
    </div>
  )
}

export default Dashboard
