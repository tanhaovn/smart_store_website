import os

from dotenv import load_dotenv


load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET = os.getenv("JWT_SECRET", "Hao@1909")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:Hao%401909@localhost/smart_store",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "app/static/uploads/products")
    OTP_EXPIRES_MINUTES = int(os.getenv("OTP_EXPIRES_MINUTES", "5"))
    MAIL_SMTP_HOST = os.getenv("MAIL_SMTP_HOST", "")
    MAIL_SMTP_PORT = int(os.getenv("MAIL_SMTP_PORT", "587"))
    MAIL_SMTP_USERNAME = os.getenv("MAIL_SMTP_USERNAME", "")
    MAIL_SMTP_PASSWORD = os.getenv("MAIL_SMTP_PASSWORD", "")
    MAIL_FROM = os.getenv("MAIL_FROM", "")
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").strip().lower() in {"1", "true", "yes", "on"}
    MAIL_USE_SSL = os.getenv("MAIL_USE_SSL", "false").strip().lower() in {"1", "true", "yes", "on"}
    OTP_DEV_BYPASS_EMAIL = os.getenv("OTP_DEV_BYPASS_EMAIL", "false").strip().lower() in {"1", "true", "yes", "on"}
    OTP_DEV_BYPASS_SMS = os.getenv("OTP_DEV_BYPASS_SMS", "false").strip().lower() in {"1", "true", "yes", "on"}
    TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
