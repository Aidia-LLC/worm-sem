import { BrowserWindow, shell } from "electron";
import path from "path";

const devServerUrl = process.env.VITE_DEV_SERVER_URL;

export const createWindow = () => {
  const browserWindow = new BrowserWindow({
    icon: path.join(process.env.PUBLIC, "logo.svg"),
    title: "SEM Client",
    webPreferences: {
      preload: path.join(__dirname, "./preload.js"),
    },
  });

  // Open links in the browser, not inside the application
  browserWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });

  if (devServerUrl) {
    browserWindow.loadURL(devServerUrl);
    browserWindow.webContents.openDevTools();
  } else {
    browserWindow.loadFile(path.join(process.env.DIST, "index.html"));
  }
  return browserWindow;
};
