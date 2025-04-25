# 导入系统平台识别模块
import platform
# 导入操作系统功能模块
import os
# 导入子进程管理模块，用于执行shell命令
import subprocess
# 导入自定义日志模块
from logger import logging
# 导入多语言支持模块的翻译函数
from language import get_translation

def go_cursor_help():
    """
    调用go-cursor-help项目的脚本来修改Cursor的机器ID
    
    根据不同操作系统执行相应的命令
    
    Returns:
        bool: 操作是否成功完成
    """
    # 获取当前操作系统类型
    system = platform.system()
    # 记录日志，显示当前操作系统
    logging.info(get_translation("current_operating_system", system=system))
    
    # 基础URL，使用aizaozao.com进行加速访问GitHub原始文件
    base_url = "https://aizaozao.com/accelerate.php/https://raw.githubusercontent.com/yuaotian/go-cursor-help/refs/heads/master/scripts/run"
    
    # 根据不同操作系统执行不同的命令
    if system == "Darwin":  # macOS
        # 构建macOS命令 - 下载脚本并使用sudo权限执行
        cmd = f'curl -k -fsSL {base_url}/cursor_mac_id_modifier.sh | sudo bash'
        # 记录日志，显示正在执行macOS命令
        logging.info(get_translation("executing_macos_command"))
        # 执行shell命令
        os.system(cmd)
    elif system == "Linux":
        # 构建Linux命令 - 下载脚本并使用sudo权限执行
        cmd = f'curl -fsSL {base_url}/cursor_linux_id_modifier.sh | sudo bash'
        # 记录日志，显示正在执行Linux命令
        logging.info(get_translation("executing_linux_command"))
        # 执行shell命令
        os.system(cmd)
    elif system == "Windows":
        # 构建Windows PowerShell命令 - 下载脚本并执行
        cmd = f'irm {base_url}/cursor_win_id_modifier.ps1 | iex'
        # 记录日志，显示正在执行Windows命令
        logging.info(get_translation("executing_windows_command"))
        # 使用PowerShell执行命令，通过subprocess模块调用
        subprocess.run(["powershell", "-Command", cmd], shell=True)
    else:
        # 如果是不支持的操作系统，记录错误日志
        logging.error(get_translation("unsupported_operating_system", system=system))
        # 返回False表示执行失败
        return False
    
    # 返回True表示执行成功
    return True

def main():
    """
    主函数，调用go_cursor_help函数执行机器ID修改操作
    """
    # 调用go_cursor_help函数
    go_cursor_help()

# 如果直接运行此脚本（而非作为模块导入），则执行main函数
if __name__ == "__main__":
    main()