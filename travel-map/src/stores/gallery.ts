import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Trip, Media, City } from '@/types'

export const useGalleryStore = defineStore('gallery', () => {
  const currentCity = ref<City | null>(null)
  const trips = ref<Trip[]>([])
  const currentTrip = ref<Trip | null>(null)
  const media = ref<Media[]>([])
  const loading = ref(false)
  const hasDirectory = ref(false)

  async function loadTrips(cityId: number) {
    loading.value = true
    try {
      trips.value = await window.electronAPI.getTrips(cityId)
      hasDirectory.value = trips.value.length > 0 || await window.electronAPI.checkCityHasDirectory(cityId)
      // 获取城市信息
      const cities = await window.electronAPI.getCities()
      const city = cities.find((c: any) => c.id === cityId)
      if (city) {
        currentCity.value = city
      }
    } catch (e) {
      console.error('Failed to load trips:', e)
      trips.value = []
      hasDirectory.value = false
    } finally {
      loading.value = false
    }
  }

  async function loadTripsByName(cityName: string) {
    loading.value = true
    try {
      const result = await window.electronAPI.getTripsByName(cityName)
      trips.value = result.trips || []
      hasDirectory.value = result.hasDirectory || trips.value.length > 0
      // 设置当前城市名称
      currentCity.value = { id: 0, name: cityName, code: '', province: '' } as any
    } catch (e) {
      console.error('Failed to load trips by name:', e)
      trips.value = []
      hasDirectory.value = false
    } finally {
      loading.value = false
    }
  }

  async function loadMedia(tripId: number) {
    loading.value = true
    try {
      media.value = await window.electronAPI.scanTripDirectory(tripId)
    } catch (e) {
      console.error('Failed to load media:', e)
    } finally {
      loading.value = false
    }
  }

  async function createTrip(cityName: string, dirname: string, tripDate: string, description: string, departureCity: string = '') {
    try {
      console.log('Creating trip:', { cityName, dirname, tripDate, description, departureCity })
      const result = await window.electronAPI.createTripByName(cityName, dirname, tripDate, description, departureCity)
      console.log('Trip created:', result)
      // Reload trips after creation
      await loadTripsByName(cityName)
      return result
    } catch (e) {
      console.error('Failed to create trip:', e)
      alert('创建失败，请重试。错误: ' + String(e))
      throw e
    }
  }

  function setCurrentCity(city: City | null) {
    currentCity.value = city
  }

  function setCurrentTrip(trip: Trip | null) {
    currentTrip.value = trip
  }

  return {
    currentCity,
    trips,
    currentTrip,
    media,
    loading,
    hasDirectory,
    loadTrips,
    loadTripsByName,
    loadMedia,
    createTrip,
    setCurrentCity,
    setCurrentTrip
  }
})
