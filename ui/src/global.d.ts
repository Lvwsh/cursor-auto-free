declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

interface ElectronAPI {
  // 环境设置相关
  getEnvContent: () => Promise<string>;
  
  // 重置机器码相关
  resetMachineId: () => Promise<any>;
  
  // 完整注册流程相关
  completeRegistration: () => Promise<any>;
  
  // 日志目录相关
  getLogDir: () => Promise<string>;
  
  // 账号保存相关
  saveAccount: (data: {email: string, password: string}) => void;
  
  // 日志监听相关
  onResetMachineIdLog: (callback: (event: any, data: string) => void) => () => void;
  onResetMachineIdEnd: (callback: (event: any, result: any) => void) => () => void;
  onCompleteRegistrationLog: (callback: (event: any, data: string) => void) => () => void;
  onCompleteRegistrationEnd: (callback: (event: any, result: any) => void) => () => void;
  onSaveAccountError: (callback: (event: any, error: string) => void) => () => void;
  
  // 写入日志
  writeLog: (logContent: string) => void;
}

declare interface Window {
  electronAPI?: ElectronAPI;
  electron?: any;
} 