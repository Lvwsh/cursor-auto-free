const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 环境设置相关
  getEnvContent: () => ipcRenderer.invoke('getEnvContent'),
  saveEnvContent: (content) => ipcRenderer.invoke('saveEnvContent', content),
  
  // 重置机器码相关
  resetMachineId: () => ipcRenderer.invoke('resetMachineId'),
  
  // 完整注册流程相关
  completeRegistration: () => ipcRenderer.invoke('completeRegistration'),
  
  // 日志目录相关
  getLogDir: () => ipcRenderer.invoke('getLogDir'),
  
  // 账号保存相关
  saveAccount: (data) => ipcRenderer.send('saveAccount', data),
  onSaveAccountSuccess: (callback) => {
    ipcRenderer.on('saveAccount-success', callback);
    return () => ipcRenderer.removeListener('saveAccount-success', callback);
  },
  onSaveAccountError: (callback) => {
    ipcRenderer.on('saveAccount-error', callback);
    return () => ipcRenderer.removeListener('saveAccount-error', callback);
  },
  
  // 日志监听相关
  onResetMachineIdLog: (callback) => {
    ipcRenderer.on('resetMachineId-log', callback);
    return () => ipcRenderer.removeListener('resetMachineId-log', callback);
  },
  onResetMachineIdEnd: (callback) => {
    ipcRenderer.on('resetMachineId-log-end', callback);
    return () => ipcRenderer.removeListener('resetMachineId-log-end', callback);
  },
  onCompleteRegistrationLog: (callback) => {
    ipcRenderer.on('completeRegistration-log', callback);
    return () => ipcRenderer.removeListener('completeRegistration-log', callback);
  },
  onCompleteRegistrationEnd: (callback) => {
    ipcRenderer.on('completeRegistration-log-end', callback);
    return () => ipcRenderer.removeListener('completeRegistration-log-end', callback);
  },
  
  // 写入日志
  writeLog: (logContent) => ipcRenderer.send('writeLog', logContent)
}); 