const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// 用于处理重置机器码的API端点
app.post('/api/resetMachineId', (req, res) => {
  // 获取Python脚本的绝对路径
  const resetScriptPath = path.join(__dirname, 'reset_machine.py');
  
  console.log('__dirname:', __dirname);
  console.log('reset_machine.py 路径:', resetScriptPath);
  
  // 检查脚本是否存在
  if (!fs.existsSync(resetScriptPath)) {
    return res.status(404).json({
      success: false,
      error: `脚本文件不存在: ${resetScriptPath}`
    });
  }

  console.log(`执行Python脚本: ${resetScriptPath}`);
  
  // 使用child_process.spawn执行Python脚本
  const pythonProcess = spawn('python', [resetScriptPath], {
    shell: true // 在Windows上使用shell确保Python命令可以被正确找到
  });
  
  let stdoutData = '';
  let stderrData = '';
  
  // 收集标准输出
  pythonProcess.stdout.on('data', (data) => {
    const text = data.toString();
    console.log(`Python输出: ${text}`);
    stdoutData += text;
  });
  
  // 收集错误输出
  pythonProcess.stderr.on('data', (data) => {
    const text = data.toString();
    console.error(`Python错误: ${text}`);
    stderrData += text;
  });
  
  // 处理脚本执行完成事件
  pythonProcess.on('close', (code) => {
    console.log(`Python进程退出，代码: ${code}`);
    
    if (code !== 0) {
      // 脚本执行失败
      res.json({
        success: false,
        error: stderrData || `脚本执行失败，退出码: ${code}`
      });
    } else {
      // 脚本执行成功
      res.json({
        success: true,
        message: '机器码重置成功，请重启Cursor应用以生效',
        stdout: stdoutData,
        stderr: stderrData
      });
    }
  });
  
  // 处理脚本执行错误
  pythonProcess.on('error', (err) => {
    console.error(`Python启动错误: ${err.message}`);
    res.json({
      success: false,
      error: `启动Python脚本时出错: ${err.message}`
    });
  });
});

// 提供API端点：完整注册流程
app.post('/api/completeRegistration', (req, res) => {
  // 获取Python脚本的绝对路径
  const registerScriptPath = path.join(__dirname, 'cursor_pro_keep_alive.py');
  
  console.log('__dirname:', __dirname);
  console.log('cursor_pro_keep_alive.py 路径:', registerScriptPath);
  
  // 检查脚本是否存在
  if (!fs.existsSync(registerScriptPath)) {
    return res.status(404).json({
      success: false,
      error: `脚本文件不存在: ${registerScriptPath}`
    });
  }

  console.log(`执行Python脚本: ${registerScriptPath}`);
  
  // 使用child_process.spawn执行Python脚本
  const pythonProcess = spawn('python', [registerScriptPath], {
    shell: true
  });
  
  let stdoutData = '';
  let stderrData = '';
  let hasSelectedOption = false;
  
  // 收集标准输出
  pythonProcess.stdout.on('data', (data) => {
    const text = data.toString();
    console.log(`Python输出: ${text}`);
    stdoutData += text;
    
    // 如果遇到选择提示，自动选择选项2（完整注册流程）
    if (!hasSelectedOption &&
        (text.includes('选择操作模式') ||
         text.includes('Select operation mode') ||
         text.includes('1. 仅重置机器码') ||
         text.includes('2. 完整注册流程'))) {
      // 等待一小段时间再发送选项，确保程序准备好接收输入
      setTimeout(() => {
        pythonProcess.stdin.write('2\n');
        hasSelectedOption = true;
        console.log('自动选择选项2: 完整注册流程');
      }, 500);
    }
    
    // 等待任意键退出程序的处理
    if (text.includes('按任意键退出') ||
        text.includes('press any key') ||
        text.includes('Press Enter') ||
        text.includes('按回车键退出')) {
      // 发送回车键模拟用户输入，允许程序正常退出
      setTimeout(() => {
        pythonProcess.stdin.write('\n');
        console.log('自动发送回车键响应"按任意键退出"提示');
      }, 1000);
    }
  });
  
  // 收集错误输出
  pythonProcess.stderr.on('data', (data) => {
    const text = data.toString();
    console.error(`Python错误: ${text}`);
    stderrData += text;
  });
  
  // 处理脚本执行完成事件
  pythonProcess.on('close', (code) => {
    console.log(`Python进程退出，代码: ${code}`);
    
    if (code !== 0) {
      // 脚本执行失败
      res.json({
        success: false,
        error: stderrData || `脚本执行失败，退出码: ${code}`
      });
    } else {
      // 提取注册成功的账号信息
      let email = '';
      let password = '';
      
      // 尝试从输出中提取邮箱和密码
      const emailRegex = /邮箱:\s*([^\s]+@[^\s]+)|Email:\s*([^\s]+@[^\s]+)/i;
      const passwordRegex = /密码:\s*([^\s]+)|Password:\s*([^\s]+)/i;
      
      const emailMatch = stdoutData.match(emailRegex);
      const passwordMatch = stdoutData.match(passwordRegex);
      
      if (emailMatch) {
        email = emailMatch[1] || emailMatch[2];
      }
      
      if (passwordMatch) {
        password = passwordMatch[1] || passwordMatch[2];
      }
      
      // 脚本执行成功
      res.json({
        success: true,
        message: '注册成功，请查看账号信息',
        account: {
          email: email,
          password: password
        },
        stdout: stdoutData,
        stderr: stderrData
      });
    }
  });
  
  // 处理脚本执行错误
  pythonProcess.on('error', (err) => {
    console.error(`Python启动错误: ${err.message}`);
    res.json({
      success: false,
      error: `启动Python脚本时出错: ${err.message}`
    });
  });
});

// 设置静态文件服务
app.use(express.static(path.join(__dirname, 'ui', 'build')));

// 将所有其他请求转发到React前端
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'ui', 'build', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`API服务器已启动，端口: ${PORT}`);
}); 