import { app, BrowserWindow, shell, ipcMain } from "electron";
import { spawn, exec, ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import { Message } from "../src/types/semClient";
import appRootDir from "app-root-dir";
import { getPlatform } from "./platform";

process.env.DIST = path.join(__dirname, "../dist");
process.env.PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, "../public");

const resourcePath = app.isPackaged
  ? path.join(path.dirname(appRootDir.get()), "bin")
  : path.join(appRootDir.get(), "resources", getPlatform());

let win: BrowserWindow | null;
const url = process.env.VITE_DEV_SERVER_URL;

const createWindow = () => {
  win = new BrowserWindow({
    icon: path.join(process.env.PUBLIC, "logo.svg"),
    title: "SEM Client",
    webPreferences: {
      preload: path.join(__dirname, "./preload.js"),
    },
  });

  // Open links in the browser, not inside the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });

  if (url) {
    win.loadURL(url);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
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
        .split("\n")
        .map((message) => {
          const trimmed = message.trim();
          if (trimmed.length > 0) return JSON.parse(trimmed);
          return undefined;
        })
        .filter(Boolean);
      messages.forEach((message) =>
        win?.webContents.send("SEMClient:Received", message)
      );
    });

    ipcMain.handle("SEMClient:Send", (_, message: Message) =>
      childProcess.stdin.write(JSON.stringify(message) + "\n")
    );

    ipcMain.on("counter-value", (_event, value) => {
      console.log(`got counter value: ${value}`);
    });

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
  if (app.isPackaged) {
    const childProcess = spawn(path.join(resourcePath, "csharp"));
    init(childProcess);
  } else {
    const cwd = path.join(__dirname, "..", "..", "csharp");
    exec("dotnet publish worm-sem.csproj --configuration Release", { cwd }).on(
      "exit",
      () => {
        console.log("Done building C# program.");
        const childProcess = spawn("./bin/Release/net7.0/wormsem", { cwd });
        init(childProcess);
      }
    );
  }
});
