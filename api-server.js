const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// 允许跨域请求
app.use(cors());
app.use(express.json());

// 获取Python脚本所在的绝对路径
const projectRoot = path.resolve(__dirname);
const resetMachineScriptPath = path.join(projectRoot, 'reset_machine.py');
const registrationScriptPath = path.join(projectRoot, 'cursor_pro_keep_alive.py');

// 提供API端点：重置机器码
app.post('/api/resetMachineId', (req, res) => {
  // 检查脚本是否存在
  if (!fs.existsSync(resetMachineScriptPath)) {
    return res.status(404).json({
      success: false,
      error: `脚本文件不存在: ${resetMachineScriptPath}`
    });
  }

  console.log(`执行Python脚本: ${resetMachineScriptPath}`);
  console.log(`工作目录: ${projectRoot}`);

  // 使用child_process.spawn执行Python脚本
  const pythonProcess = spawn('python', [resetMachineScriptPath], {
    cwd: projectRoot,
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
      // 提取关键信息或使用默认消息
      let successMessage = '机器码重置成功，请重启Cursor应用以生效';

      // 尝试从输出中提取成功信息
      const successPattern = /机器标识重置成功/;
      if (successPattern.test(stdoutData)) {
        // 如果找到成功标记，则使用完整输出
        successMessage = '机器码重置成功，请重启Cursor应用以生效';
      }

      // 脚本执行成功
      res.json({
        success: true,
        message: successMessage,
        stdout: stdoutData,  // 返回完整的标准输出
        stderr: stderrData   // 返回任何错误输出
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
  // 检查脚本是否存在
  if (!fs.existsSync(registrationScriptPath)) {
    return res.status(404).json({
      success: false,
      error: `脚本文件不存在: ${registrationScriptPath}`
    });
  }

  console.log(`执行Python脚本: ${registrationScriptPath}`);
  console.log(`工作目录: ${projectRoot}`);

  // 安装依赖
  const reqPath = path.join(projectRoot, 'requirements.txt');
  if (fs.existsSync(reqPath)) {
    console.log('安装Python依赖...');
    try {
      const installProcess = spawn('pip', ['install', '-r', reqPath], {
        cwd: projectRoot,
        shell: true
      });

      installProcess.stdout.on('data', (data) => {
        console.log(`依赖安装输出: ${data.toString()}`);
      });

      installProcess.stderr.on('data', (data) => {
        console.error(`依赖安装错误: ${data.toString()}`);
      });

      installProcess.on('close', (code) => {
        console.log(`依赖安装进程退出，代码: ${code}`);
        // 依赖安装完成后执行注册脚本
        executeRegistrationScript();
      });
    } catch (err) {
      console.error(`依赖安装错误: ${err.message}`);
      // 继续执行，不影响主流程
      executeRegistrationScript();
    }
  } else {
    // 如果没有requirements.txt直接执行脚本
    executeRegistrationScript();
  }

  function executeRegistrationScript() {
    // 使用child_process.spawn执行Python脚本
    const pythonProcess = spawn('python', [registrationScriptPath], {
      cwd: projectRoot,
      shell: true
    });

    let stdoutData = '';
    let stderrData = '';
    let hasSelectedOption = false;
    let hasHandledExit = false;
    let waitingForInput = false;

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
        waitingForInput = true;
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
      if (hasHandledExit) return;
      hasHandledExit = true;

      console.log(`Python进程退出，代码: ${code}`);

      if (code !== 0 && !waitingForInput) {
        // 脚本执行失败
        res.json({
          success: false,
          error: stderrData || `脚本执行失败，退出码: ${code}`
        });
      } else {
        // 提取关键信息或使用默认消息
        let successMessage = '注册流程已完成，请重启Cursor应用以生效';

        // 尝试从输出中提取成功信息
        const successPattern = /注册成功|完成所有操作|所有操作已完成|registration.*success|all.*operations.*completed/i;

        if (successPattern.test(stdoutData)) {
          // 提取账号信息 - 改进正则表达式以匹配更多情况
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
            successMessage = `注册成功！账号: ${emailMatch[1]}, 密码: ${passwordMatch[1]}。请保存这些信息并重启Cursor应用以生效。`;
          } else if (emailMatch) {
            successMessage = `注册成功！账号: ${emailMatch[1]}。请保存此信息并重启Cursor应用以生效。`;
          }
        }

        // 脚本执行成功
        res.json({
          success: true,
          message: successMessage,
          stdout: stdoutData,
          stderr: stderrData
        });
      }
    });

    // 处理脚本执行错误
    pythonProcess.on('error', (err) => {
      if (hasHandledExit) return;
      hasHandledExit = true;

      console.error(`Python启动错误: ${err.message}`);
      res.json({
        success: false,
        error: `启动Python脚本时出错: ${err.message}`
      });
    });

    // 设置超时保护，防止进程卡住
    setTimeout(() => {
      if (!hasHandledExit) {
        hasHandledExit = true;
        try {
          pythonProcess.kill();
        } catch (e) {
          console.error(`杀死进程失败: ${e.message}`);
        }

        res.json({
          success: false,
          error: '操作超时。请检查Python环境和依赖是否正确安装，然后重试。',
          stdout: stdoutData,
          stderr: stderrData
        });
      }
    }, 15 * 60 * 1000); // 15分钟超时
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`API服务器运行在 http://localhost:${PORT}`);
}); 