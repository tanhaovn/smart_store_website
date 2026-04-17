import random
import smtplib
import ssl
from datetime import datetime, timedelta
from email.message import EmailMessage

from flask import Blueprint
from flask import current_app
from twilio.base.exceptions import TwilioException
from twilio.rest import Client

from app.database import db
from app.models import RegistrationOtp, User
from app.utils import (
    check_password,
    generate_token,
    get_json_body,
    hash_password,
    is_valid_email,
    require_fields,
)


auth_bp = Blueprint("auth", __name__)


def _serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
    }


def _build_auth_response(user: User, status_code: int = 200):
    token = generate_token({"user_id": user.id, "role": user.role}, expires_minutes=60 * 24)
    return {"access_token": token, "user": _serialize_user(user)}, status_code


def normalize_phone_for_twilio(phone: str) -> str:
    raw = str(phone or "").strip().replace(" ", "")
    if not raw:
        raise RuntimeError("Phone number is required")

    if raw.startswith("+"):
        normalized = raw
    elif raw.startswith("84"):
        normalized = f"+{raw}"
    elif raw.startswith("0"):
        normalized = f"+84{raw[1:]}"
    else:
        normalized = f"+{raw}"

    digits = normalized[1:]
    if not digits.isdigit() or len(digits) < 8 or len(digits) > 15:
        raise RuntimeError("Invalid phone number format for SMS")

    return normalized


def send_registration_otp_email(to_email: str, otp_code: str, expires_minutes: int):
    host = current_app.config.get("MAIL_SMTP_HOST")
    port = int(current_app.config.get("MAIL_SMTP_PORT", 587))
    username = current_app.config.get("MAIL_SMTP_USERNAME")
    password = current_app.config.get("MAIL_SMTP_PASSWORD")
    from_email = current_app.config.get("MAIL_FROM") or username
    use_tls = bool(current_app.config.get("MAIL_USE_TLS", True))
    use_ssl = bool(current_app.config.get("MAIL_USE_SSL", False))

    if not host or not username or not password or not from_email:
        raise RuntimeError("SMTP settings are missing. Please configure email environment variables.")

    message = EmailMessage()
    message["Subject"] = "Smart Vision Shop - OTP xac thuc dang ky"
    message["From"] = from_email
    message["To"] = to_email
    message.set_content(
        "Xin chao,\n\n"
        f"Ma OTP dang ky cua ban la: {otp_code}\n"
        f"Ma co hieu luc trong {expires_minutes} phut.\n\n"
        "Neu ban khong thuc hien dang ky, vui long bo qua email nay.\n"
    )

    context = ssl.create_default_context()
    if use_ssl:
        with smtplib.SMTP_SSL(host=host, port=port, timeout=20, context=context) as server:
            server.login(username, password)
            server.send_message(message)
        return

    with smtplib.SMTP(host=host, port=port, timeout=20) as server:
        server.ehlo()
        if use_tls:
            server.starttls(context=context)
            server.ehlo()
        server.login(username, password)
        server.send_message(message)


def send_registration_otp_sms(to_phone: str, otp_code: str, expires_minutes: int):
    sid = current_app.config.get("TWILIO_ACCOUNT_SID")
    token = current_app.config.get("TWILIO_AUTH_TOKEN")
    from_phone = current_app.config.get("TWILIO_PHONE_NUMBER")

    if not sid or not token or not from_phone:
        raise RuntimeError("Twilio settings are missing. Please configure SMS environment variables.")

    destination_phone = normalize_phone_for_twilio(to_phone)
    client = Client(sid, token)
    client.messages.create(
        body=(
            f"Smart Vision Shop OTP: {otp_code}. "
            f"Ma co hieu luc trong {expires_minutes} phut."
        ),
        from_=from_phone,
        to=destination_phone,
    )


@auth_bp.post("/register/request-otp")
def request_register_otp():
    data = get_json_body()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    full_name = str(data.get("full_name", "")).strip()
    phone = str(data.get("phone", "")).strip()

    require_fields(data, ["email", "password", "full_name"])
    if not phone:
        return {"error": "Phone number is required"}, 400
    if not is_valid_email(email):
        return {"error": "Invalid email"}, 400
    if len(password) < 8:
        return {"error": "Password must be at least 8 characters"}, 400
    if User.query.filter_by(email=email).first():
        return {"error": "Email already exists"}, 409

    latest_request = (
        RegistrationOtp.query.filter_by(phone=phone, is_used=False)
        .order_by(RegistrationOtp.created_at.desc())
        .first()
    )
    now = datetime.utcnow()
    if latest_request and (now - latest_request.created_at).total_seconds() < 60:
        return {"error": "Please wait 60 seconds before requesting a new OTP"}, 429

    otp_code = f"{random.randint(0, 999999):06d}"
    expires_minutes = int(current_app.config.get("OTP_EXPIRES_MINUTES", 5))
    pending_registration = RegistrationOtp(
        email=email,
        full_name=full_name,
        phone=phone,
        password_hash=hash_password(password),
        otp_hash=hash_password(otp_code),
        expires_at=now + timedelta(minutes=expires_minutes),
    )

    bypass_sms = bool(current_app.config.get("OTP_DEV_BYPASS_SMS", False))
    db.session.add(pending_registration)
    try:
        if not bypass_sms:
            send_registration_otp_sms(phone, otp_code, expires_minutes)
        db.session.commit()
    except smtplib.SMTPAuthenticationError as exc:
        db.session.rollback()
        current_app.logger.exception("Failed to send OTP email to %s: %s", email, exc)
        return {"error": "SMTP authentication failed. Gmail requires an App Password."}, 500
    except TwilioException as exc:
        db.session.rollback()
        current_app.logger.exception("Failed to send OTP SMS to %s: %s", phone, exc)
        return {"error": "Cannot send OTP SMS right now. Please check Twilio configuration."}, 500
    except RuntimeError as exc:
        db.session.rollback()
        current_app.logger.exception("Failed to send OTP SMS to %s: %s", phone, exc)
        return {"error": str(exc)}, 500
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Failed to send OTP SMS to %s: %s", phone, exc)
        return {"error": "Cannot send OTP SMS right now"}, 500

    response = {
        "message": "OTP sent to your phone",
        "phone": phone,
        "expires_minutes": expires_minutes,
    }
    if bypass_sms:
        response["message"] = "OTP generated in dev mode"
        response["otp_preview"] = otp_code

    return response, 200


@auth_bp.post("/register/verify-otp")
def verify_register_otp():
    data = get_json_body()
    email = str(data.get("email", "")).strip().lower()
    phone = str(data.get("phone", "")).strip()
    otp_code = str(data.get("otp", "")).strip()

    require_fields(data, ["phone", "otp"])
    pending_registration = (
        RegistrationOtp.query.filter_by(phone=phone, is_used=False)
        .order_by(RegistrationOtp.created_at.desc())
        .first()
    )
    if not pending_registration:
        return {"error": "No OTP request found for this phone number"}, 400
    if pending_registration.expires_at < datetime.utcnow():
        pending_registration.is_used = True
        db.session.commit()
        return {"error": "OTP has expired. Please request a new OTP"}, 400
    if not check_password(otp_code, pending_registration.otp_hash):
        return {"error": "Invalid OTP"}, 400

    register_email = pending_registration.email
    if email and email != register_email:
        return {"error": "Email does not match OTP request"}, 400

    if User.query.filter_by(email=register_email).first():
        pending_registration.is_used = True
        db.session.commit()
        return {"error": "Email already exists"}, 409

    user = User(
        email=register_email,
        full_name=pending_registration.full_name,
        phone=pending_registration.phone,
        password_hash=pending_registration.password_hash,
        role="USER",
    )
    pending_registration.is_used = True
    pending_registration.used_at = datetime.utcnow()

    db.session.add(user)
    db.session.commit()

    token = generate_token({"user_id": user.id, "role": user.role}, expires_minutes=60 * 24)
    return {
        "message": "Register success",
        "access_token": token,
        "user": _serialize_user(user),
    }, 201


@auth_bp.post("/register")
def register():
    return {
        "error": "Please use /api/auth/register/request-otp and /api/auth/register/verify-otp to complete registration"
    }, 400


@auth_bp.post("/login")
def login():
    data = get_json_body()
    require_fields(data, ["email", "password"])
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    user = User.query.filter_by(email=email).first()
    if not user or not check_password(password, user.password_hash):
        return {"error": "Invalid credentials"}, 401
    if not user.is_active:
        return {"error": "Account is locked"}, 403

    return _build_auth_response(user)


@auth_bp.post("/seller-login")
def seller_login():
    data = get_json_body()
    require_fields(data, ["email", "password"])
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    user = User.query.filter_by(email=email, role="SELLER").first()
    if not user or not check_password(password, user.password_hash):
        return {"error": "Invalid seller credentials"}, 401
    if not user.is_active:
        return {"error": "Seller account is locked"}, 403

    return _build_auth_response(user)


@auth_bp.post("/admin-login")
def admin_login():
    data = get_json_body()
    require_fields(data, ["email", "password"])
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    user = User.query.filter_by(email=email, role="ADMIN").first()
    if not user or not check_password(password, user.password_hash):
        return {"error": "Invalid admin credentials"}, 401
    if not user.is_active:
        return {"error": "Admin account is locked"}, 403

    return _build_auth_response(user)


@auth_bp.post("/delivery-login")
def delivery_login():
    data = get_json_body()
    require_fields(data, ["email", "password"])
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    user = User.query.filter_by(email=email, role="DELIVERY").first()
    if not user or not check_password(password, user.password_hash):
        return {"error": "Invalid delivery credentials"}, 401
    if not user.is_active:
        return {"error": "Delivery account is locked"}, 403

    return _build_auth_response(user)
