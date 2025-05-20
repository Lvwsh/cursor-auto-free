console.log('main.js __dirname:', __dirname);
console.log('main.js cwd:', process.cwd());
console.log('main.js filename:', __filename);
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const envUtils = require('./src/utils/envUtils');

const ENV_PATH = path.join(__dirname, '.env');
const LOG_DIR = path.resolve(process.cwd(), 'logs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  win.setMenuBarVisibility(false);
  
  // 根据环境加载前端页面
  if (process.env.NODE_ENV === 'development') {
    // 开发环境连接到React开发服务器
    win.loadURL('http://localhost:3000');
    // 打开开发者工具
    win.webContents.openDevTools();
  } else {
    // 生产环境加载打包后的前端页面
    win.loadFile(path.join(__dirname, 'ui', 'build', 'index.html'));
  }
}

// 1. 读取配置
ipcMain.handle('getEnvConfig', async () => {
  return envUtils.parseEnvFile(ENV_PATH);
});

// 2. 保存配置
ipcMain.handle('setEnvConfig', async (event, config) => {
  const envText = envUtils.stringifyEnvConfig(config);
  fs.writeFileSync(ENV_PATH, envText, 'utf-8');
  return { success: true };
});

// 3. 恢复默认
ipcMain.handle('resetEnvConfig', async () => {
  const defaultEnv = envUtils.getDefaultEnvConfig();
  fs.writeFileSync(ENV_PATH, defaultEnv, 'utf-8');
  return { success: true };
});

// 4. 重置机器码（流式日志推送）
ipcMain.on('resetMachineId', (event, options = {}) => {
  const resetScriptPath = path.resolve(__dirname, './reset_machine.py');
  const workingDir = options.workingDir || path.join(__dirname, '..');
  const pythonProcess = spawn('python', [resetScriptPath], {
    cwd: workingDir,
    shell: true,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
  });
  let stdoutData = '';
  let stderrData = '';
  pythonProcess.stdout.on('data', (data) => {
    const text = data.toString('utf-8');
    stdoutData += text;
    event.sender.send('resetMachineId-log', text);
  });
  pythonProcess.stderr.on('data', (data) => {
    const text = data.toString('utf-8');
    stderrData += text;
    event.sender.send('resetMachineId-log', text);
  });
  pythonProcess.on('close', (code) => {
    event.sender.send('resetMachineId-log-end', { code, stdout: stdoutData, stderr: stderrData });
  });
  pythonProcess.on('error', (err) => {
    event.sender.send('resetMachineId-log', `Python启动错误: ${err.message}`);
    event.sender.send('resetMachineId-log-end', { code: -1, stdout: stdoutData, stderr: err.message });
  });
});

// 5. 完整注册流程（调用Python脚本，流式日志推送）
ipcMain.on('completeRegistration', (event) => {
  // 获取Python脚本的绝对路径
  const registerScriptPath = path.resolve(__dirname, './cursor_pro_keep_alive.py');
  const workingDir = path.join(__dirname, '..');
  const reqPath = path.join(workingDir, 'requirements.txt');

  // 检查依赖是否已安装
  if (fs.existsSync(reqPath)) {
    const installProcess = spawn('pip', ['install', '-r', 'requirements.txt'], {
      cwd: workingDir,
      shell: true
    });
    installProcess.stdout.on('data', (data) => {
      event.sender.send('completeRegistration-log', data.toString('utf-8'));
    });
    installProcess.stderr.on('data', (data) => {
      event.sender.send('completeRegistration-log', data.toString('utf-8'));
    });
    installProcess.on('close', () => {
      // 依赖安装完成后继续执行注册脚本
      runRegisterScript();
    });
    installProcess.on('error', (err) => {
      event.sender.send('completeRegistration-log', `依赖安装错误: ${err.message}`);
      event.sender.send('completeRegistration-log-end', { success: false, error: err.message });
    });
  } else {
    runRegisterScript();
  }

  function runRegisterScript() {
    const pythonProcess = spawn('python', [registerScriptPath], {
      cwd: workingDir,
      shell: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });
    let stdoutData = '';
    let stderrData = '';
    let hasSelectedOption = false;
    let hasHandledExit = false;
    let waitingForInput = false;

    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString('utf-8');
      stdoutData += text;
      event.sender.send('completeRegistration-log', text);
      if (!hasSelectedOption &&
        (text.includes('选择操作模式') ||
          text.includes('Select operation mode') ||
          text.includes('1. 仅重置机器码') ||
          text.includes('2. 完整注册流程'))) {
        setTimeout(() => {
          pythonProcess.stdin.write('2\n');
          hasSelectedOption = true;
        }, 500);
      }
      if (text.includes('按任意键退出') ||
        text.includes('press any key') ||
        text.includes('Press Enter') ||
        text.includes('按回车键退出')) {
        waitingForInput = true;
        setTimeout(() => {
          pythonProcess.stdin.write('\n');
        }, 1000);
      }
    });
    pythonProcess.stderr.on('data', (data) => {
      const text = data.toString('utf-8');
      stderrData += text;
      event.sender.send('completeRegistration-log', text);
    });
    pythonProcess.on('close', (code) => {
      if (hasHandledExit) return;
      hasHandledExit = true;
      let success = false;
      let message = '';
      if (code === 0 || waitingForInput) {
        success = true;
        message = '注册流程已完成，请重启Cursor应用以生效';
        const successPattern = /注册成功|完成所有操作|所有操作已完成|registration.*success|all.*operations.*completed/i;
        if (successPattern.test(stdoutData)) {
          const emailPatterns = [
            /生成的邮箱账户.*?:\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
            /邮箱.*?:\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
            /email.*?:\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
            /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
          ];
          const passwordPatterns = [
            /密码.*?:\s*([^\s]+)/,
            /password.*?:\s*([^\s]+)/
          ];
          let emailMatch = null;
          for (const pattern of emailPatterns) {
            emailMatch = stdoutData.match(pattern);
            if (emailMatch) break;
          }
          let passwordMatch = null;
          for (const pattern of passwordPatterns) {
            passwordMatch = stdoutData.match(pattern);
            if (passwordMatch) break;
          }
          if (emailMatch && passwordMatch) {
            message = `注册成功！账号: ${emailMatch[1]}, 密码: ${passwordMatch[1]}。请保存这些信息并重启Cursor应用以生效。`;
          } else if (emailMatch) {
            message = `注册成功！账号: ${emailMatch[1]}。请保存此信息并重启Cursor应用以生效。`;
          }
        }
      } else {
        message = stderrData || `脚本执行失败，退出码: ${code}`;
      }
      event.sender.send('completeRegistration-log-end', {
        success,
        message,
        stdout: stdoutData,
        stderr: stderrData
      });
    });
    pythonProcess.on('error', (err) => {
      if (hasHandledExit) return;
      hasHandledExit = true;
      event.sender.send('completeRegistration-log', `Python启动错误: ${err.message}`);
      event.sender.send('completeRegistration-log-end', {
        success: false,
        error: `启动Python脚本时出错: ${err.message}`
      });
    });
    setTimeout(() => {
      if (!hasHandledExit) {
        hasHandledExit = true;
        try {
          pythonProcess.kill();
        } catch (e) {}
        event.sender.send('completeRegistration-log-end', {
          success: false,
          error: '操作超时。请检查Python环境和依赖是否正确安装，然后重试。',
          stdout: stdoutData,
          stderr: stderrData
        });
      }
    }, 15 * 60 * 1000);
  }
});

const ensureLogDir = () => {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
};
const getLogFilePath = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return path.join(LOG_DIR, `${yyyy}-${mm}-${dd}.log`);
};

// 新增：日志写入IPC通道
ipcMain.on('writeLog', (event, logContent) => {
  try {
    ensureLogDir();
    const logFile = getLogFilePath();
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    fs.appendFileSync(logFile, `[${timestamp}] ${logContent}\n`, 'utf-8');
  } catch (err) {
    // 可选：将错误信息返回前端
    event.sender.send('writeLog-error', err.message);
  }
});

// 新增：获取日志目录IPC通道
ipcMain.handle('getLogDir', async () => LOG_DIR);

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}); 