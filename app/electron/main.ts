process.env.DIST = join(__dirname, "../dist");
process.env.PUBLIC = app.isPackaged
  ? process.env.DIST
  : join(process.env.DIST, "../public");

import { join } from "path";
import { app, BrowserWindow, shell, ipcMain } from "electron";
import { spawn, exec } from "child_process";
import path from "path";
import { Message } from "../src/types/semClient";

let win: BrowserWindow | null;
const url = process.env.VITE_DEV_SERVER_URL;

const createWindow = () => {
  win = new BrowserWindow({
    icon: path.join(process.env.PUBLIC, "logo.svg"),
    title: "Test",
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
    win.loadFile(join(process.env.DIST, "index.html"));
  }
};

app.on("window-all-closed", () => {
  // if (process.platform !== "darwin")
  app.quit();
});

app.whenReady().then(() => {
  // TODO in production, we should package the prebuilt binary with the app
  console.log("Building C# program...");
  const cwd = path.join(__dirname, "..", "..", "csharp");
  exec("dotnet publish worm-sem.csproj --configuration Release", { cwd }).on(
    "exit",
    () => {
      console.log("Done building C# program.");
      const childProcess = spawn("./bin/Release/net7.0/csharp", { cwd });

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
    }
  );
});
