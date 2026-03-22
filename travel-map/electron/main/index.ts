import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, readFileSync } from 'fs'
import log from 'electron-log'
import initSqlJs, { Database } from 'sql.js'
import { watch } from 'chokidar'

log.transports.file.level = 'info'
log.transports.console.level = 'debug'

process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

let mainWindow: BrowserWindow | null = null
let db: Database | null = null
let resourcePath: string = ''
let watcher: any = null
let SQL: any = null

const DEFAULT_RESOURCE_PATH = 'D:\\travel-map-resource'

function getDbPath(): string {
  return join(app.getPath('userData'), 'travel-map.db')
}

async function initDatabase() {
  const dbPath = getDbPath()
  log.info('Initializing database at:', dbPath)
  
  SQL = await initSqlJs()
  
  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }
  
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    
    CREATE TABLE IF NOT EXISTS cities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      province TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      photo_count INTEGER DEFAULT 0,
      video_count INTEGER DEFAULT 0,
      has_directory INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city_id INTEGER NOT NULL,
      dirname TEXT NOT NULL,
      trip_date DATE,
      description TEXT,
      departure_city TEXT,
      folder_name TEXT NOT NULL,
      full_path TEXT NOT NULL,
      photo_count INTEGER DEFAULT 0,
      video_count INTEGER DEFAULT 0,
      total_size INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (city_id) REFERENCES cities(id)
    );
    
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER,
      city_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      type TEXT NOT NULL,
      format TEXT,
      width INTEGER,
      height INTEGER,
      size INTEGER,
      duration REAL,
      thumbnail_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id),
      FOREIGN KEY (city_id) REFERENCES cities(id)
    );
    
    CREATE TABLE IF NOT EXISTS bgm (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      title TEXT,
      artist TEXT,
      duration REAL,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  
  // Migration: Add departure_city column if it doesn't exist
  try {
    db.run('ALTER TABLE trips ADD COLUMN departure_city TEXT')
  } catch (e) {
    // Column already exists, ignore
  }
  
  const result = db.exec("SELECT value FROM settings WHERE key = 'resourcePath'")
  if (result.length > 0 && result[0].values.length > 0) {
    resourcePath = result[0].values[0][0] as string || DEFAULT_RESOURCE_PATH
  } else {
    resourcePath = DEFAULT_RESOURCE_PATH
  }
  
  saveDatabase()
  log.info('Database initialized, resource path:', resourcePath)
}

function saveDatabase() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  writeFileSync(getDbPath(), buffer)
}

function initResourceDirectory() {
  if (!existsSync(resourcePath)) {
    mkdirSync(resourcePath, { recursive: true })
    log.info('Created default resource directory:', resourcePath)
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    },
    show: false,
    title: 'Travel-Map'
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(process.env.DIST, 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function queryAll(sql: string, params: any[] = []): any[] {
  if (!db) return []
  const stmt = db.prepare(sql)
  if (params.length > 0) {
    stmt.bind(params)
  }
  const results: any[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push(row)
  }
  stmt.free()
  return results
}

function queryOne(sql: string, params: any[] = []): any {
  const results = queryAll(sql, params)
  return results.length > 0 ? results[0] : null
}

function runSql(sql: string, params: any[] = []) {
  if (!db) return
  db.run(sql, params)
  saveDatabase()
}

function setupIpcHandlers() {
  ipcMain.handle('get-settings', () => {
    const rows = queryAll('SELECT key, value FROM settings')
    const settings: Record<string, string> = {}
    rows.forEach(row => {
      settings[row.key] = row.value
    })
    settings.resourcePath = resourcePath
    return settings
  })

  ipcMain.handle('set-setting', (_, key: string, value: string) => {
    if (key === 'resourcePath') {
      resourcePath = value
      if (!existsSync(value)) {
        mkdirSync(value, { recursive: true })
      }
      initWatcher()
    }
    runSql('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value])
    return true
  })

  ipcMain.handle('get-resource-path', () => resourcePath)

  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  ipcMain.handle('get-cities', () => {
    return queryAll('SELECT * FROM cities ORDER BY name')
  })

  ipcMain.handle('get-all-trips', () => {
    return queryAll(`
      SELECT t.*, c.name as city_name 
      FROM trips t 
      LEFT JOIN cities c ON t.city_id = c.id 
      ORDER BY t.trip_date DESC
    `)
  })

  ipcMain.handle('scan-resource-directory', async () => {
    return scanDirectory(resourcePath)
  })

  ipcMain.handle('sync-data', async () => {
    const syncResult = {
      removedTrips: [] as string[],
      addedTrips: [] as string[],
      removedCities: [] as string[],
      errors: [] as string[]
    }
    
    try {
      // 1. Get all trips from database
      const dbTrips = queryAll('SELECT id, city_id, folder_name, full_path FROM trips')
      
      // 2. Check each trip - if directory doesn't exist, remove from DB
      for (const trip of dbTrips) {
        if (!existsSync(trip.full_path)) {
          runSql('DELETE FROM media WHERE trip_id = ?', [trip.id])
          runSql('DELETE FROM trips WHERE id = ?', [trip.id])
          syncResult.removedTrips.push(trip.folder_name)
          log.info('Removed trip from DB (directory not found):', trip.folder_name)
        }
      }
      
      // 3. Scan file system for actual directories
      const fileSystemData = scanDirectory(resourcePath)
      
      // 3.1 Also scan all city directories (even with no trips)
      const allCityDirs = getAllCityDirectories(resourcePath)
      
      // 4. For each city in file system, check if it exists in DB
      for (const cityName of allCityDirs) {
        let city = queryOne('SELECT * FROM cities WHERE name = ?', [cityName])
        if (!city) {
          // Create city in DB
          const code = cityName.substring(0, 6).charCodeAt(0).toString().padStart(6, '0') + Math.floor(Math.random() * 10000)
          runSql('INSERT INTO cities (name, province, code, has_directory) VALUES (?, ?, ?, 1)', 
            [cityName, getProvinceByCity(cityName), code])
          city = queryOne('SELECT * FROM cities WHERE name = ?', [cityName])
          syncResult.addedTrips.push('城市: ' + cityName)
          log.info('Added city to DB:', cityName)
        }
      }
      
      // 5. For each trip in file system, check if it exists in DB
      for (const cityData of fileSystemData) {
        let city = queryOne('SELECT * FROM cities WHERE name = ?', [cityData.name])
        if (!city) {
          // Create city in DB
          const code = cityData.name.substring(0, 6).charCodeAt(0).toString().padStart(6, '0') + Math.floor(Math.random() * 10000)
          runSql('INSERT INTO cities (name, province, code, has_directory) VALUES (?, ?, ?, 1)', 
            [cityData.name, getProvinceByCity(cityData.name), code])
          city = queryOne('SELECT * FROM cities WHERE name = ?', [cityData.name])
        }
        
        // 5. For each trip in file system, check if it exists in DB
        for (const tripData of cityData.trips) {
          const existingTrip = queryOne('SELECT id FROM trips WHERE folder_name = ?', [tripData.folderName])
          if (!existingTrip && city) {
            // Add trip to DB
            runSql(`
              INSERT INTO trips (city_id, dirname, trip_date, description, folder_name, full_path, photo_count, video_count, total_size)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [city.id, tripData.dirname, tripData.tripDate || '', tripData.description || '', 
                tripData.folderName, tripData.fullPath, tripData.photoCount || 0, tripData.videoCount || 0, tripData.totalSize || 0])
            syncResult.addedTrips.push(tripData.folderName)
            log.info('Added trip to DB:', tripData.folderName)
          }
        }
      }
      
      // 6. Clean up cities with no trips
      const dbCities = queryAll('SELECT id, name FROM cities')
      for (const city of dbCities) {
        const cityPath = join(resourcePath, city.name)
        if (!existsSync(cityPath)) {
          runSql('DELETE FROM trips WHERE city_id = ?', [city.id])
          runSql('DELETE FROM media WHERE city_id = ?', [city.id])
          runSql('DELETE FROM cities WHERE id = ?', [city.id])
          syncResult.removedCities.push(city.name)
          log.info('Removed city from DB (directory not found):', city.name)
        } else {
          const trips = queryAll('SELECT id FROM trips WHERE city_id = ?', [city.id])
          if (trips.length === 0) {
            runSql('UPDATE cities SET has_directory = 0 WHERE id = ?', [city.id])
          }
        }
      }
      
      log.info('Sync completed:', syncResult)
      return syncResult
    } catch (e: any) {
      log.error('Sync error:', e)
      syncResult.errors.push(e.message || String(e))
      return syncResult
    }
  })

  ipcMain.handle('create-trip-directory', async (_, cityId: number, cityName: string, dirname: string, tripDate: string, description: string) => {
    const folderName = description 
      ? `${dirname}_${tripDate}_${description}`
      : `${dirname}_${tripDate}`
    
    const cityPath = join(resourcePath, cityName)
    const tripPath = join(cityPath, folderName)
    
    if (!existsSync(cityPath)) {
      mkdirSync(cityPath, { recursive: true })
    }
    
    if (!existsSync(tripPath)) {
      mkdirSync(tripPath, { recursive: true })
    }
    
    runSql(`
      INSERT INTO trips (city_id, dirname, trip_date, description, folder_name, full_path)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [cityId, dirname, tripDate, description, folderName, tripPath])
    
    runSql('UPDATE cities SET has_directory = 1 WHERE id = ?', [cityId])
    
    return { folderName, tripPath }
  })

  ipcMain.handle('get-trips', (_, cityId: number) => {
    return queryAll('SELECT * FROM trips WHERE city_id = ? ORDER BY trip_date DESC', [cityId])
  })

  ipcMain.handle('get-trips-by-name', async (_, cityName: string) => {
    // 尝试带"市"后缀和不带"市"后缀
    let cityPath = join(resourcePath, cityName)
    let hasDirectory = existsSync(cityPath)
    
    // 如果目录不存在，尝试去掉"市"后缀
    if (!hasDirectory && cityName.endsWith('市')) {
      cityPath = join(resourcePath, cityName.slice(0, -1))
      hasDirectory = existsSync(cityPath)
    }
    
    // 如果还不存在，尝试加上"市"后缀
    if (!hasDirectory && !cityName.endsWith('市')) {
      cityPath = join(resourcePath, cityName + '市')
      hasDirectory = existsSync(cityPath)
    }
    
    if (!hasDirectory) {
      return { trips: [], hasDirectory: false }
    }
    
    // Scan the city directory to get trips from file system
    const trips = scanTrips(cityPath)
    return { trips, hasDirectory: true }
  })

  ipcMain.handle('scan-media-by-path', async (_, fullPath: string) => {
    // Directly scan a directory for media files
    log.info('Directly scanning path:', fullPath)
    log.info('Resource path:', resourcePath)
    
    if (!fullPath) {
      log.error('Empty path provided')
      return []
    }
    
    if (!existsSync(fullPath)) {
      log.error('Path does not exist:', fullPath)
      return []
    }
    
    log.info('Path exists, scanning...')
    const files = scanMediaFiles(fullPath)
    log.info('Found files:', files.length)
    if (files.length > 0) {
      log.info('First file:', files[0])
    }
    return files
  })

  ipcMain.handle('check-city-has-directory', async (_, cityId: number) => {
    const city = queryOne('SELECT * FROM cities WHERE id = ?', [cityId])
    if (!city) return false
    
    const cityPath = join(resourcePath, city.name)
    return existsSync(cityPath)
  })

  ipcMain.handle('create-trip-by-name', async (_, cityName: string, dirname: string, tripDate: string, description: string, departureCity: string) => {
    // 目录名只包含 备注_日期，不包含描述
    const folderName = `${dirname}_${tripDate}`
    
    const cityPath = join(resourcePath, cityName)
    const tripPath = join(cityPath, folderName)
    
    if (!existsSync(cityPath)) {
      mkdirSync(cityPath, { recursive: true })
    }
    
    if (!existsSync(tripPath)) {
      mkdirSync(tripPath, { recursive: true })
    }
    
    // Get or create city in database
    let city = queryOne('SELECT * FROM cities WHERE name = ?', [cityName])
    if (!city) {
      // Generate a simple code based on city name (first 6 chars + random)
      const code = cityName.substring(0, 6).charCodeAt(0).toString().padStart(6, '0') + Math.floor(Math.random() * 10000)
      runSql('INSERT INTO cities (name, province, code) VALUES (?, ?, ?)', [cityName, getProvinceByCity(cityName), code])
      city = queryOne('SELECT * FROM cities WHERE name = ?', [cityName])
    }
    
    if (city) {
      runSql(`
        INSERT INTO trips (city_id, dirname, trip_date, description, departure_city, folder_name, full_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [city.id, dirname, tripDate, description, departureCity || '', folderName, tripPath])
    }
    
    return { folderName, tripPath }
  })

  ipcMain.handle('get-media', (_, tripId: number) => {
    return queryAll('SELECT * FROM media WHERE trip_id = ? ORDER BY filename', [tripId])
  })

  ipcMain.handle('scan-trip-directory', async (_, tripId: number) => {
    const trip = queryOne('SELECT * FROM trips WHERE id = ?', [tripId])
    if (!trip) {
      log.info('Trip not found with id:', tripId)
      return []
    }
    
    log.info('Scanning trip directory:', trip.full_path)
    const files = scanMediaFiles(trip.full_path)
    log.info('Found files:', files.length)
    
    runSql('DELETE FROM media WHERE trip_id = ?', [tripId])
    
    let photoCount = 0
    let videoCount = 0
    
    files.forEach((file: any) => {
      runSql(`
        INSERT INTO media (trip_id, city_id, filename, filepath, type, format, size)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [tripId, trip.city_id, file.name, file.path, file.type, file.format, file.size])
      
      if (file.type === 'image') photoCount++
      else videoCount++
    })
    
    runSql('UPDATE trips SET photo_count = ?, video_count = ?, total_size = ? WHERE id = ?',
      [photoCount, videoCount, files.reduce((sum: number, f: any) => sum + f.size, 0), tripId])
    
    return files
  })

  ipcMain.handle('open-file', (_, filePath: string) => {
    log.info('Opening file:', filePath)
    shell.openPath(filePath)
  })

  ipcMain.handle('open-in-explorer', (_, filePath: string) => {
    log.info('Opening in explorer:', filePath)
    if (existsSync(filePath)) {
      shell.showItemInFolder(filePath)
    } else {
      // If the specific path doesn't exist, try opening the parent directory
      const parentPath = join(filePath, '..')
      shell.openPath(parentPath)
    }
  })

  ipcMain.handle('get-thumbnail', async (_, filePath: string, type: string) => {
    return null
  })
}

function getAllCityDirectories(basePath: string): string[] {
  const cities: string[] = []
  if (!existsSync(basePath)) {
    return cities
  }
  
  try {
    const entries = readdirSync(basePath)
    for (const entry of entries) {
      const entryPath = join(basePath, entry)
      const stat = statSync(entryPath)
      if (stat.isDirectory()) {
        cities.push(entry)
      }
    }
  } catch (e) {
    log.error('Error getting city directories:', e)
  }
  
  return cities
}

function scanDirectory(basePath: string): any[] {
  if (!existsSync(basePath)) {
    return []
  }
  
  const cities: any[] = []
  const entries = readdirSync(basePath)
  
  for (const entry of entries) {
    const entryPath = join(basePath, entry)
    const stat = statSync(entryPath)
    
    if (stat.isDirectory()) {
      const trips = scanTrips(entryPath)
      const photoCount = trips.reduce((sum, t) => sum + t.photoCount, 0)
      const videoCount = trips.reduce((sum, t) => sum + t.videoCount, 0)
      
      cities.push({
        name: entry,
        hasDirectory: true,
        trips,
        photoCount,
        videoCount
      })
    }
  }
  
  return cities
}

function getProvinceByCity(cityName: string): string {
  const provinceMap: Record<string, string> = {
    '北京': '北京市', '上海': '上海市', '天津': '天津市', '重庆': '重庆市',
    '广州': '广东省', '深圳': '广东省', '珠海': '广东省', '佛山': '广东省',
    '东莞': '广东省', '中山': '广东省', '江门': '广东省', '肇庆': '广东省',
    '惠州': '广东省', '汕头': '广东省', '潮州': '广东省', '揭阳': '广东省',
    '汕尾': '广东省', '韶关': '广东省', '清远': '广东省', '梅州': '广东省',
    '河源': '广东省', '阳江': '广东省', '茂名': '广东省', '湛江': '广东省',
    '海口': '海南省', '三亚': '海南省', '南宁': '广西壮族自治区', '柳州': '广西壮族自治区',
    '桂林': '广西壮族自治区', '北海': '广西壮族自治区', '长沙': '湖南省', '株洲': '湖南省',
    '湘潭': '湖南省', '衡阳': '湖南省', '岳阳': '湖南省', '武汉': '湖北省',
    '宜昌': '湖北省', '襄阳': '湖北省', '荆州': '湖北省', '南昌': '江西省',
    '九江': '江西省', '赣州': '江西省', '上饶': '江西省', '抚州': '江西省',
    '杭州': '浙江省', '宁波': '浙江省', '温州': '浙江省', '嘉兴': '浙江省',
    '湖州': '浙江省', '绍兴': '浙江省', '金华': '浙江省', '衢州': '浙江省',
    '舟山': '浙江省', '台州': '浙江省', '丽水': '浙江省', '南京': '江苏省',
    '苏州': '江苏省', '无锡': '江苏省', '常州': '江苏省', '镇江': '江苏省',
    '扬州': '江苏省', '泰州': '江苏省', '南通': '江苏省', '盐城': '江苏省',
    '淮安': '江苏省', '连云港': '江苏省', '徐州': '江苏省', '宿迁': '江苏省',
    '福州': '福建省', '厦门': '福建省', '泉州': '福建省', '漳州': '福建省',
    '莆田': '福建省', '宁德': '福建省', '三明': '福建省', '南平': '福建省',
    '龙岩': '福建省', '济南': '山东省', '青岛': '山东省', '烟台': '山东省',
    '威海': '山东省', '潍坊': '山东省', '淄博': '山东省', '临沂': '山东省',
    '济宁': '山东省', '泰安': '山东省', '德州': '山东省', '聊城': '山东省',
    '滨州': '山东省', '菏泽': '山东省', '沈阳': '辽宁省', '大连': '辽宁省',
    '鞍山': '辽宁省', '抚顺': '辽宁省', '本溪': '辽宁省', '丹东': '辽宁省',
    '锦州': '辽宁省', '营口': '辽宁省', '长春': '吉林省', '吉林': '吉林省',
    '哈尔滨': '黑龙江省', '齐齐哈尔': '黑龙江省', '牡丹江': '黑龙江省', '佳木斯': '黑龙江省',
    '大庆': '黑龙江省', '郑州': '河南省', '洛阳': '河南省', '开封': '河南省',
    '南阳': '河南省', '新乡': '河南省', '安阳': '河南省', '焦作': '河南省',
    '许昌': '河南省', '太原': '山西省', '大同': '山西省', '石家庄': '河北省',
    '保定': '河北省', '唐山': '河北省', '廊坊': '河北省', '邯郸': '河北省',
    '秦皇岛': '河北省', '沧州': '河北省', '成都': '四川省', '贵阳': '贵州省',
    '昆明': '云南省', '拉萨': '西藏自治区', '兰州': '甘肃省', '西宁': '青海省',
    '银川': '宁夏回族自治区', '乌鲁木齐': '新疆维吾尔自治区', '呼和浩特': '内蒙古自治区',
    '西安': '陕西省'
  }
  return provinceMap[cityName] || '未知省份'
}

function scanTrips(cityPath: string): any[] {
  const trips: any[] = []
  
  try {
    const entries = readdirSync(cityPath)
    
    for (const entry of entries) {
      const tripPath = join(cityPath, entry)
      const stat = statSync(tripPath)
      
      if (stat.isDirectory()) {
        const files = scanMediaFiles(tripPath)
        const photoCount = files.filter(f => f.type === 'image').length
        const videoCount = files.filter(f => f.type === 'video').length
        
        const parts = entry.split('_')
        const dirname = parts[0] || entry
        const tripDate = parts[1] || ''
        const description = parts.slice(2).join('_') || ''
        
        trips.push({
          dirname,
          tripDate,
          description,
          folderName: entry,
          fullPath: tripPath,
          photoCount,
          videoCount,
          totalSize: files.reduce((sum, f) => sum + f.size, 0)
        })
      }
    }
  } catch (e) {
    log.error('Error scanning trips:', e)
  }
  
  return trips
}

function scanMediaFiles(dirPath: string): any[] {
  const files: any[] = []
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
  const videoExts = ['.mp4', '.avi', '.mov', '.mkv', '.webm']
  
  log.info('scanMediaFiles called with path:', dirPath)
  
  try {
    const entries = readdirSync(dirPath)
    log.info('Entries in directory:', entries.length)
    
    for (const entry of entries) {
      const filePath = join(dirPath, entry)
      const stat = statSync(filePath)
      
      if (stat.isFile()) {
        const ext = entry.toLowerCase().substring(entry.lastIndexOf('.'))
        log.info('File:', entry, 'ext:', ext)
        
        if (imageExts.includes(ext)) {
          files.push({
            name: entry,
            path: filePath,
            type: 'image',
            format: ext.substring(1),
            size: stat.size
          })
        } else if (videoExts.includes(ext)) {
          files.push({
            name: entry,
            path: filePath,
            type: 'video',
            format: ext.substring(1),
            size: stat.size
          })
        }
      }
    }
  } catch (e) {
    log.error('Error scanning media files:', e)
  }
  
  return files
}

function initWatcher() {
  if (watcher) {
    watcher.close()
  }
  
  if (!resourcePath || !existsSync(resourcePath)) {
    return
  }
  
  watcher = watch(resourcePath, {
    ignoreInitial: true,
    depth: 2
  })
  
  watcher.on('add', (path: string) => {
    log.info('File added:', path)
    mainWindow?.webContents.send('file-changed', { type: 'add', path })
  })
  
  watcher.on('unlink', (path: string) => {
    log.info('File removed:', path)
    mainWindow?.webContents.send('file-changed', { type: 'remove', path })
  })
}

app.whenReady().then(async () => {
  log.info('App starting...')
  await initDatabase()
  initResourceDirectory()
  setupIpcHandlers()
  createWindow()
  initWatcher()
})

app.on('window-all-closed', () => {
  if (watcher) {
    watcher.close()
  }
  if (db) {
    saveDatabase()
    db.close()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
