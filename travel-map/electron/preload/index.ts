import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('set-setting', key, value),
  getResourcePath: () => ipcRenderer.invoke('get-resource-path'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getCities: () => ipcRenderer.invoke('get-cities'),
  getAllTrips: () => ipcRenderer.invoke('get-all-trips'),
  scanResourceDirectory: () => ipcRenderer.invoke('scan-resource-directory'),
  syncData: () => ipcRenderer.invoke('sync-data'),
  createTripDirectory: (cityId: number, cityName: string, dirname: string, tripDate: string, description: string) => 
    ipcRenderer.invoke('create-trip-directory', cityId, cityName, dirname, tripDate, description),
  getTrips: (cityId: number) => ipcRenderer.invoke('get-trips', cityId),
  getTripsByName: (cityName: string) => ipcRenderer.invoke('get-trips-by-name', cityName),
  scanMediaByPath: (fullPath: string) => ipcRenderer.invoke('scan-media-by-path', fullPath),
  checkCityHasDirectory: (cityId: number) => ipcRenderer.invoke('check-city-has-directory', cityId),
  createTripByName: (cityName: string, dirname: string, tripDate: string, description: string, departureCity: string) => 
    ipcRenderer.invoke('create-trip-by-name', cityName, dirname, tripDate, description, departureCity),
  getMedia: (tripId: number) => ipcRenderer.invoke('get-media', tripId),
  scanTripDirectory: (tripId: number) => ipcRenderer.invoke('scan-trip-directory', tripId),
  openFile: (filePath: string) => ipcRenderer.invoke('open-file', filePath),
  openInExplorer: (filePath: string) => ipcRenderer.invoke('open-in-explorer', filePath),
  getThumbnail: (filePath: string, type: string) => ipcRenderer.invoke('get-thumbnail', filePath, type),
  onFileChanged: (callback: (data: any) => void) => {
    ipcRenderer.on('file-changed', (_, data) => callback(data))
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api
