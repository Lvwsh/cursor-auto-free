# Cursor Pro 自动化工具使用说明



## 在线文档
[cursor-auto-free-doc.vercel.app](https://cursor-auto-free-doc.vercel.app)


## 英文名字集
https://github.com/toniprada/usa-names-dataset

## 许可证声明
本项目采用 [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) 许可证。
这意味着您可以：
- 分享 — 在任何媒介以任何形式复制、发行本作品
但必须遵守以下条件：
- 非商业性使用 — 您不得将本作品用于商业目的

## 声明
- 本项目仅供学习交流使用，请勿用于商业用途。
- 本项目不承担任何法律责任，使用本项目造成的任何后果，由使用者自行承担。



## 骗子
海豚


## 感谢 linuxDo 这个开源社区(一个真正的技术社区)
https://linux.do/

## 特别鸣谢
本项目的开发过程中得到了众多开源项目和社区成员的支持与帮助，在此特别感谢：

### 开源项目
- [go-cursor-help](https://github.com/yuaotian/go-cursor-help) - 一个优秀的 Cursor 机器码重置工具，本项目的机器码重置功能使用该项目实现。该项目目前已获得 9.1k Stars，是最受欢迎的 Cursor 辅助工具之一。

 

## 项目功能详解

### 核心功能模块

1. **自动保活机制 (cursor_pro_keep_alive.py)**
   - 自动注册Cursor Pro账户
   - 处理验证码和Turnstile验证
   - 生成随机用户信息并注册
   - 获取和更新Cursor会话令牌

2. **机器码管理 (patch_cursor_get_machine_id.py & reset_machine.py)**
   - 修改Cursor的机器码获取机制
   - 重置机器ID以避免授权限制
   - 支持Windows、macOS和Linux系统
   - 提供备份和恢复功能

3. **邮箱验证 (get_email_code.py)**
   - 支持多种邮箱协议(IMAP和POP3)
   - 自动获取验证码
   - 支持临时邮箱和自定义邮箱
   - 重试机制确保可靠性

4. **配置管理 (config.py)**
   - 加载和验证环境变量
   - 支持临时邮箱和IMAP邮箱配置
   - 提供配置检查和错误提示

5. **认证管理 (cursor_auth_manager.py)**
   - 管理Cursor的认证信息
   - 更新访问令牌和刷新令牌
   - 跨平台支持不同操作系统

6. **浏览器自动化 (browser_utils.py)**
   - 提供浏览器控制功能
   - 支持自定义用户代理和无头模式
   - 处理网页元素和操作

7. **多语言支持 (language.py)**
   - 提供多语言翻译支持
   - 根据用户系统设置自动选择语言

8. **日志记录 (logger.py)**
   - 提供统一的日志记录功能
   - 支持不同级别的日志输出

### 辅助功能

1. **构建工具 (build.py, build.sh, build.bat, build.mac.command)**
   - 跨平台构建脚本
   - 打包应用为可执行文件

2. **退出工具 (exit_cursor.py)**
   - 安全退出Cursor程序

3. **其他工具**
   - 显示徽标 (logo.py)
   - Cursor帮助功能 (go_cursor_help.py)
   - 测试邮件功能 (test_email.py)

## 技术栈

- **编程语言**: Python 3
- **Web自动化**: DrissionPage
- **浏览器控制**: Selenium/ChromeDriver
- **邮件协议**: IMAP/POP3
- **GUI支持**: Colorama (命令行颜色)
- **环境配置**: python-dotenv
- **打包工具**: PyInstaller

## 会话总结

### 会话目的
分析Cursor Pro自动化工具的全局代码，了解实现的功能，并根据.cursorrules更新README.md文件。

### 完成的主要任务
- 查看并分析了项目中的主要Python文件
- 理解了项目的核心功能和模块
- 根据代码分析更新了README.md文件，添加了详细的功能说明

### 关键决策和解决方案
- 保留原有README.md的内容，在末尾添加详细的功能说明
- 将项目功能按模块分类详细说明
- 补充了技术栈信息

### 使用的技术栈
- Python 3（项目主要语言）
- DrissionPage（Web自动化）
- IMAP/POP3（邮件协议）
- PyInstaller（打包工具）

### 修改了哪些文件
- README.md（添加了详细的功能说明和会话总结）


