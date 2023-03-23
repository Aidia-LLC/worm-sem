import appRootDir from "app-root-dir";
import { ChildProcessWithoutNullStreams, exec, spawn } from "child_process";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";
import { Message } from "../src/dto/semClient";
import { getPlatform } from "./platform";

const isProduction = app.isPackaged;

process.env.DIST = path.join(__dirname, "../dist");
process.env.PUBLIC = isProduction
  ? process.env.DIST
  : path.join(process.env.DIST, "../public");

const resourcePath = isProduction
  ? path.join(path.dirname(appRootDir.get()), "bin")
  : path.join(appRootDir.get(), "resources", getPlatform());

let browserWindow: BrowserWindow | null;
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

const createWindow = () => {
  browserWindow = new BrowserWindow({
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

app.on("window-all-closed", () => {
  // if (process.platform !== "darwin")
  app.quit();
});

const init = (childProcess: ChildProcessWithoutNullStreams) => {
  childProcess.on("spawn", () => {
    childProcess.stdout.on("data", (data: Buffer) => {
      const messages: Message[] = data
        .toString("utf8")
        .trim()
        .split("\n")
        .map((message) => {
          const trimmed = message.trim();
          if (trimmed.length > 0) return JSON.parse(trimmed);
          return undefined;
        })
        .filter(Boolean);
      messages.forEach((message) => {
        console.log("Received message from C#:", message);
        browserWindow?.webContents.send("SEMClient:Received", message);
      });
    });

    childProcess.stderr.on("data", (data: Buffer) => {
      console.error(data.toString("utf8"));
    });

    ipcMain.handle("SEMClient:Send", (_, message: Message) =>
      childProcess.stdin.write(JSON.stringify(message) + "\n")
    );

    ipcMain.handle("GetInitialPath", () => __dirname);

    createWindow();
  });

  app.on("before-quit", () => {
    childProcess.kill();
  });

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
};

app.whenReady().then(() => {
  if (isProduction) {
    const childProcess = spawn(path.join(resourcePath, "csharp"));
    init(childProcess);
  } else {
    console.log("Building C# program...");
    const cwd = path.join(__dirname, "..", "..", "csharp");
    exec("dotnet publish worm-sem.csproj --configuration Release", { cwd }).on(
      "exit",
      () => {
        console.log("Done building C# program.");
        const childProcess = spawn(
          "./bin/Release/net7.0/wormsem",
          ["--dry-run"], // TODO remove dry run flag when ready to connect to SEM
          { cwd }
        );
        init(childProcess);
      }
    );
  }
});
