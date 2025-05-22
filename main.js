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
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'ui', 'src', 'preload.js'),
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
ipcMain.handle('resetMachineId', (event, options = {}) => {
  return new Promise((resolve) => {
    console.log('[重置机器码] 收到事件');
    const resetScriptPath = path.resolve(__dirname, './reset_machine.py');
    console.log('[重置机器码] 脚本路径:', resetScriptPath);
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
      const result = { code, stdout: stdoutData, stderr: stderrData };
      event.sender.send('resetMachineId-log-end', result);
      resolve(result);
    });
    pythonProcess.on('error', (err) => {
      const error = `Python启动错误: ${err.message}`;
      event.sender.send('resetMachineId-log', error);
      const result = { code: -1, stdout: stdoutData, stderr: error };
      event.sender.send('resetMachineId-log-end', result);
      resolve(result);
    });
  });
});

// 5. 完整注册流程（调用Python脚本，流式日志推送）
ipcMain.handle('completeRegistration', (event) => {
  return new Promise((resolve) => {
    // 获取Python脚本的绝对路径
    const registerScriptPath = path.resolve(__dirname, './cursor_pro_keep_alive.py');
    const workingDir = path.join(__dirname, '..');
    const reqPath = path.join(workingDir, 'requirements.txt');
    
    let hasInstalledDeps = false;
    
    // 检查依赖是否已安装
    function installDependencies() {
      return new Promise((resolveInstall) => {
        if (!fs.existsSync(reqPath)) {
          resolveInstall();
          return;
        }
        
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
          hasInstalledDeps = true;
          resolveInstall();
        });
        installProcess.on('error', (err) => {
          const error = `依赖安装错误: ${err.message}`;
          event.sender.send('completeRegistration-log', error);
          resolveInstall();
        });
      });
    }
    
    // 运行注册脚本
    async function runRegisterScript() {
      // 先安装依赖
      await installDependencies();
      
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
            // 扩展邮箱匹配模式
            const emailPatterns = [
              /生成的邮箱账户.*?[:：]\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
              /生成的邮箱.*?[:：]\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
              /邮箱账户.*?[:：]\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
              /邮箱.*?[:：]\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
              /电子邮箱.*?[:：]\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
              /email.*?[:：]\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
              /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
            ];
            // 扩展密码匹配模式
            const passwordPatterns = [
              /密码.*?[:：]\s*([^\s,;]+)/i,
              /password.*?[:：]\s*([^\s,;]+)/i
            ];
            
            // 查找所有匹配的邮箱
            let emailMatches = [];
            for (const pattern of emailPatterns) {
              const matches = [...stdoutData.matchAll(new RegExp(pattern, 'gi'))];
              if (matches.length > 0) {
                matches.forEach(match => {
                  if (match[1]) emailMatches.push(match[1]);
                });
              }
            }
            
            // 使用最后一个找到的邮箱（通常是最终注册成功的那个）
            let emailMatch = emailMatches.length > 0 ? 
              { 1: emailMatches[emailMatches.length - 1] } : null;
            console.log('[注册流程] 找到的所有邮箱:', emailMatches);
            
            let passwordMatch = null;
            for (const pattern of passwordPatterns) {
              passwordMatch = stdoutData.match(pattern);
              if (passwordMatch) break;
            }
            
            if (emailMatch && passwordMatch) {
              // 清理邮箱和密码（去除可能的非打印字符）
              const cleanEmail = emailMatch[1].trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
              const cleanPassword = passwordMatch[1].trim();
              
              console.log('[注册流程] 提取到账号:', cleanEmail);
              message = `注册成功！账号: ${cleanEmail}, 密码: ${cleanPassword}。请保存这些信息并重启Cursor应用以生效。`;
              
              // 直接在这里保存账号密码
              try {
                const savePath = path.resolve(process.cwd(), 'zhmm.txt');
                const now = new Date();
                const timestamp = `[${now.toISOString().replace('T', ' ').substring(0, 19)}]`;
                let content = `${timestamp}\n邮箱: ${cleanEmail}\n密码: ${cleanPassword}\n\n`;
                fs.appendFileSync(savePath, content, 'utf-8');
                console.log('[注册流程] 账号已保存到zhmm.txt');
              } catch (e) {
                console.error('[注册流程] 保存账号失败:', e);
              }
            } else if (emailMatch) {
              const cleanEmail = emailMatch[1].trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
              message = `注册成功！账号: ${cleanEmail}。请保存此信息并重启Cursor应用以生效。`;
            }
          }
        } else {
          message = stderrData || `脚本执行失败，退出码: ${code}`;
        }
        const result = {
          success,
          message,
          stdout: stdoutData,
          stderr: stderrData
        };
        event.sender.send('completeRegistration-log-end', result);
        resolve(result);
      });
      pythonProcess.on('error', (err) => {
        if (hasHandledExit) return;
        hasHandledExit = true;
        const error = `Python启动错误: ${err.message}`;
        event.sender.send('completeRegistration-log', error);
        const result = {
          success: false,
          error: `启动Python脚本时出错: ${err.message}`
        };
        event.sender.send('completeRegistration-log-end', result);
        resolve(result);
      });
      setTimeout(() => {
        if (!hasHandledExit) {
          hasHandledExit = true;
          try {
            pythonProcess.kill();
          } catch (e) {}
          const result = {
            success: false,
            error: '操作超时。请检查Python环境和依赖是否正确安装，然后重试。',
            stdout: stdoutData,
            stderr: stderrData
          };
          event.sender.send('completeRegistration-log-end', result);
          resolve(result);
        }
      }, 15 * 60 * 1000);
    }
    
    // 执行注册流程
    runRegisterScript();
  });
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
ipcMain.handle('getLogDir', () => LOG_DIR);

// 新增：保存账号密码到zhmm.txt
ipcMain.on('saveAccount', (event, { email, password }) => {
  try {
    const savePath = path.resolve(process.cwd(), 'zhmm.txt');
    
    // 读取现有内容，检查是否已存在相同账号
    let existingContent = '';
    if (fs.existsSync(savePath)) {
      existingContent = fs.readFileSync(savePath, 'utf-8');
    }
    
    // 检查是否已存在相同的账号
    const emailLine = `邮箱: ${email}`;
    if (existingContent.includes(emailLine)) {
      console.log('[saveAccount] 已存在相同账号，跳过保存:', email);
      return; // 已存在相同账号时不再保存
    }
    
    // 生成时间戳前缀
    const now = new Date();
    const timestamp = `[${now.toISOString().replace('T', ' ').substring(0, 19)}]`;
    
    // 构建要写入的内容
    let content = `${timestamp}\n`;
    if (email) content += `邮箱: ${email}\n`;
    if (password) content += `密码: ${password}\n`;
    content += '\n';
    
    // 写入文件（追加模式）
    console.log('[saveAccount] 即将写入新账号:', email);
    fs.appendFileSync(savePath, content, 'utf-8');
    console.log('[saveAccount] 写入成功:', savePath);
    
    // 记录到日志
    const logDir = path.resolve(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, `accounts_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.log`);
    fs.appendFileSync(logPath, content, 'utf-8');
    
    // 发送成功事件
    event.sender.send('saveAccount-success', { email });
  } catch (err) {
    console.error('[saveAccount] 写入失败:', err);
    event.sender.send('saveAccount-error', err.message);
  }
});

// 新增：读取.env文件内容
ipcMain.handle('getEnvContent', async () => {
  const envPath = path.join(__dirname, '.env');
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    return content;
  } catch (e) {
    return '';
  }
});

// 新增：保存.env文件内容
ipcMain.handle('saveEnvContent', async (event, content) => {
  const envPath = path.join(__dirname, '.env');
  try {
    fs.writeFileSync(envPath, content, 'utf-8');
    return { success: true };
  } catch (e) {
    console.error('保存.env文件失败:', e);
    return { success: false, error: e.message };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}); 