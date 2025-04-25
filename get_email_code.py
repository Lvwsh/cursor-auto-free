# 导入处理日期时间的模块
from datetime import datetime
# 导入日志记录模块
import logging
# 导入时间处理模块
import time
# 导入正则表达式模块
import re
# 导入配置模块
from config import Config
# 导入HTTP请求模块
import requests
# 导入电子邮件处理模块
import email
# 导入IMAP邮件协议模块
import imaplib
# 导入POP3邮件协议模块
import poplib
# 导入邮件解析器模块
from email.parser import Parser


# 定义邮件验证处理类
class EmailVerificationHandler:
    # 初始化方法，设置邮件处理所需的基本参数
    def __init__(self,account):
        # 从配置中获取IMAP服务器设置
        self.imap = Config().get_imap()
        # 从配置中获取临时邮箱用户名
        self.username = Config().get_temp_mail()
        # 从配置中获取临时邮箱PIN码
        self.epin = Config().get_temp_mail_epin()
        # 创建HTTP会话对象
        self.session = requests.Session()
        # 从配置中获取临时邮箱扩展名
        self.emailExtension = Config().get_temp_mail_ext()
        # 获取邮件协议类型，默认为POP3
        self.protocol = Config().get_protocol() or 'POP3'
        # 存储账户信息
        self.account = account

    # 获取验证码的主方法，包含重试机制
    def get_verification_code(self, max_retries=5, retry_interval=60):
        """
        # 获取验证码的方法说明
        Args:
            max_retries: 最大重试次数
            retry_interval: 重试间隔时间（秒）

        Returns:
            验证码 (字符串或 None)
        """

        # 循环尝试获取验证码，最多重试max_retries次
        for attempt in range(max_retries):
            try:
                # 记录当前尝试次数的日志
                logging.info(f"尝试获取验证码 (第 {attempt + 1}/{max_retries} 次)...")

                # 如果没有IMAP配置，使用临时邮箱API获取验证码
                if not self.imap:
                    # 获取最新邮件中的验证码和邮件ID
                    verify_code, first_id = self._get_latest_mail_code()
                    # 如果成功获取验证码和邮件ID
                    if verify_code is not None and first_id is not None:
                        # 清理已使用的邮件
                        self._cleanup_mail(first_id)
                        # 返回验证码
                        return verify_code
                else:
                    # 根据配置的协议类型选择不同的邮件获取方式
                    if self.protocol.upper() == 'IMAP':
                        # 使用IMAP协议获取验证码
                        verify_code = self._get_mail_code_by_imap()
                    else:
                        # 使用POP3协议获取验证码
                        verify_code = self._get_mail_code_by_pop3()
                    # 如果成功获取验证码则返回
                    if verify_code is not None:
                        return verify_code

                # 如果不是最后一次尝试，则等待指定时间后重试
                if attempt < max_retries - 1:
                    # 记录等待重试的日志
                    logging.warning(f"未获取到验证码，{retry_interval} 秒后重试...")
                    # 等待重试间隔时间
                    time.sleep(retry_interval)

            # 异常处理
            except Exception as e:
                # 记录错误日志
                logging.error(f"获取验证码失败: {e}")
                # 如果不是最后一次尝试，则等待后重试
                if attempt < max_retries - 1:
                    # 记录错误重试日志
                    logging.error(f"发生错误，{retry_interval} 秒后重试...")
                    # 等待重试间隔时间
                    time.sleep(retry_interval)
                else:
                    # 如果是最后一次尝试，抛出异常
                    raise Exception(f"获取验证码失败且已达最大重试次数: {e}") from e

        # 如果所有重试都失败，抛出异常
        raise Exception(f"经过 {max_retries} 次尝试后仍未获取到验证码。")

    # 使用IMAP协议获取邮件中的验证码
    def _get_mail_code_by_imap(self, retry = 0):
        # 如果是重试，则等待3秒
        if retry > 0:
            time.sleep(3)
        # 如果重试次数超过20次，抛出超时异常
        if retry >= 20:
            raise Exception("获取验证码超时")
        try:
            # 连接到IMAP服务器
            mail = imaplib.IMAP4_SSL(self.imap['imap_server'], self.imap['imap_port'])
            # 登录邮箱
            mail.login(self.imap['imap_user'], self.imap['imap_pass'])
            # 初始化按日期搜索标志
            search_by_date=False
            # 处理网易系邮箱的特殊要求
            if self.imap['imap_user'].endswith(('@163.com', '@126.com', '@yeah.net')):                
                # 设置网易邮箱需要的ID信息
                imap_id = ("name", self.imap['imap_user'].split('@')[0], "contact", self.imap['imap_user'], "version", "1.0.0", "vendor", "imaplib")
                # 发送ID命令
                mail.xatom('ID', '("' + '" "'.join(imap_id) + '")')
                # 设置为按日期搜索
                search_by_date=True
            # 选择邮箱文件夹
            mail.select(self.imap['imap_dir'])
            # 如果是按日期搜索
            if search_by_date:
                # 获取当前日期
                date = datetime.now().strftime("%d-%b-%Y")
                # 搜索当天的未读邮件
                status, messages = mail.search(None, f'ON {date} UNSEEN')
            else:
                # 搜索发送给指定账户的邮件
                status, messages = mail.search(None, 'TO', '"'+self.account+'"')
            # 如果搜索状态不成功，返回None
            if status != 'OK':
                return None

            # 获取邮件ID列表
            mail_ids = messages[0].split()
            # 如果没有邮件，递归重试
            if not mail_ids:
                return self._get_mail_code_by_imap(retry=retry + 1)

            # 从最新的邮件开始处理
            for mail_id in reversed(mail_ids):
                # 获取邮件内容
                status, msg_data = mail.fetch(mail_id, '(RFC822)')
                # 如果获取失败，继续下一封
                if status != 'OK':
                    continue
                # 获取原始邮件数据
                raw_email = msg_data[0][1]
                # 解析邮件消息
                email_message = email.message_from_bytes(raw_email)

                # 如果是按日期搜索，验证收件人地址
                if search_by_date and email_message['to'] !=self.account:
                    continue
                # 提取邮件正文
                body = self._extract_imap_body(email_message)
                if body:
                    # 移除可能包含验证码的域名
                    body = body.replace(self.account, '')
                    # 查找6位数字验证码
                    code_match = re.search(r"\b\d{6}\b", body)
                    if code_match:
                        # 提取验证码
                        code = code_match.group()
                        # 标记邮件为删除
                        mail.store(mail_id, '+FLAGS', '\\Deleted')
                        # 执行删除操作
                        mail.expunge()
                        # 登出邮箱
                        mail.logout()
                        # 返回验证码
                        return code
            # 登出邮箱
            mail.logout()
            # 如果没找到验证码返回None
            return None
        # 异常处理
        except Exception as e:
            # 打印错误信息
            print(f"发生错误: {e}")
            # 返回None
            return None

    # 从IMAP邮件中提取正文内容
    def _extract_imap_body(self, email_message):
        # 如果是多部分邮件
        if email_message.is_multipart():
            # 遍历邮件的每个部分
            for part in email_message.walk():
                # 获取内容类型
                content_type = part.get_content_type()
                # 获取内容处理方式
                content_disposition = str(part.get("Content-Disposition"))
                # 如果是纯文本且不是附件
                if content_type == "text/plain" and "attachment" not in content_disposition:
                    # 获取字符编码，默认utf-8
                    charset = part.get_content_charset() or 'utf-8'
                    try:
                        # 解码邮件内容
                        body = part.get_payload(decode=True).decode(charset, errors='ignore')
                        # 返回解码后的内容
                        return body
                    except Exception as e:
                        # 记录解码失败日志
                        logging.error(f"解码邮件正文失败: {e}")
        else:
            # 如果不是多部分邮件
            content_type = email_message.get_content_type()
            # 如果是纯文本
            if content_type == "text/plain":
                # 获取字符编码，默认utf-8
                charset = email_message.get_content_charset() or 'utf-8'
                try:
                    # 解码邮件内容
                    body = email_message.get_payload(decode=True).decode(charset, errors='ignore')
                    # 返回解码后的内容
                    return body
                except Exception as e:
                    # 记录解码失败日志
                    logging.error(f"解码邮件正文失败: {e}")
        # 如果无法提取内容返回空字符串
        return ""

    # 使用POP3协议获取邮件中的验证码
    def _get_mail_code_by_pop3(self, retry = 0):
        # 如果是重试，等待3秒
        if retry > 0:
            time.sleep(3)
        # 如果重试次数超过20次，抛出超时异常
        if retry >= 20:
            raise Exception("获取验证码超时")
        
        # 初始化POP3连接为None
        pop3 = None
        try:
            # 连接到POP3服务器
            pop3 = poplib.POP3_SSL(self.imap['imap_server'], int(self.imap['imap_port']))
            # 登录用户名
            pop3.user(self.imap['imap_user'])
            # 登录密码
            pop3.pass_(self.imap['imap_pass'])
            
            # 获取邮箱中的邮件数量
            num_messages = len(pop3.list()[1])
            # 遍历最新的10封邮件
            for i in range(num_messages, max(1, num_messages-9), -1):
                # 获取邮件内容
                response, lines, octets = pop3.retr(i)
                # 将邮件内容解码为字符串
                msg_content = b'\r\n'.join(lines).decode('utf-8')
                # 解析邮件内容
                msg = Parser().parsestr(msg_content)
                
                # 检查发件人是否是Cursor
                if 'no-reply@cursor.sh' in msg.get('From', ''):
                    # 提取邮件正文
                    body = self._extract_pop3_body(msg)
                    if body:
                        # 查找验证码
                        code_match = re.search(r"\b\d{6}\b", body)
                        if code_match:
                            # 提取验证码
                            code = code_match.group()
                            # 关闭POP3连接
                            pop3.quit()
                            # 返回验证码
                            return code
            
            # 关闭POP3连接
            pop3.quit()
            # 如果没找到验证码，递归重试
            return self._get_mail_code_by_pop3(retry=retry + 1)
            
        # 异常处理
        except Exception as e:
            # 打印错误信息
            print(f"发生错误: {e}")
            # 如果POP3连接存在
            if pop3:
                try:
                    # 尝试关闭连接
                    pop3.quit()
                except:
                    pass
            # 返回None
            return None

    # 从POP3邮件中提取正文内容
    def _extract_pop3_body(self, email_message):
        # 如果是多部分邮件
        if email_message.is_multipart():
            # 遍历邮件的每个部分
            for part in email_message.walk():
                # 获取内容类型
                content_type = part.get_content_type()
                # 获取内容处理方式
                content_disposition = str(part.get("Content-Disposition"))
                # 如果是纯文本且不是附件
                if content_type == "text/plain" and "attachment" not in content_disposition:
                    try:
                        # 解码邮件内容
                        body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                        # 返回解码后的内容
                        return body
                    except Exception as e:
                        # 记录解码失败日志
                        logging.error(f"解码邮件正文失败: {e}")
        else:
            try:
                # 如果不是多部分邮件，直接解码内容
                body = email_message.get_payload(decode=True).decode('utf-8', errors='ignore')
                # 返回解码后的内容
                return body
            except Exception as e:
                # 记录解码失败日志
                logging.error(f"解码邮件正文失败: {e}")
        # 如果无法提取内容返回空字符串
        return ""

    # 从临时邮箱API获取最新邮件中的验证码
    def _get_latest_mail_code(self):
        # 构造获取邮件列表的URL
        mail_list_url = f"https://tempmail.plus/api/mails?email={self.username}{self.emailExtension}&limit=20&epin={self.epin}"
        # 发送GET请求获取邮件列表
        mail_list_response = self.session.get(mail_list_url)
        # 解析响应JSON数据
        mail_list_data = mail_list_response.json()
        # 等待0.5秒
        time.sleep(0.5)
        # 如果没有结果返回None
        if not mail_list_data.get("result"):
            return None, None

        # 获取最新邮件的ID
        first_id = mail_list_data.get("first_id")
        # 如果没有邮件ID返回None
        if not first_id:
            return None, None

        # 构造获取邮件详情的URL
        mail_detail_url = f"https://tempmail.plus/api/mails/{first_id}?email={self.username}{self.emailExtension}&epin={self.epin}"
        # 发送GET请求获取邮件详情
        mail_detail_response = self.session.get(mail_detail_url)
        # 解析响应JSON数据
        mail_detail_data = mail_detail_response.json()
        # 等待0.5秒
        time.sleep(0.5)
        # 如果没有结果返回None
        if not mail_detail_data.get("result"):
            return None, None

        # 获取邮件正文和主题
        mail_text = mail_detail_data.get("text", "")
        mail_subject = mail_detail_data.get("subject", "")
        # 记录邮件主题日志
        logging.info(f"找到邮件主题: {mail_subject}")
        # 使用正则表达式查找验证码
        code_match = re.search(r"(?<![a-zA-Z@.])\b\d{6}\b", mail_text)

        # 如果找到验证码，返回验证码和邮件ID
        if code_match:
            return code_match.group(), first_id
        # 否则返回None
        return None, None

    # 清理已使用的临时邮件
    def _cleanup_mail(self, first_id):
        # 构造删除邮件的URL
        delete_url = "https://tempmail.plus/api/mails/"
        # 构造删除请求的数据
        payload = {
            "email": f"{self.username}{self.emailExtension}",
            "first_id": first_id,
            "epin": f"{self.epin}",
        }

        # 最多尝试5次删除
        for _ in range(5):
            # 发送删除请求
            response = self.session.delete(delete_url, data=payload)
            try:
                # 检查删除结果
                result = response.json().get("result")
                # 如果删除成功返回True
                if result is True:
                    return True
            except:
                pass

            # 如果删除失败，等待0.5秒后重试
            time.sleep(0.5)

        # 如果所有尝试都失败返回False
        return False


# 如果直接运行此文件
if __name__ == "__main__":
    # 创建邮件处理器实例
    email_handler = EmailVerificationHandler()
    # 获取验证码
    code = email_handler.get_verification_code()
    # 打印验证码
    print(code)
