const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const net = require('net')

let mainWindow = null
let serverProcess = null
const PORT = process.env.PORT || 3001

function waitForPort(port, host = '127.0.0.1', timeoutMs = 20000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    ;(function tryConnect() {
      const socket = net.createConnection({ port, host }, () => {
        socket.end()
        resolve()
      })
      socket.on('error', () => {
        socket.destroy()
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Server did not start on ${host}:${port} within ${timeoutMs}ms`))
        } else {
          setTimeout(tryConnect, 300)
        }
      })
    })()
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  const url = `http://localhost:${PORT}`
  mainWindow.loadURL(url)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function startServer() {
  if (!app.isPackaged) {
    return Promise.resolve() // dev 模式由脚本启动 next dev
  }

  const serverScript = path.resolve(process.resourcesPath, 'app', '.next', 'standalone', 'server.js')
  const cwd = path.resolve(process.resourcesPath, 'app')

  const userDataDbPath = path.join(app.getPath('userData'), 'dev.db')

  serverProcess = spawn(process.execPath, [serverScript], {
    cwd,
    env: { ...process.env, PORT: String(PORT), DATABASE_URL: `file:${userDataDbPath}` },
    stdio: 'inherit',
  })

  serverProcess.on('exit', (code) => {
    serverProcess = null
    if (code !== 0 && mainWindow) {
      mainWindow.webContents.executeJavaScript(
        `document.body.innerHTML = '<h2>Server exited with code ${code}</h2>'`
      ).catch(() => {})
    }
  })

  return waitForPort(PORT)
}

app.on('ready', async () => {
  try {
    await startServer()
    createWindow()
  } catch (err) {
    console.error('Failed to start server:', err)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})

