import os

from flask_cors import CORS
from flask import Flask, request
from werkzeug.exceptions import HTTPException

from app.database import db, migrate, socketio
from app.models import User
from app.utils import hash_password


def _parse_cors_origins() -> list[str]:
    raw_origins = str(os.getenv("CORS_ALLOWED_ORIGINS", "")).strip()
    configured = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

    frontend_origin = str(os.getenv("FRONTEND_ORIGIN", "")).strip()
    defaults = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    origins = configured or defaults
    if frontend_origin and frontend_origin not in origins:
        origins.append(frontend_origin)
    return origins


def _seed_default_accounts_if_empty():
    if User.query.count() > 0:
        return

    db.session.add_all(
        [
            User(
                email="admin@smartstore.local",
                full_name="System Admin",
                phone="0900000000",
                password_hash=hash_password("Hao@1909"),
                role="ADMIN",
                is_active=True,
            ),
            User(
                email="delivery@smartstore.local",
                full_name="Mock Shipper",
                phone="0911111111",
                password_hash=hash_password("Hao@1909"),
                role="DELIVERY",
                is_active=True,
            ),
            User(
                email="seller1@smartstore.local",
                full_name="Demo Seller",
                phone="0922222222",
                password_hash=hash_password("Hao@1909"),
                role="SELLER",
                is_active=True,
            ),
            User(
                email="user1@smartstore.local",
                full_name="Demo User",
                phone="0933333333",
                password_hash=hash_password("Hao@1909"),
                role="USER",
                is_active=True,
            ),
        ]
    )
    db.session.commit()


def create_app(config_object="config.Config"):
    app = Flask(__name__, instance_path="/tmp/flask-instance")
    app.config.from_object(config_object)
    os.makedirs(app.instance_path, exist_ok=True)
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    cors_origins = _parse_cors_origins()

    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app, resources={r"/api/*": {"origins": cors_origins}, r"/health": {"origins": cors_origins}})
    socketio.init_app(app, cors_allowed_origins=cors_origins)

    from app import models  # noqa: F401
    from app import socket_events  # noqa: F401

    from app.routes.auth import auth_bp
    from app.routes.user import user_bp
    from app.routes.seller import seller_bp
    from app.routes.admin import admin_bp
    from app.routes.delivery import delivery_bp
    from app.db_watcher import start_db_change_watcher

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(user_bp, url_prefix="/api/user")
    app.register_blueprint(seller_bp, url_prefix="/api/seller")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(delivery_bp, url_prefix="/api/delivery")

    # On serverless SQLite deployments, ensure schema exists at cold start.
    database_uri = str(app.config.get("SQLALCHEMY_DATABASE_URI", ""))
    if database_uri.startswith("sqlite"):
        with app.app_context():
            db.create_all()

    auto_create_schema = str(os.getenv("AUTO_CREATE_SCHEMA", "false")).strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    if auto_create_schema:
        with app.app_context():
            db.create_all()

    auto_seed = str(os.getenv("AUTO_SEED_DEMO_ACCOUNTS", "false")).strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    if auto_seed:
        with app.app_context():
            _seed_default_accounts_if_empty()

    start_db_change_watcher(app)

    @app.get("/health")
    def health_check():
        return {"status": "ok"}, 200

    @app.after_request
    def standardize_response(response):
        if not response.content_type or "application/json" not in response.content_type:
            return response
        if not request.path.startswith("/api") and request.path != "/health":
            return response

        payload = response.get_json(silent=True)
        if not isinstance(payload, dict) or "success" in payload:
            return response

        status_code = response.status_code
        success = 200 <= status_code < 400
        message = payload.get("message")
        if not message:
            message = "Success" if success else payload.get("error", "Request failed")

        body = {
            "success": success,
            "message": message,
            "data": payload,
        }
        response.set_data(app.json.dumps(body))
        return response

    @app.errorhandler(ValueError)
    def handle_value_error(error):
        return {"error": str(error) or "Invalid input"}, 400

    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        return {"error": error.description}, error.code

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        app.logger.exception("Unhandled exception: %s", error)
        return {"error": "Internal server error"}, 500

    return app
