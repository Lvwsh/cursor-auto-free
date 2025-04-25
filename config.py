# 导入dotenv库，用于从.env文件加载环境变量
from dotenv import load_dotenv
# 导入操作系统功能模块，用于路径操作和环境变量访问
import os
# 导入系统相关功能模块，用于识别打包模式和获取系统信息
import sys
# 导入自定义日志模块
from logger import logging
# 导入多语言支持模块的翻译函数
from language import get_translation


class Config:
    """
    配置管理类，负责加载、验证和提供程序运行所需的各项配置
    """
    def __init__(self):
        """
        初始化配置管理类实例
        
        加载.env文件中的环境变量配置，并对配置进行基本验证
        支持两种邮箱模式：临时邮箱和IMAP邮箱
        """
        # 获取应用程序的根目录路径
        if getattr(sys, "frozen", False):
            # 如果是打包后的可执行文件
            application_path = os.path.dirname(sys.executable)
        else:
            # 如果是开发环境
            application_path = os.path.dirname(os.path.abspath(__file__))

        # 指定 .env 文件的路径
        dotenv_path = os.path.join(application_path, ".env")

        # 检查.env文件是否存在，不存在则抛出FileNotFoundError异常
        if not os.path.exists(dotenv_path):
            raise FileNotFoundError(get_translation("file_not_exists", path=dotenv_path))

        # 加载 .env 文件中的环境变量
        load_dotenv(dotenv_path)

        # 初始化imap标志为False，默认使用临时邮箱模式
        self.imap = False
        # 从环境变量获取临时邮箱的用户名部分（@前的部分）
        self.temp_mail = os.getenv("TEMP_MAIL", "").strip().split("@")[0]
        # 从环境变量获取临时邮箱的PIN码
        self.temp_mail_epin = os.getenv("TEMP_MAIL_EPIN", "").strip()
        # 从环境变量获取临时邮箱的后缀（如@mailto.plus）
        self.temp_mail_ext = os.getenv("TEMP_MAIL_EXT", "").strip()
        # 从环境变量获取域名配置
        self.domain = os.getenv("DOMAIN", "").strip()

        # 如果临时邮箱设置为null，则切换到IMAP邮箱模式
        if self.temp_mail == "null":
            # 设置imap标志为True，表示使用IMAP模式
            self.imap = True
            # 从环境变量获取IMAP服务器地址
            self.imap_server = os.getenv("IMAP_SERVER", "").strip()
            # 从环境变量获取IMAP服务器端口
            self.imap_port = os.getenv("IMAP_PORT", "").strip()
            # 从环境变量获取IMAP用户名（邮箱地址）
            self.imap_user = os.getenv("IMAP_USER", "").strip()
            # 从环境变量获取IMAP密码（授权码）
            self.imap_pass = os.getenv("IMAP_PASS", "").strip()
            # 从环境变量获取IMAP收件箱目录，默认为"inbox"
            self.imap_dir = os.getenv("IMAP_DIR", "inbox").strip()

        # 检查配置项是否有效
        self.check_config()

    def get_temp_mail(self):
        """
        获取临时邮箱用户名部分
        
        Returns:
            str: 临时邮箱用户名（@前的部分）
        """
        return self.temp_mail

    def get_temp_mail_epin(self):
        """
        获取临时邮箱PIN码
        
        Returns:
            str: 临时邮箱PIN码，用于临时邮箱的认证
        """
        return self.temp_mail_epin

    def get_temp_mail_ext(self):
        """
        获取临时邮箱后缀
        
        Returns:
            str: 临时邮箱后缀（如@mailto.plus）
        """
        return self.temp_mail_ext

    def get_imap(self):
        """
        获取IMAP配置信息
        
        Returns:
            dict or False: 如果使用IMAP模式，返回包含IMAP配置的字典；否则返回False
        """
        # 如果不是IMAP模式，返回False
        if not self.imap:
            return False
        # 返回IMAP配置字典
        return {
            "imap_server": self.imap_server,  # IMAP服务器地址
            "imap_port": self.imap_port,      # IMAP服务器端口
            "imap_user": self.imap_user,      # IMAP用户名
            "imap_pass": self.imap_pass,      # IMAP密码
            "imap_dir": self.imap_dir,        # IMAP收件箱目录
        }

    def get_domain(self):
        """
        获取域名配置
        
        Returns:
            str: 配置的域名
        """
        return self.domain

    def get_protocol(self):
        """
        获取邮件协议类型
        
        Returns:
            str: 'IMAP' 或 'POP3'，默认为'POP3'
        """
        # 从环境变量获取邮件协议类型，默认为'POP3'
        return os.getenv('IMAP_PROTOCOL', 'POP3')

    def check_config(self):
        """
        检查配置项是否有效
        
        检查规则：
        1. 如果使用 tempmail.plus，需要配置 TEMP_MAIL 和 DOMAIN
        2. 如果使用 IMAP，需要配置 IMAP_SERVER、IMAP_PORT、IMAP_USER、IMAP_PASS
        3. IMAP_DIR 是可选的
        
        Raises:
            ValueError: 如果配置项无效，抛出ValueError异常
        """
        # 基础配置检查 - 必须的配置项及其对应的错误翻译键
        required_configs = {
            "domain": "domain_not_configured",  # 域名必须配置
        }

        # 检查基础配置项是否有效
        for key, error_key in required_configs.items():
            if not self.check_is_valid(getattr(self, key)):
                # 如果配置项无效，抛出ValueError异常，使用翻译后的错误信息
                raise ValueError(get_translation(error_key))

        # 根据不同邮箱模式检查邮箱配置
        if self.temp_mail != "null":
            # 临时邮箱模式 - 检查临时邮箱配置
            if not self.check_is_valid(self.temp_mail):
                # 如果临时邮箱配置无效，抛出ValueError异常
                raise ValueError(get_translation("temp_mail_not_configured"))
        else:
            # IMAP邮箱模式 - 检查IMAP配置
            imap_configs = {
                "imap_server": "imap_server_not_configured",  # IMAP服务器必须配置
                "imap_port": "imap_port_not_configured",      # IMAP端口必须配置
                "imap_user": "imap_user_not_configured",      # IMAP用户名必须配置
                "imap_pass": "imap_pass_not_configured",      # IMAP密码必须配置
            }

            # 检查每个IMAP配置项是否有效
            for key, error_key in imap_configs.items():
                value = getattr(self, key)
                if value == "null" or not self.check_is_valid(value):
                    # 如果IMAP配置项无效，抛出ValueError异常
                    raise ValueError(get_translation(error_key))

            # IMAP_DIR是可选的，如果设置了则检查其有效性
            if self.imap_dir != "null" and not self.check_is_valid(self.imap_dir):
                # 如果IMAP收件箱目录无效，抛出ValueError异常
                raise ValueError(get_translation("imap_dir_invalid"))

    def check_is_valid(self, value):
        """
        检查配置项是否有效
        
        有效的配置项必须是字符串类型且非空
        
        Args:
            value: 配置项的值
            
        Returns:
            bool: 配置项是否有效
        """
        # 检查值是否为字符串类型且非空
        return isinstance(value, str) and len(str(value).strip()) > 0

    def print_config(self):
        """
        打印当前配置信息到日志
        
        根据不同邮箱模式，打印不同的配置信息
        """
        # 如果是IMAP模式，打印IMAP配置信息
        if self.imap:
            # 打印IMAP服务器地址
            logging.info(get_translation("imap_server", server=self.imap_server))
            # 打印IMAP服务器端口
            logging.info(get_translation("imap_port", port=self.imap_port))
            # 打印IMAP用户名
            logging.info(get_translation("imap_username", username=self.imap_user))
            # 打印IMAP密码（以星号代替，保护隐私）
            logging.info(get_translation("imap_password", password='*' * len(self.imap_pass)))
            # 打印IMAP收件箱目录
            logging.info(get_translation("imap_inbox_dir", dir=self.imap_dir))
        # 如果是临时邮箱模式，打印临时邮箱配置信息
        if self.temp_mail != "null":
            # 打印临时邮箱地址（用户名+后缀）
            logging.info(get_translation("temp_mail", mail=f"{self.temp_mail}{self.temp_mail_ext}"))
        # 无论哪种模式，都打印域名配置
        logging.info(get_translation("domain", domain=self.domain))


# 直接运行这个脚本时的行为
if __name__ == "__main__":
    try:
        # 创建配置实例，加载配置
        config = Config()
        # 打印环境变量加载成功的消息
        print(get_translation("env_variables_loaded"))
        # 打印当前配置信息
        config.print_config()
    except ValueError as e:
        # 捕获并打印配置错误，使用翻译后的错误前缀
        print(get_translation("error_prefix", error=e))
