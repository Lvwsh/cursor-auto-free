import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Alert, Typography, Space, message } from 'antd';
import { ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import '../App.css';

const { Title } = Typography;

// 判断是否在Electron环境中
const isElectron = window.require !== undefined;

// 创建一个mockIpc用于浏览器环境测试
const mockIpcRenderer = {
  invoke: async (channel: string, ...args: any[]) => {
    console.log(`调用了 ${channel} 通道`, args);
    
    // 如果是在开发环境中点击重置机器码，尝试通过 fetch API 调用真实的 Python 脚本
    if (channel === 'resetMachineId') {
      try {
        // 尝试通过 fetch API 调用后端接口来执行 Python 脚本
        const response = await fetch('/api/resetMachineId', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(args[0] || {})
        });
        
        // 如果后端服务可用，返回真实结果
        if (response.ok) {
          return await response.json();
        }
        
        // 如果后端服务不可用，回退到模拟模式并显示警告
        console.warn('后端服务不可用，回退到模拟模式');
        
        // 模拟异步操作
        return new Promise((resolve) => {
          setTimeout(() => {
            // 模拟Python脚本重置机器码的输出
            const mockPythonOutput = `
${new Date().toLocaleString()} - INFO - 正在检查配置文件...
${new Date().toLocaleString()} - INFO - 读取当前配置...
${new Date().toLocaleString()} - INFO - 生成新的机器标识...
${new Date().toLocaleString()} - INFO - 保存新配置...
${new Date().toLocaleString()} - SUCCESS - 机器标识重置成功！

新的机器标识:
- telemetry.devDeviceId: ${Math.random().toString(36).substring(2, 15)}
- telemetry.macMachineId: ${Math.random().toString(36).substring(2, 30)}
- telemetry.machineId: ${Math.random().toString(36).substring(2, 20)}
- telemetry.sqmId: {${Math.random().toString(36).substring(2, 15).toUpperCase()}}
`;
            
            resolve({
              success: true,
              message: '[开发环境模拟] 已模拟重置机器码，实际未执行重置操作',
              stdout: mockPythonOutput
            });
          }, 1500);
        });
      } catch (error) {
        console.error('调用后端API失败:', error);
        // 模拟失败情况下，也返回模拟数据
        return {
          success: false,
          error: '无法连接到Python后端服务，请确保在Electron环境中运行或配置正确的后端服务',
          isSimulated: true
        };
      }
    }
    
    // 如果是点击完整注册流程，尝试通过 fetch API 调用真实的 Python 脚本
    if (channel === 'completeRegistration') {
      try {
        // 尝试通过 fetch API 调用后端接口来执行真实的 Python 脚本
        const response = await fetch('/api/completeRegistration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // 如果后端服务可用，返回真实结果
        if (response.ok) {
          const result = await response.json();
          
          // 添加模拟流式输出的能力（对于真实执行但需要前端展示流式结果的情况）
          if (result.success && result.stdout) {
            let currentOutput = '';
            const lines = result.stdout.trim().split('\n');
            let lineIndex = 0;
            
            interface ProgressUpdates {
              intervalId: ReturnType<typeof setInterval>;
              callback?: (data: string) => void;
            }
            
            const progressUpdates: ProgressUpdates = {
              intervalId: setInterval(() => {
                if (lineIndex < lines.length) {
                  // 每次添加1-3行
                  const numLines = Math.min(Math.floor(Math.random() * 3) + 1, lines.length - lineIndex);
                  for (let i = 0; i < numLines; i++) {
                    currentOutput += lines[lineIndex] + '\n';
                    lineIndex++;
                  }
                  
                  // 提供进度更新回调
                  if (progressUpdates.callback) {
                    progressUpdates.callback(currentOutput);
                  }
                } else {
                  clearInterval(progressUpdates.intervalId);
                }
              }, 200)
            };
            
            // 为结果添加onProgress回调方法
            result.onProgress = (callback: (data: string) => void) => {
              progressUpdates.callback = callback;
              return result.stdout;
            };
          }
          
          return result;
        }
        
        // 如果后端服务不可用，回退到模拟模式并显示警告
        console.warn('后端服务不可用，回退到模拟模式');
      } catch (error) {
        console.error('调用后端API失败:', error);
      }
      
      // 如果无法调用真实的Python脚本，则提供模拟实现
      return new Promise((resolve) => {
        // 模拟异步操作（完整注册流程需要更长时间）
        setTimeout(() => {
          const randomEmail = `user${Math.floor(Math.random() * 10000)}@example.com`;
          const randomPassword = Math.random().toString(36).substring(2, 10);
          
          // 显示警告消息，提示用户这只是模拟操作
          message.warning({
            content: '当前在浏览器环境中运行，无法调用真实的Python脚本。请在Electron应用中使用此功能或配置正确的后端服务。',
            duration: 5
          });
          
          // 模拟Python脚本输出
          const mockPythonOutput = `
${new Date().toLocaleString()} - WARNING - 当前在浏览器环境中，这是模拟输出！
${new Date().toLocaleString()} - INFO - 程序初始化中...
${new Date().toLocaleString()} - INFO - 退出正在运行的Cursor程序
${new Date().toLocaleString()} - INFO - 选择操作模式
1. 仅重置机器码
2. 完整注册流程
${new Date().toLocaleString()} - INFO - 初始化浏览器...
${new Date().toLocaleString()} - INFO - 生成随机账户
${new Date().toLocaleString()} - INFO - 生成的邮箱账户: ${randomEmail}
${new Date().toLocaleString()} - INFO - 初始化邮箱验证
${new Date().toLocaleString()} - INFO - 开始注册
${new Date().toLocaleString()} - INFO - 访问登录页面: https://authenticator.cursor.sh
${new Date().toLocaleString()} - INFO - 开始账户注册
${new Date().toLocaleString()} - INFO - 填写个人信息
${new Date().toLocaleString()} - INFO - 输入名字: User
${new Date().toLocaleString()} - INFO - 输入姓氏: Test
${new Date().toLocaleString()} - INFO - 输入邮箱: ${randomEmail}
${new Date().toLocaleString()} - INFO - 提交个人信息
${new Date().toLocaleString()} - INFO - 检测到Turnstile验证
${new Date().toLocaleString()} - INFO - Turnstile验证通过
${new Date().toLocaleString()} - INFO - 设置密码: ${randomPassword}
${new Date().toLocaleString()} - INFO - 提交密码
${new Date().toLocaleString()} - INFO - 密码设置完成
${new Date().toLocaleString()} - INFO - 获取验证码...
${new Date().toLocaleString()} - INFO - 验证码: 123456
${new Date().toLocaleString()} - INFO - 输入验证码
${new Date().toLocaleString()} - INFO - 验证码输入完成
${new Date().toLocaleString()} - INFO - 等待系统处理...3秒
${new Date().toLocaleString()} - INFO - 注册成功
${new Date().toLocaleString()} - INFO - Cursor账户信息:
   邮箱: ${randomEmail}
   密码: ${randomPassword}
${new Date().toLocaleString()} - INFO - 获取会话令牌
${new Date().toLocaleString()} - INFO - 更新认证信息
${new Date().toLocaleString()} - INFO - 重置机器码
${new Date().toLocaleString()} - INFO - 所有操作已完成
`;
          
          // 模拟流式返回数据
          let currentOutput = '';
          const lines = mockPythonOutput.trim().split('\n');
          let lineIndex = 0;
          
          // 定义正确的类型，包含callback属性
          // 通过使用ReturnType<typeof setInterval>获取setInterval返回值的确切类型
          // 这样可以防止出现"类型上不存在属性'callback'"的TypeScript错误
          interface ProgressUpdates {
            intervalId: ReturnType<typeof setInterval>;
            callback?: (data: string) => void;
          }
          
          const progressUpdates: ProgressUpdates = {
            intervalId: setInterval(() => {
              if (lineIndex < lines.length) {
                // 每次添加1-3行
                const numLines = Math.min(Math.floor(Math.random() * 3) + 1, lines.length - lineIndex);
                for (let i = 0; i < numLines; i++) {
                  currentOutput += lines[lineIndex] + '\n';
                  lineIndex++;
                }
                
                // 提供进度更新回调
                if (progressUpdates.callback) {
                  progressUpdates.callback(currentOutput);
                }
              } else {
                clearInterval(progressUpdates.intervalId);
                resolve({
                  success: true,
                  message: `[开发环境模拟] 已模拟完整注册流程，注册账户: ${randomEmail}, 密码: ${randomPassword}`,
                  stdout: mockPythonOutput,
                  isSimulated: true,
                  // 提供回调方法，允许实时获取进度更新
                  onProgress: (callback: (data: string) => void) => {
                    progressUpdates.callback = callback;
                    return mockPythonOutput;
                  }
                });
              }
            }, 200)
          };
          
          // 提供回调方法，允许实时获取进度更新
          return {
            success: true,
            message: `[开发环境模拟] 已模拟完整注册流程，注册账户: ${randomEmail}, 密码: ${randomPassword}`,
            stdout: mockPythonOutput,
            isSimulated: true,
            onProgress: (callback: (data: string) => void) => {
              progressUpdates.callback = callback;
              return mockPythonOutput;
            }
          };
        }, 1000);
      });
    }
    
    return Promise.resolve({ success: false, error: '未知操作' });
  }
};

// 根据环境选择真实或模拟的ipcRenderer
const ipcRenderer = isElectron ? window.require('electron').ipcRenderer : mockIpcRenderer;

const HomePage: React.FC = () => {
  // 状态用于存储日志信息
  const [logMessage, setLogMessage] = useState<string>(
    "Cursor Pro v3.0.0 启动中...\n操作系统: Windows\n当前用户: lvws1\n✅ 当前程序已拥有管理员权限，可以正常执行所有功能\n当前用户: lvws1\n主题检测方法: darkdetect 库\n检测结果: 浅色"
  );
  // 添加加载状态
  const [loading, setLoading] = useState<boolean>(false);
  // 添加注册流程加载状态
  const [registrationLoading, setRegistrationLoading] = useState<boolean>(false);
  // 添加操作进度 
  const [operationProgress, setOperationProgress] = useState<string>('');
  const logRef = useRef<HTMLDivElement>(null);
  const [logDir, setLogDir] = useState<string>('');

  // 页面加载时获取日志目录
  useEffect(() => {
    if (isElectron) {
      ipcRenderer.invoke('getLogDir').then((dir: string) => setLogDir(dir));
    } else {
      setLogDir('模拟目录：/dev/mock-logs');
    }
  }, []);

  // 封装日志写入函数
  const appendLog = (text: string) => {
    setLogMessage(prev => {
      if (isElectron) {
        // 只写新增部分到本地日志
        const newLog = text.startsWith('\n') ? text.slice(1) : text;
        window.require('electron').ipcRenderer.send('writeLog', newLog);
      }
      return prev + text;
    });
  };

  // 重置机器码的处理函数（流式日志）
  const handleResetMachineId = async () => {
    setLoading(true);
    message.loading('正在重置机器码...', 0);

    if (isElectron) {
      // Electron环境，流式日志
      appendLog('\n\n====== 新一轮重置机器码操作 ======\n');
      let allLog = '';
      // 定义监听器
      const onLog = (_event: any, text: string) => {
        allLog += text;
        appendLog(text);
        setTimeout(() => {
          if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
        }, 0);
      };
      const onEnd = (_event: any, result: any) => {
        message.destroy();
        setLoading(false);
        if (result.code === 0) {
          message.success('机器码重置成功！需重启Cursor应用');
        } else {
          message.error('重置失败: ' + (result.stderr || '未知错误'));
        }
        ipcRenderer.removeListener('resetMachineId-log', onLog);
        ipcRenderer.removeListener('resetMachineId-log-end', onEnd);
      };
      ipcRenderer.on('resetMachineId-log', onLog);
      ipcRenderer.on('resetMachineId-log-end', onEnd);
      ipcRenderer.send('resetMachineId');
    } else {
      // 仅浏览器环境才调用invoke
      appendLog('\n\n====== 新一轮重置机器码操作 ======\n');
      try {
        const result = await ipcRenderer.invoke('resetMachineId');
        message.destroy();
        setLoading(false);
        if (result.success) {
          message.success('模拟重置成功');
          appendLog(result.stdout);
        } else {
          message.error(`重置失败: ${result.error}`);
          appendLog(`\n❌ 重置失败: ${result.error}`);
        }
      } catch (error: any) {
        message.destroy();
        setLoading(false);
        const errorMessage = error.message || '未知错误';
        message.error(`操作失败: ${errorMessage}`);
        appendLog(`\n❌ 操作失败: ${errorMessage}`);
      }
    }
  };

  // 完整注册流程的处理函数
  const handleCompleteRegistration = async () => {
    if (isElectron) {
      setRegistrationLoading(true);
      setOperationProgress('');
      appendLog(`\n\n====== 开始执行完整注册流程 ======\n${new Date().toLocaleString()} - 正在初始化...\n`);
      let allLog = '';
      // 定义监听器
      const onLog = (_event: any, text: string) => {
        allLog += text;
        appendLog(text);
        setTimeout(() => {
          if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
        }, 0);
      };
      const onEnd = (_event: any, result: any) => {
        message.destroy();
        setRegistrationLoading(false);
        if (result.success) {
          message.success({
            content: '注册流程已完成！请查看日志获取账号信息。',
            duration: 5
          });
          // 检查是否有邮箱和密码信息
          const emailPattern = /生成的邮箱账户.*?[:,：]\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
          const passwordPattern = /密码.*?[:,：]\s*([^\s]+)/i;
          const emailMatch = allLog.match(emailPattern);
          const passwordMatch = allLog.match(passwordPattern);
          if (emailMatch && passwordMatch) {
            const accountInfo = `\n\n====== 注册成功 ======\n邮箱: ${emailMatch[1]}\n密码: ${passwordMatch[1]}\n\n请保存这些信息，并重启Cursor应用以使更改生效！\n`;
            setOperationProgress(accountInfo);
          }
        } else {
          message.error({
            content: `注册失败: ${result.error || result.message}`,
            duration: 5
          });
          appendLog(`\n❌ 注册失败: ${result.error || result.message}`);
        }
        ipcRenderer.removeListener('completeRegistration-log', onLog);
        ipcRenderer.removeListener('completeRegistration-log-end', onEnd);
      };
      ipcRenderer.on('completeRegistration-log', onLog);
      ipcRenderer.on('completeRegistration-log-end', onEnd);
      ipcRenderer.send('completeRegistration');
    } else {
      // 浏览器环境保持原有invoke逻辑
      try {
        setRegistrationLoading(true);
        setOperationProgress('');
        appendLog(`\n\n====== 开始执行完整注册流程 ======\n${new Date().toLocaleString()} - 正在初始化...\n`);
        const result = await ipcRenderer.invoke('completeRegistration');
        if (result.stdout) {
          const emailPattern = /生成的邮箱账户.*?[:,：]\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
          const passwordPattern = /密码.*?[:,：]\s*([^\s]+)/i;
          const emailMatch = result.stdout.match(emailPattern);
          const passwordMatch = result.stdout.match(passwordPattern);
          if (emailMatch && passwordMatch) {
            const accountInfo = `\n\n====== 注册成功 ======\n邮箱: ${emailMatch[1]}\n密码: ${passwordMatch[1]}\n\n请保存这些信息，并重启Cursor应用以使更改生效！\n`;
            setOperationProgress(accountInfo);
          }
        }
        message.destroy();
        setRegistrationLoading(false);
        if (result.success) {
          if (result.isSimulated) {
            message.warning({
              content: '这是模拟注册操作，未实际执行注册流程。请在Electron应用中运行或配置正确的后端服务。',
              duration: 5
            });
          } else {
            message.success({
              content: '注册流程已完成！请查看日志获取账号信息。',
              duration: 5
            });
          }
          if (result.stdout) {
            appendLog(result.stdout);
          } else {
            appendLog(result.message);
          }
        } else {
          message.error({
            content: `注册失败: ${result.error}`,
            duration: 5
          });
          appendLog(`\n❌ 注册失败: ${result.error}`);
        }
      } catch (error: any) {
        message.destroy();
        setRegistrationLoading(false);
        const errorMessage = error.message || '未知错误';
        message.error({
          content: `操作失败: ${errorMessage}`,
          duration: 5
        });
        appendLog(`\n❌ 操作失败: ${errorMessage}`);
      }
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Alert
        message={
          <span>
            当前日志目录：<b>{logDir}</b>
          </span>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Title level={4} style={{ marginBottom: 24 }}>快捷操作</Title>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card style={{ borderRadius: 10 }}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              size="large" 
              style={{ width: 180 }}
              onClick={handleResetMachineId}
              loading={loading}
            >
              重置机器码
            </Button>
            <Button 
              type="primary" 
              icon={<CheckCircleOutlined />} 
              size="large" 
              style={{ width: 180 }}
              onClick={handleCompleteRegistration}
              loading={registrationLoading}
              disabled={loading}
            >
              完整注册流程
            </Button>
          </Space>
        </Card>
        
        {operationProgress && (
          <Alert
            message="注册成功"
            description={<span style={{ whiteSpace: 'pre-line' }}>{operationProgress}</span>}
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Card title="日志输出" style={{ borderRadius: 10 }}>
          <Alert
            message={
              <div ref={logRef} style={{ maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-line' }}>
                {logMessage}
              </div>
            }
            type="info"
            showIcon
            style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}
          />
        </Card>
      </Space>
      
      {!isElectron && (
        <Alert
          message="当前在Web浏览器中运行"
          description="注意：在浏览器环境中，功能为模拟操作，不会真正执行。请在Electron应用中使用此功能。"
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};

export default HomePage;