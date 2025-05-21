# 导入操作系统相关功能模块
import os
# 导入系统功能模块
import sys
# 导入JSON数据处理模块
import json
# 导入UUID生成模块
import uuid
# 导入哈希加密模块
import hashlib
# 导入文件操作模块
import shutil
# 导入命令行颜色处理模块
from colorama import Fore, Style, init
import io

# 初始化命令行颜色支持
init()

# 定义程序中使用的表情符号常量
EMOJI = {
    "FILE": "[文件]",    # 文件图标
    "BACKUP": "[备份]",  # 备份图标
    "SUCCESS": "[成功]", # 成功图标
    "ERROR": "[错误]",   # 错误图标
    "INFO": "[信息]",    # 信息图标
    "RESET": "[重置]",   # 重置图标
}

# sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='gbk')

if os.name == 'nt':
    import ctypes
    ctypes.windll.kernel32.SetConsoleOutputCP(65001)

# 定义机器ID重置器类
class MachineIDResetter:
    def __init__(self):
        # 判断当前操作系统类型
        if sys.platform == "win32":  # Windows系统
            # 获取Windows系统的APPDATA环境变量
            appdata = os.getenv("APPDATA")
            # 如果APPDATA环境变量未设置，抛出错误
            if appdata is None:
                raise EnvironmentError("APPDATA 环境变量未设置")
            # 设置Windows系统下Cursor配置文件的路径
            self.db_path = os.path.join(
                appdata, "Cursor", "User", "globalStorage", "storage.json"
            )
        elif sys.platform == "darwin":  # macOS系统
            # 设置macOS系统下Cursor配置文件的路径
            self.db_path = os.path.abspath(
                os.path.expanduser(
                    "~/Library/Application Support/Cursor/User/globalStorage/storage.json"
                )
            )
        elif sys.platform == "linux":  # Linux系统
            # 设置Linux系统下Cursor配置文件的路径
            self.db_path = os.path.abspath(
                os.path.expanduser("~/.config/Cursor/User/globalStorage/storage.json")
            )
        else:
            # 如果是不支持的操作系统，抛出错误
            raise NotImplementedError(f"不支持的操作系统: {sys.platform}")

    # 生成新的机器标识
    def generate_new_ids(self):
        """生成新的机器ID"""
        # 生成新的设备UUID
        dev_device_id = str(uuid.uuid4())

        # 生成新的机器ID（64位十六进制）
        machine_id = hashlib.sha256(os.urandom(32)).hexdigest()

        # 生成新的Mac机器ID（128位十六进制）
        mac_machine_id = hashlib.sha512(os.urandom(64)).hexdigest()

        # 生成新的SQM ID（大写的UUID）
        sqm_id = "{" + str(uuid.uuid4()).upper() + "}"

        # 返回包含所有新生成ID的字典
        return {
            "telemetry.devDeviceId": dev_device_id,
            "telemetry.macMachineId": mac_machine_id,
            "telemetry.machineId": machine_id,
            "telemetry.sqmId": sqm_id,
        }

    # 重置机器ID的主方法
    def reset_machine_ids(self):
        """重置机器ID并备份原文件"""
        try:
            # 打印检查配置文件的提示信息
            print(f"{Fore.CYAN}{EMOJI['INFO']} 正在检查配置文件...{Style.RESET_ALL}")

            # 检查配置文件是否存在
            if not os.path.exists(self.db_path):
                # 如果文件不存在，打印错误信息
                print(
                    f"{Fore.RED}{EMOJI['ERROR']} 配置文件不存在: {self.db_path}{Style.RESET_ALL}"
                )
                return False

            # 检查文件的读写权限
            if not os.access(self.db_path, os.R_OK | os.W_OK):
                # 如果没有读写权限，打印错误信息
                print(
                    f"{Fore.RED}{EMOJI['ERROR']} 无法读写配置文件，请检查文件权限！{Style.RESET_ALL}"
                )
                print(
                    f"{Fore.RED}{EMOJI['ERROR']} 如果你使用过 go-cursor-help 来修改 ID; 请修改文件只读权限 {self.db_path} {Style.RESET_ALL}"
                )
                return False


            

            # 读取现有配置文件
            print(f"{Fore.CYAN}{EMOJI['FILE']} 读取当前配置...{Style.RESET_ALL}")
            with open(self.db_path, "r", encoding="utf-8") as f:
                config = json.load(f)

            # 生成新的机器标识
            print(f"{Fore.CYAN}{EMOJI['RESET']} 生成新的机器标识...{Style.RESET_ALL}")
            new_ids = self.generate_new_ids()

            #print(f"{Fore.CYAN}{EMOJI['ERROR']} 配置文件路径： {self.db_path}{Style.RESET_ALL}")"""


            # 更新配置文件中的ID
            config.update(new_ids)

            # 保存新的配置到文件
            print(f"{Fore.CYAN}{EMOJI['FILE']} 保存新配置...{Style.RESET_ALL}")
            with open(self.db_path, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=4)

            # 打印重置成功的消息
            print(f"{Fore.GREEN}{EMOJI['SUCCESS']} 机器标识重置成功！{Style.RESET_ALL}")
            # 打印新的机器标识信息
            print(f"\n{Fore.CYAN}新的机器标识:{Style.RESET_ALL}")
            for key, value in new_ids.items():
                print(f"{EMOJI['INFO']} {key}: {Fore.GREEN}{value}{Style.RESET_ALL}")

            return True

        # 处理权限错误异常
        except PermissionError as e:
            # 打印权限错误信息
            print(f"{Fore.RED}{EMOJI['ERROR']} 权限错误: {str(e)}{Style.RESET_ALL}")
            # 提示用户使用管理员权限运行
            print(
                f"{Fore.YELLOW}{EMOJI['INFO']} 请尝试以管理员身份运行此程序{Style.RESET_ALL}"
            )
            return False
        # 处理其他异常
        except Exception as e:
            # 打印错误信息
            print(f"{Fore.RED}{EMOJI['ERROR']} 重置过程出错: {str(e)}{Style.RESET_ALL}")
            return False


# 如果直接运行此文件（不是被导入）
if __name__ == "__main__":
    # 打印程序标题
    print(f"\n{Fore.CYAN}{'='*50}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{EMOJI['RESET']} Cursor 机器标识重置工具{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*50}{Style.RESET_ALL}")

    # 创建重置器实例并执行重置
    resetter = MachineIDResetter()
    resetter.reset_machine_ids()

    # 打印结束分隔线并等待用户按回车键退出
    print(f"\n{Fore.CYAN}{'='*50}{Style.RESET_ALL}")

