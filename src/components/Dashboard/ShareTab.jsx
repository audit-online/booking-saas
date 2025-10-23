import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { supabase } from '../../lib/supabase'

const ShareTab = () => {
  const [user, setUser] = useState(null)
  const [salon, setSalon] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        setSalon(profile)
        generateQRCode(profile.salon_name)
      }
    }
  }

  const generateQRCode = async (salonName) => {
    const slug = salonName.toLowerCase().replace(/\s+/g, '-')
    const bookingUrl = `${window.location.origin}/book/${slug}`
    
    const qrDataUrl = await QRCode.toDataURL(bookingUrl, {
      width: 500,
      margin: 2,
      color: {
        dark: '#8B5CF6',
        light: '#FFFFFF'
      }
    })
    
    setQrCodeUrl(qrDataUrl)
  }

  const copyLink = () => {
    const slug = salon.salon_name.toLowerCase().replace(/\s+/g, '-')
    const bookingUrl = `${window.location.origin}/book/${slug}`
    
    const textArea = document.createElement('textarea')
    textArea.value = bookingUrl
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      document.execCommand('copy')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      alert('Erreur lors de la copie')
    }
    
    document.body.removeChild(textArea)
  }

  const downloadQR = () => {
    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = `qr-${salon.salon_name.replace(/\s+/g, '-')}.png`
    link.click()
  }

  const shareWhatsApp = () => {
    const slug = salon.salon_name.toLowerCase().replace(/\s+/g, '-')
    const bookingUrl = `${window.location.origin}/book/${slug}`
    const text = `Réservez votre rendez-vous chez ${salon.salon_name} en ligne : ${bookingUrl}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
  }

  const shareFacebook = () => {
    const slug = salon.salon_name.toLowerCase().replace(/\s+/g, '-')
    const bookingUrl = `${window.location.origin}/book/${slug}`
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(bookingUrl)}`, '_blank')
  }

  const shareTwitter = () => {
    const slug = salon.salon_name.toLowerCase().replace(/\s+/g, '-')
    const bookingUrl = `${window.location.origin}/book/${slug}`
    const text = `Réservez votre RDV chez ${salon.salon_name} en ligne 💇✨`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(bookingUrl)}`, '_blank')
  }

  const openPreview = () => {
    const slug = salon.salon_name.toLowerCase().replace(/\s+/g, '-')
    const bookingUrl = `${window.location.origin}/book/${slug}`
    window.open(bookingUrl, '_blank')
  }

  if (!salon) return <div style={{ padding: '20px' }}>Chargement...</div>

  const slug = salon.salon_name.toLowerCase().replace(/\s+/g, '-')
  const bookingUrl = `${window.location.origin}/book/${slug}`

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '10px', color: '#333', fontSize: '28px' }}>
        📢 Diffuser votre lien de réservation
      </h2>
      <p style={{ marginBottom: '30px', color: '#666', fontSize: '14px' }}>
        Partagez facilement votre lien de réservation et boostez vos réservations en ligne
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        
        {/* Colonne gauche */}
        <div>
          {/* Lien de réservation */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ marginBottom: '15px', color: '#555', fontSize: '18px' }}>
              🔗 Votre lien de réservation
            </h3>
            <div style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <input
                type="text"
                value={bookingUrl}
                readOnly
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '5px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              />
              <button
                onClick={copyLink}
                style={{
                  padding: '12px 24px',
                  backgroundColor: copied ? '#10b981' : '#8B5CF6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'all 0.3s',
                  whiteSpace: 'nowrap'
                }}
              >
                {copied ? '✓ Copié !' : '📋 Copier'}
              </button>
            </div>
            
            {/* Bouton Aperçu */}
            <button
              onClick={openPreview}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#f0f0e0',
                color: '#333',
                border: '2px solid #e0e0e0',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              👁️ Voir l'aperçu du formulaire
            </button>
          </div>

          {/* Boutons de partage direct */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ marginBottom: '15px', color: '#555', fontSize: '18px' }}>
              🚀 Partage direct
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <button
                onClick={shareWhatsApp}
                style={{
                  padding: '12px',
                  backgroundColor: '#25D366',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                💬 WhatsApp
              </button>
              <button
                onClick={shareFacebook}
                style={{
                  padding: '12px',
                  backgroundColor: '#1877F2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                📘 Facebook
              </button>
              <button
                onClick={shareTwitter}
                style={{
                  padding: '12px',
                  backgroundColor: '#1DA1F2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                🐦 Twitter
              </button>
            </div>
            <p style={{ marginTop: '10px', fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
              Cliquez pour partager instantanément votre lien sur vos réseaux sociaux
            </p>
          </div>

          {/* Conseils marketing */}
          <div style={{
            backgroundColor: '#e0e7ff',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ marginBottom: '15px', color: '#4c1d95', fontSize: '18px' }}>
              💡 Conseils marketing personnalisés
            </h3>
            <ul style={{ lineHeight: '1.8', color: '#555', fontSize: '14px', paddingLeft: '20px' }}>
              <li><strong>Story Instagram :</strong> Postez votre QR Code avec "Swipe up pour réserver !"</li>
              <li><strong>Bio Instagram :</strong> Ajoutez le lien dans votre Linktree ou bio</li>
              <li><strong>Post Facebook :</strong> Partagez le lien avec une offre spéciale (-10% pour réservations en ligne)</li>
              <li><strong>WhatsApp Status :</strong> Diffusez le lien dans votre statut</li>
              <li><strong>Email signature :</strong> Ajoutez "Réservez en ligne" avec le lien</li>
              <li><strong>SMS clients :</strong> Envoyez le lien aux clients réguliers</li>
            </ul>
          </div>
        </div>

        {/* Colonne droite - QR Code */}
        <div>
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '20px',
            borderRadius: '10px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ marginBottom: '15px', color: '#555', fontSize: '18px' }}>
              📱 QR Code pour votre salon
            </h3>
            {qrCodeUrl && (
              <>
                <div style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '10px',
                  display: 'inline-block',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                  marginBottom: '20px'
                }}>
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    style={{ width: '300px', height: '300px' }}
                  />
                </div>
                <div>
                  <button
                    onClick={downloadQR}
                    style={{
                      width: '100%',
                      padding: '15px',
                      backgroundColor: '#EC4899',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      marginBottom: '15px'
                    }}
                  >
                    📥 Télécharger le QR Code (PNG)
                  </button>
                </div>
                <div style={{
                  backgroundColor: '#fff3cd',
                  padding: '15px',
                  borderRadius: '8px',
                  marginTop: '15px',
                  textAlign: 'left'
                }}>
                  <strong style={{ color: '#856404', display: 'block', marginBottom: '8px' }}>
                    📍 Où afficher votre QR Code ?
                  </strong>
                  <ul style={{ fontSize: '13px', color: '#856404', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
                    <li>Comptoir de votre salon</li>
                    <li>Vitrine extérieure</li>
                    <li>Cartes de visite</li>
                    <li>Flyers promotionnels</li>
                    <li>Affiche en salle d'attente</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Instructions complètes en bas */}
      <div style={{
        marginTop: '20px',
        backgroundColor: '#f0fdf4',
        padding: '20px',
        borderRadius: '10px',
        border: '2px solid #10b981'
      }}>
        <h3 style={{ marginBottom: '15px', color: '#065f46', fontSize: '18px' }}>
          🎯 Plan d'action pour augmenter vos réservations
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', fontSize: '14px' }}>
          <div>
            <strong style={{ color: '#065f46', display: 'block', marginBottom: '5px' }}>📱 Réseaux sociaux</strong>
            <p style={{ color: '#047857', margin: 0, lineHeight: '1.6' }}>
              Postez votre lien 3x/semaine sur Instagram et Facebook avec des visuels avant/après
            </p>
          </div>
          <div>
            <strong style={{ color: '#065f46', display: 'block', marginBottom: '5px' }}>📧 Email marketing</strong>
            <p style={{ color: '#047857', margin: 0, lineHeight: '1.6' }}>
              Envoyez le lien à vos clients existants avec une offre de bienvenue exclusive
            </p>
          </div>
          <div>
            <strong style={{ color: '#065f46', display: 'block', marginBottom: '5px' }}>🎁 Offre spéciale</strong>
            <p style={{ color: '#047857', margin: 0, lineHeight: '1.6' }}>
              "10% de réduction sur votre première réservation en ligne"
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShareTab