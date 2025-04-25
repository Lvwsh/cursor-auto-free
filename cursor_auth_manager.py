# 导入sqlite3模块，用于操作SQLite数据库
import sqlite3
# 导入操作系统功能模块，用于文件路径操作
import os
# 导入系统相关功能模块，用于识别操作系统类型
import sys


class CursorAuthManager:
    """
    Cursor认证信息管理器
    
    负责管理和更新Cursor编辑器的认证信息，包括邮箱、访问令牌和刷新令牌
    支持Windows、macOS和Linux系统
    """

    def __init__(self):
        """
        初始化CursorAuthManager实例
        
        根据不同操作系统，确定Cursor认证数据库的路径
        """
        # 判断操作系统类型，为不同系统设置不同的数据库路径
        if sys.platform == "win32":  # Windows系统
            # 获取Windows的APPDATA环境变量，这是应用程序数据的标准位置
            appdata = os.getenv("APPDATA")
            # 如果APPDATA环境变量未设置，则抛出环境错误
            if appdata is None:
                raise EnvironmentError("APPDATA 环境变量未设置")
            # 构建Windows系统下Cursor状态数据库的完整路径
            self.db_path = os.path.join(
                appdata, "Cursor", "User", "globalStorage", "state.vscdb"
            )
        elif sys.platform == "darwin": # macOS系统
            # 构建macOS系统下Cursor状态数据库的完整路径
            self.db_path = os.path.abspath(os.path.expanduser(
                "~/Library/Application Support/Cursor/User/globalStorage/state.vscdb"
            ))
        elif sys.platform == "linux" : # Linux和其他类Unix系统
            # 构建Linux系统下Cursor状态数据库的完整路径
            self.db_path = os.path.abspath(os.path.expanduser(
                "~/.config/Cursor/User/globalStorage/state.vscdb"
            ))
        else:
            # 如果是不支持的操作系统，抛出NotImplementedError异常
            raise NotImplementedError(f"不支持的操作系统: {sys.platform}")

    def update_auth(self, email=None, access_token=None, refresh_token=None):
        """
        更新Cursor的认证信息
        
        Args:
            email (str, optional): 新的邮箱地址
            access_token (str, optional): 新的访问令牌
            refresh_token (str, optional): 新的刷新令牌
            
        Returns:
            bool: 是否成功更新认证信息
        """
        # 创建一个空列表，用于存储需要更新的认证信息
        updates = []
        # 添加登录状态信息，设置为"Auth_0"表示已登录
        updates.append(("cursorAuth/cachedSignUpType", "Auth_0"))

        # 如果提供了email参数，将其添加到更新列表中
        if email is not None:
            updates.append(("cursorAuth/cachedEmail", email))
        # 如果提供了access_token参数，将其添加到更新列表中
        if access_token is not None:
            updates.append(("cursorAuth/accessToken", access_token))
        # 如果提供了refresh_token参数，将其添加到更新列表中
        if refresh_token is not None:
            updates.append(("cursorAuth/refreshToken", refresh_token))

        # 如果更新列表为空（没有任何要更新的值），则打印提示并返回False
        if not updates:
            print("没有提供任何要更新的值")
            return False

        # 初始化数据库连接为None
        conn = None
        try:
            # 连接到Cursor的SQLite数据库
            conn = sqlite3.connect(self.db_path)
            # 创建数据库游标对象，用于执行SQL命令
            cursor = conn.cursor()

            # 遍历更新列表中的每个键值对
            for key, value in updates:
                # 检查键是否存在于数据库中
                check_query = f"SELECT COUNT(*) FROM itemTable WHERE key = ?"
                # 执行SQL查询，检查键是否存在
                cursor.execute(check_query, (key,))
                # 如果键不存在（计数为0），则执行插入操作
                if cursor.fetchone()[0] == 0:
                    # 准备插入SQL语句
                    insert_query = "INSERT INTO itemTable (key, value) VALUES (?, ?)"
                    # 执行插入操作
                    cursor.execute(insert_query, (key, value))
                else:
                    # 如果键已存在，则执行更新操作
                    update_query = "UPDATE itemTable SET value = ? WHERE key = ?"
                    # 执行更新操作
                    cursor.execute(update_query, (value, key))

                # 检查操作是否成功（受影响的行数大于0）
                if cursor.rowcount > 0:
                    # 打印成功更新的键名
                    print(f"成功更新 {key.split('/')[-1]}")
                else:
                    # 打印未找到或未变化的键名
                    print(f"未找到 {key.split('/')[-1]} 或值未变化")

            # 提交数据库事务，确保更改被保存
            conn.commit()
            # 所有操作成功，返回True
            return True

        except sqlite3.Error as e:
            # 捕获并打印SQLite数据库错误
            print("数据库错误:", str(e))
            # 发生数据库错误，返回False
            return False
        except Exception as e:
            # 捕获并打印其他类型的错误
            print("发生错误:", str(e))
            # 发生其他错误，返回False
            return False
        finally:
            # 在finally块中关闭数据库连接，确保无论是否发生异常都会关闭连接
            if conn:
                conn.close()
