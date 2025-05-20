# 导入所需的Python标准库
import warnings  # 用于处理警告信息
import os       # 用于操作系统相关功能
import platform # 用于获取系统平台信息
import subprocess  # 用于执行系统命令
import time     # 用于时间相关操作
import threading  # 用于多线程操作

# 忽略DrissionPage模块中的特定SyntaxWarning警告
warnings.filterwarnings("ignore", category=SyntaxWarning, module="DrissionPage")

# 定义加载动画类
class LoadingAnimation:
    def __init__(self):
        # 初始化动画运行状态和线程
        self.is_running = False
        self.animation_thread = None

    def start(self, message="Building"):
        # 启动加载动画
        self.is_running = True
        self.animation_thread = threading.Thread(target=self._animate, args=(message,))
        self.animation_thread.start()

    def stop(self):
        # 停止加载动画
        self.is_running = False
        if self.animation_thread:
            self.animation_thread.join()
        # 清除动画显示的行
        print("\r" + " " * 70 + "\r", end="", flush=True)

    def _animate(self, message):
        # 实现动画效果
        animation = "|/-\\"  # 动画字符序列
        idx = 0
        while self.is_running:
            # 显示旋转动画
            print(f"\r{message} {animation[idx % len(animation)]}", end="", flush=True)
            idx += 1
            time.sleep(0.1)  # 控制动画速度

# 显示进度条的函数
def progress_bar(progress, total, prefix="", length=50):
    # 计算进度条填充长度
    filled = int(length * progress // total)
    # 创建进度条字符串
    bar = "█" * filled + "░" * (length - filled)
    # 计算百分比
    percent = f"{100 * progress / total:.1f}"
    # 打印进度条
    print(f"\r{prefix} |{bar}| {percent}% Complete", end="", flush=True)
    if progress == total:
        print()

# 模拟进度的函数
def simulate_progress(message, duration=1.0, steps=20):
    # 使用蓝色打印消息
    print(f"\033[94m{message}\033[0m")
    # 模拟进度
    for i in range(steps + 1):
        time.sleep(duration / steps)
        progress_bar(i, steps, prefix="Progress:", length=40)

# 过滤输出信息的函数
def filter_output(output):
    """过滤并只保留重要的输出信息"""
    if not output:
        return ""
    important_lines = []
    for line in output.split("\n"):
        # 只保留包含特定关键词的行
        if any(
            keyword in line.lower()
            for keyword in ["error:", "failed:", "completed", "directory:"]
        ):
            important_lines.append(line)
    return "\n".join(important_lines)

# 主构建函数
def build():
    # 清屏
    os.system("cls" if platform.system().lower() == "windows" else "clear")

    # 获取系统类型
    system = platform.system().lower()
    # 设置spec文件路径
    spec_file = os.path.join("CursorKeepAlive.spec")

    # 设置输出目录
    output_dir = f"dist/{system if system != 'darwin' else 'mac'}"

    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)
    simulate_progress("Creating output directory...", 0.5)

    # 构建PyInstaller命令
    pyinstaller_command = [
        "pyinstaller",
        spec_file,
        "--distpath",
        output_dir,
        "--workpath",
        f"build/{system}",
        "--noconfirm",
    ]

    # 创建加载动画实例
    loading = LoadingAnimation()
    try:
        # 显示构建进度
        simulate_progress("Running PyInstaller...", 2.0)
        loading.start("Building in progress")
        # 执行PyInstaller命令
        result = subprocess.run(
            pyinstaller_command, check=True, capture_output=True, text=True
        )
        loading.stop()

        # 处理错误输出
        if result.stderr:
            # 过滤重要的错误信息
            filtered_errors = [
                line
                for line in result.stderr.split("\n")
                if any(
                    keyword in line.lower()
                    for keyword in ["error:", "failed:", "completed", "directory:"]
                )
            ]
            if filtered_errors:
                print("\033[93mBuild Warnings/Errors:\033[0m")
                print("\n".join(filtered_errors))

    except subprocess.CalledProcessError as e:
        # 处理构建失败的情况
        loading.stop()
        print(f"\033[91mBuild failed with error code {e.returncode}\033[0m")
        if e.stderr:
            print("\033[91mError Details:\033[0m")
            print(e.stderr)
        return
    except FileNotFoundError:
        # 处理PyInstaller未安装的情况
        loading.stop()
        print(
            "\033[91mError: Please ensure PyInstaller is installed (pip install pyinstaller)\033[0m"
        )
        return
    except KeyboardInterrupt:
        # 处理用户中断的情况
        loading.stop()
        print("\n\033[91mBuild cancelled by user\033[0m")
        return
    finally:
        # 确保停止加载动画
        loading.stop()

    # 复制配置文件
    if os.path.exists("config.ini.example"):
        simulate_progress("Copying configuration file...", 0.5)
        if system == "windows":
            # Windows系统使用copy命令
            subprocess.run(
                ["copy", "config.ini.example", f"{output_dir}\\config.ini"], shell=True
            )
        else:
            # Unix系统使用cp命令
            subprocess.run(["cp", "config.ini.example", f"{output_dir}/config.ini"])

    # 复制环境配置文件
    if os.path.exists(".env.example"):
        simulate_progress("Copying environment file...", 0.5)
        if system == "windows":
            # Windows系统使用copy命令
            subprocess.run(["copy", ".env.example", f"{output_dir}\\.env"], shell=True)
        else:
            # Unix系统使用cp命令
            subprocess.run(["cp", ".env.example", f"{output_dir}/.env"])

    # 打印构建完成信息
    print(
        f"\n\033[92mBuild completed successfully! Output directory: {output_dir}\033[0m"
    )

# 程序入口点
if __name__ == "__main__":
    build()
