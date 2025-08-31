const { app, BrowserWindow } = require('electron');

function createWindow() {
  console.log('Creating window...');
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false
  });

  win.once('ready-to-show', () => {
    console.log('Window ready to show');
    win.show();
  });

  win.loadURL('data:text/html,<h1>Hello Electron!</h1>');
  
  setTimeout(() => {
    console.log('Forcing window to show');
    win.show();
  }, 2000);
}

app.whenReady().then(() => {
  console.log('App ready');
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
