import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function ServicesManager() {
  const { user } = useAuth()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    duration: '',
    price: ''
  })

  useEffect(() => {
    if (user) {
      fetchServices()
    }
  }, [user])

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setServices(data || [])
    } catch (error) {
      console.error('Erreur fetch services:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingService) {
        // Update
        const { error } = await supabase
          .from('services')
          .update({
            name: formData.name,
            duration: parseInt(formData.duration),
            price: parseFloat(formData.price)
          })
          .eq('id', editingService.id)

        if (error) throw error
      } else {
        // Create
        const { error } = await supabase
          .from('services')
          .insert({
            user_id: user.id,
            name: formData.name,
            duration: parseInt(formData.duration),
            price: parseFloat(formData.price)
          })

        if (error) throw error
      }

      // Reset form
      setFormData({ name: '', duration: '', price: '' })
      setShowForm(false)
      setEditingService(null)
      fetchServices()
    } catch (error) {
      console.error('Erreur save service:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      duration: service.duration.toString(),
      price: service.price.toString()
    })
    setShowForm(true)
  }

  const handleDelete = async (serviceId) => {
    if (!confirm('Supprimer ce service ?')) return

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId)

      if (error) throw error
      fetchServices()
    } catch (error) {
      console.error('Erreur delete service:', error)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', duration: '', price: '' })
    setShowForm(false)
    setEditingService(null)
  }

  if (loading) {
    return <div className="text-center">Chargement...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-900">Mes Services</h3>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          Ajouter un service
        </button>
      </div>

      {/* Liste des services */}
      {services.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Aucun service configuré</p>
          <p className="text-sm">Ajoutez vos premiers services (coupe, coloration, etc.)</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">{service.name}</h4>
                <p className="text-sm text-gray-600">
                  {service.duration} min • {service.price}€
                </p>
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => handleEdit(service)}
                  className="btn-secondary text-sm"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h4 className="text-lg font-bold mb-4">
              {editingService ? 'Modifier le service' : 'Nouveau service'}
            </h4>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Nom du service
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="ex: Coupe femme, Coloration, Brushing..."
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Durée (minutes)
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  placeholder="ex: 30, 60, 120..."
                  min="15"
                  max="300"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Prix (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  placeholder="ex: 25.00, 80.50..."
                  min="0"
                  required
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? 'Sauvegarde...' : (editingService ? 'Modifier' : 'Ajouter')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary flex-1"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
