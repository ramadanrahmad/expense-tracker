import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD") # This should be the App Password
MAIL_PORT = 587
MAIL_SERVER = "smtp.gmail.com"

def send_reset_email(to_email: str, reset_link: str):
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        print("Email configuration not set up properly!")
        # For testing purposes if env vars are not set
        print(f"MOCK EMAIL: Would send reset link {reset_link} to {to_email}")
        return True
        
    try:
        msg = MIMEMultipart()
        msg['From'] = MAIL_USERNAME
        msg['To'] = to_email
        msg['Subject'] = "Reset Password - Expense AI"

        body = f"""
        Halo!
        
        Kami menerima permintaan untuk mereset password akun Expense AI Anda.
        Silakan klik link di bawah ini untuk membuat password baru:
        
        {reset_link}
        
        Jika Anda tidak merasa meminta reset password, abaikan email ini.
        
        Terima kasih,
        Tim Expense AI
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        server = smtplib.SMTP(MAIL_SERVER, MAIL_PORT)
        server.starttls()
        server.login(MAIL_USERNAME, MAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False
