import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Alert, Typography, Space, message } from 'antd';
import { ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import '../App.css';

const { Title } = Typography;

// 直接删除mockIpcRenderer和对它的使用，改为使用electronAPI
// 不再需要这个判断，直接使用electronAPI可用性判断
const isElectron = (() => {
  // 检查多种可能的Electron特征
  try {
    if (window.electronAPI) return true;
    return false;
  } catch (e) {
    return false;
  }
})();

console.log('是否在Electron环境中:', isElectron); // 调试日志

// 日志内容过滤函数，去除不需要的区块
function filterLogContent(log: string): string {
  // 去掉分隔线和Get More Information区块
  log = log.replace(/=+\n=== Get More Information ===[\s\S]*?=+\n+/g, '');
  // 去掉"程序执行完毕，按回车键退出..."及后续的注释内容
  log = log.replace(/程序执行完毕，按回车键退出\.\.\.[\s\S]*?(====== 注册成功 ======[\s\S]*?cookie:.*?(\n|$))?/g, '');
  return log;
}

// 从日志中提取所有可能的邮箱地址
function extractEmails(log: string): string[] {
  const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return log.match(emailRegex) || [];
}

// 从日志中寻找最可能的有效邮箱
function findBestEmail(log: string): string | null {
  // 预处理：每行开头添加空格，方便后面的正则匹配
  const processedLog = '\n' + log.split('\n').join('\n ');
  
  // 按优先级尝试不同的匹配模式
  const patterns = [
    // 1. 寻找"生成的邮箱账户: xxx@xxx.xxx"这样的格式
    /生成的邮箱账户.*?[:：]\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    // 2. 寻找"邮箱: xxx@xxx.xxx"这样的格式
    /\n.*邮箱.*?[:：]\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    // 3. 寻找"Email: xxx@xxx.xxx"这样的格式
    /\n.*email.*?[:：]\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    // 4. 寻找Cursor账户信息下面的邮箱
    /Cursor账户信息[：:][^\n]*\n[^\n]*邮箱[：:]\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    // 5. 最后尝试找任意格式的邮箱
    /([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
  ];
  
  for (const pattern of patterns) {
    const match = processedLog.match(pattern);
    if (match && match[1]) {
      console.log(`找到邮箱(${pattern}): ${match[1]}`);
      return match[1].trim();
    }
  }
  
  // 如果上述模式都没找到，返回所有可能的邮箱中的第一个
  const allEmails = extractEmails(log);
  if (allEmails.length > 0) {
    console.log(`从所有可能的${allEmails.length}个邮箱中选择第一个: ${allEmails[0]}`);
    return allEmails[0];
  }
  
  return null;
}

// 从日志中寻找密码
function findPassword(log: string): string | null {
  // 预处理：每行开头添加空格，方便后面的正则匹配
  const processedLog = '\n' + log.split('\n').join('\n ');
  
  // 按优先级尝试不同的匹配模式
  const patterns = [
    // 1. 寻找"密码: xxx"这样的格式
    /\n.*密码.*?[:：]\s*([^\s,;]+)/i,
    // 2. 寻找"Password: xxx"这样的格式
    /\n.*password.*?[:：]\s*([^\s,;]+)/i,
    // 3. 寻找Cursor账户信息下面的密码
    /Cursor账户信息[：:][^\n]*\n[^\n]*邮箱[：:][^\n]*\n[^\n]*密码[：:]\s*([^\s,;]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = processedLog.match(pattern);
    if (match && match[1]) {
      console.log(`找到密码(${pattern}): ${match[1]}`);
      return match[1].trim();
    }
  }
  
  return null;
}

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
    if (isElectron && window.electronAPI) {
      window.electronAPI.getLogDir().then((dir: string) => setLogDir(dir));
    } else {
      setLogDir('模拟目录：/dev/mock-logs');
    }
  }, []);

  // 封装日志写入函数
  const appendLog = (text: string) => {
    setLogMessage(prev => {
      if (isElectron && window.electronAPI) {
        // 只写新增部分到本地日志
        const newLog = text.startsWith('\n') ? text.slice(1) : text;
        window.electronAPI.writeLog(newLog);
      }
      return prev + filterLogContent(text);
    });
  };

  // 重置机器码的处理函数（流式日志）
  const handleResetMachineId = async () => {
    setLoading(true);
    message.loading('正在重置机器码...', 0);
    appendLog('\n\n====== 新一轮重置机器码操作 ======\n');

    // 添加调试日志确认环境
    console.log('当前环境:', isElectron ? 'Electron' : '浏览器');

    if (isElectron && window.electronAPI) {
      try {
        // 设置日志监听
        let allLog = '';
        const logUnsubscribe = window.electronAPI.onResetMachineIdLog((_event, text) => {
          allLog += text;
          appendLog(text);
          setTimeout(() => {
            if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
          }, 0);
        });
        
        const endUnsubscribe = window.electronAPI.onResetMachineIdEnd((_event, result) => {
          message.destroy();
          setLoading(false);
          if (result.code === 0) {
            message.success('机器码重置成功！需重启Cursor应用');
          } else {
            message.error('重置失败: ' + (result.stderr || '未知错误'));
          }
          // 移除事件监听器
          logUnsubscribe();
          endUnsubscribe();
        });
        
        // 发起重置请求
        await window.electronAPI.resetMachineId();
      } catch (error) {
        console.error('Electron API调用失败:', error);
        message.destroy();
        setLoading(false);
        message.error('API调用失败: ' + error);
        appendLog(`\n❌ API调用失败: ${error}`);
      }
    } else {
      // 浏览器环境模拟操作
      setTimeout(() => {
        const mockResult = {
          success: true,
          message: '[浏览器环境模拟] 已模拟重置机器码，实际未执行重置操作',
          stdout: `
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
`
        };
        
        message.destroy();
        setLoading(false);
        message.success('模拟重置成功');
        appendLog(mockResult.stdout);
      }, 1500);
    }
  };

  // 完整注册流程的处理函数
  const handleCompleteRegistration = async () => {
    setRegistrationLoading(true);
    setOperationProgress('');
    appendLog(`\n\n====== 开始执行完整注册流程 ======\n${new Date().toLocaleString()} - 正在初始化...\n`);
    
    if (isElectron && window.electronAPI) {
      try {
        // 设置日志监听
        let allLog = '';
        const logUnsubscribe = window.electronAPI.onCompleteRegistrationLog((_event, text) => {
          allLog += text;
          appendLog(text);
          setTimeout(() => {
            if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
          }, 0);
        });
        
        const endUnsubscribe = window.electronAPI.onCompleteRegistrationEnd((_event, result) => {
          message.destroy();
          setRegistrationLoading(false);
          
          if (result.success) {
            message.success({
              content: '注册流程已完成！请查看日志获取账号信息。',
              duration: 5
            });
            
            // 提取账号信息
            const email = findBestEmail(allLog);
            const password = findPassword(allLog);
            
            let accountInfo = `\n\n====== 注册成功 ======\n`;
            if (email) accountInfo += `邮箱: ${email}\n`;
            if (password) accountInfo += `密码: ${password}\n`;
            
            setOperationProgress(accountInfo);
            appendLog(accountInfo); // 写入本地日志
            
            // 打印调试信息
            console.log('提取到的账户信息:', {
              email: email,
              password: password
            });
            
            // 保存账号密码
            if (email && password && window.electronAPI) {
              console.log('正在保存账号:', email);
              window.electronAPI.saveAccount({
                email: email,
                password: password
              });
              
              // 监听保存成功
              const successUnsubscribe = window.electronAPI.onSaveAccountSuccess((_event, data) => {
                message.success({
                  content: `账号 ${data.email} 已保存到zhmm.txt`,
                  duration: 3
                });
                successUnsubscribe();
              });
              
              // 监听保存错误
              const errorUnsubscribe = window.electronAPI.onSaveAccountError((_event, errMsg) => {
                message.error({
                  content: `账号保存失败: ${errMsg}`,
                  duration: 5
                });
                errorUnsubscribe();
              });
              
              // 超时清理
              setTimeout(() => {
                successUnsubscribe();
                errorUnsubscribe();
              }, 10000);
            }
          } else {
            message.error({
              content: `注册失败: ${result.error || result.message}`,
              duration: 5
            });
            appendLog(`\n❌ 注册失败: ${result.error || result.message}`);
          }
          
          // 移除事件监听器
          logUnsubscribe();
          endUnsubscribe();
        });
        
        // 发起注册请求
        await window.electronAPI.completeRegistration();
      } catch (error) {
        console.error('Electron API调用失败:', error);
        message.destroy();
        setRegistrationLoading(false);
        message.error('API调用失败: ' + error);
        appendLog(`\n❌ API调用失败: ${error}`);
      }
    } else {
      // 浏览器环境模拟操作
      setTimeout(() => {
        const randomEmail = `user${Math.floor(Math.random() * 10000)}@example.com`;
        const randomPassword = Math.random().toString(36).substring(2, 10);
        
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
        
        message.destroy();
        setRegistrationLoading(false);
        message.warning({
          content: '这是模拟注册操作，未实际执行注册流程。请在Electron应用中运行。',
          duration: 5
        });
        appendLog(mockPythonOutput);
        
        // 显示提取的账号信息
        let accountInfo = `\n\n====== 注册成功 ======\n`;
        accountInfo += `邮箱: ${randomEmail}\n`;
        accountInfo += `密码: ${randomPassword}\n`;
        setOperationProgress(accountInfo);
      }, 2000);
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
