import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { City } from '@/types'

export const useMapStore = defineStore('map', () => {
  const cities = ref<City[]>([])
  const selectedCity = ref<City | null>(null)
  const cityData = ref<any[]>([])
  const loading = ref(false)

  async function loadCities() {
    loading.value = true
    try {
      cities.value = await window.electronAPI.getCities()
    } catch (e) {
      console.error('Failed to load cities:', e)
    } finally {
      loading.value = false
    }
  }

  async function scanDirectory() {
    loading.value = true
    try {
      cityData.value = await window.electronAPI.scanResourceDirectory()
    } catch (e) {
      console.error('Failed to scan directory:', e)
    } finally {
      loading.value = false
    }
  }

  function selectCity(city: City | null) {
    selectedCity.value = city
  }

  function getCityByName(name: string): any {
    return cityData.value.find(c => c.name === name)
  }

  return {
    cities,
    selectedCity,
    cityData,
    loading,
    loadCities,
    scanDirectory,
    selectCity,
    getCityByName
  }
})
