export interface City {
  id: number
  code: string
  name: string
  province: string
  latitude: number
  longitude: number
  photo_count: number
  video_count: number
  has_directory: number
  created_at: string
  updated_at: string
}

export interface Trip {
  id?: number
  city_id?: number
  dirname: string
  trip_date?: string
  description?: string
  folder_name?: string
  full_path?: string
  fullPath?: string
  photo_count?: number
  video_count?: number
  total_size?: number
  created_at?: string
  updated_at?: string
}

export interface Media {
  id: number
  trip_id: number
  city_id: number
  filename: string
  filepath: string
  type: 'image' | 'video'
  format: string
  width: number
  height: number
  size: number
  duration: number
  thumbnail_path: string
  created_at: string
}

export interface Settings {
  resourcePath: string
  theme: 'light' | 'dark'
  thumbnailSize: number
  autoPlay: boolean
  autoPlayInterval: number
}

export interface ElectronAPI {
  getSettings: () => Promise<Record<string, string>>
  setSetting: (key: string, value: string) => Promise<boolean>
  getResourcePath: () => Promise<string>
  selectDirectory: () => Promise<string | null>
  getCities: () => Promise<City[]>
  getAllTrips: () => Promise<any[]>
  scanResourceDirectory: () => Promise<any[]>
  syncData: () => Promise<{ removedTrips: string[], addedTrips: string[], removedCities: string[], errors: string[] }>
  createTripDirectory: (cityId: number, cityName: string, dirname: string, tripDate: string, description: string) => Promise<{ folderName: string, tripPath: string }>
  getTrips: (cityId: number) => Promise<Trip[]>
  getTripsByName: (cityName: string) => Promise<{ trips: Trip[], hasDirectory: boolean }>
  scanMediaByPath: (fullPath: string) => Promise<any[]>
  checkCityHasDirectory: (cityId: number) => Promise<boolean>
  createTripByName: (cityName: string, dirname: string, tripDate: string, description: string, departureCity: string) => Promise<{ folderName: string, tripPath: string }>
  getMedia: (tripId: number) => Promise<Media[]>
  scanTripDirectory: (tripId: number) => Promise<Media[]>
  openFile: (filePath: string) => Promise<void>
  openInExplorer: (filePath: string) => Promise<void>
  getThumbnail: (filePath: string, type: string) => Promise<string | null>
  onFileChanged: (callback: (data: any) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
