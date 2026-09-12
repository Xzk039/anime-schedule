// 追番时间表 - Electron 桌面版入口
"use strict";
const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

// 用于本地 file:// 打开时,网页里的 fetch 访问 https 数据接口不被 CORS 拦截
const isDev = process.env.ELECTRON_START_URL || !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: "国漫 · 日漫 时间表",
    backgroundColor: "#131519",
    icon: path.join(__dirname, "icons", "icon-512.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // 允许本地页面跨域请求数据(AniList/bilibili),桌面应用场景安全风险低
      webSecurity: false
    }
  });

  win.loadFile(path.join(__dirname, "index.html"));

  // 外链用系统浏览器打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null); // 去掉默认菜单,更像软件
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
