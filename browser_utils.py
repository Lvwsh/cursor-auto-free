# 从DrissionPage库导入ChromiumOptions和Chromium类，用于浏览器配置和操作
from DrissionPage import ChromiumOptions, Chromium
# 导入系统相关功能模块，用于获取系统信息
import sys
# 导入操作系统功能模块，用于文件路径操作
import os
# 导入日志模块，用于记录浏览器相关信息
import logging
# 导入dotenv库，用于从.env文件加载环境变量
from dotenv import load_dotenv

# 加载.env文件中的环境变量
load_dotenv()


class BrowserManager:
    """
    浏览器管理类，负责创建、配置和管理浏览器实例
    """
    def __init__(self):
        """
        初始化BrowserManager类的实例
        """
        # 初始化浏览器实例为None
        self.browser = None

    def init_browser(self, user_agent=None):
        """
        初始化浏览器实例
        
        Args:
            user_agent (str, optional): 自定义用户代理字符串
            
        Returns:
            Chromium: 初始化后的浏览器实例
        """
        # 获取浏览器配置选项
        co = self._get_browser_options(user_agent)
        # 使用配置选项创建Chromium浏览器实例
        self.browser = Chromium(co)
        # 返回创建的浏览器实例
        return self.browser

    def _get_browser_options(self, user_agent=None):
        """
        获取浏览器配置选项
        
        Args:
            user_agent (str, optional): 自定义用户代理字符串
            
        Returns:
            ChromiumOptions: 配置好的浏览器选项
        """
        # 创建ChromiumOptions实例
        co = ChromiumOptions()
        try:
            # 获取Turnstile绕过插件的路径
            extension_path = self._get_extension_path("turnstilePatch")
            # 添加插件到浏览器
            co.add_extension(extension_path)
        except FileNotFoundError as e:
            # 如果找不到插件，记录警告日志
            logging.warning(f"警告: {e}")

        # 从环境变量获取自定义浏览器路径（如Edge等）
        browser_path = os.getenv("BROWSER_PATH")
        if browser_path:
            # 如果有自定义浏览器路径，设置浏览器路径
            co.set_paths(browser_path=browser_path)

        # 禁用凭据保存服务
        co.set_pref("credentials_enable_service", False)
        # 隐藏崩溃恢复气泡
        co.set_argument("--hide-crash-restore-bubble")
        # 从环境变量获取代理设置
        proxy = os.getenv("BROWSER_PROXY")
        if proxy:
            # 如果有代理设置，配置浏览器使用代理
            co.set_proxy(proxy)

        # 自动选择可用端口，避免端口冲突
        co.auto_port()
        if user_agent:
            # 如果提供了用户代理，设置浏览器的用户代理
            co.set_user_agent(user_agent)

        # 根据环境变量配置是否使用无头模式（默认为True）
        co.headless(
            os.getenv("BROWSER_HEADLESS", "True").lower() == "true"
        )  # 生产环境使用无头模式

        # Mac 系统特殊处理
        if sys.platform == "darwin":
            # 在macOS上禁用沙盒，避免权限问题
            co.set_argument("--no-sandbox")
            # 在macOS上禁用GPU加速，避免渲染问题
            co.set_argument("--disable-gpu")

        # 返回配置好的浏览器选项
        return co

    def _get_extension_path(self, exname='turnstilePatch'):
        """
        获取浏览器插件的路径
        
        Args:
            exname (str, optional): 插件目录名，默认为'turnstilePatch'
            
        Returns:
            str: 插件的完整路径
            
        Raises:
            FileNotFoundError: 如果插件不存在
        """
        # 获取当前工作目录
        root_dir = os.getcwd()
        # 构建插件路径
        extension_path = os.path.join(root_dir, exname)

        # 如果是通过PyInstaller打包的版本，使用特殊的路径
        if hasattr(sys, "_MEIPASS"):
            extension_path = os.path.join(sys._MEIPASS, exname)

        # 检查插件路径是否存在
        if not os.path.exists(extension_path):
            # 如果插件不存在，抛出FileNotFoundError异常
            raise FileNotFoundError(f"插件不存在: {extension_path}")

        # 返回插件的完整路径
        return extension_path

    def quit(self):
        """
        关闭浏览器实例
        """
        # 检查浏览器实例是否存在
        if self.browser:
            try:
                # 尝试关闭浏览器
                self.browser.quit()
            except:
                # 忽略关闭过程中可能发生的任何异常
                pass
