import os

from flask import Flask, request
from werkzeug.exceptions import HTTPException

from app.database import db, migrate, socketio


def create_app(config_object="config.Config"):
    app = Flask(__name__)
    app.config.from_object(config_object)
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    socketio.init_app(app)

    from app import models  # noqa: F401
    from app import socket_events  # noqa: F401

    from app.routes.auth import auth_bp
    from app.routes.user import user_bp
    from app.routes.seller import seller_bp
    from app.routes.admin import admin_bp
    from app.routes.delivery import delivery_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(user_bp, url_prefix="/api/user")
    app.register_blueprint(seller_bp, url_prefix="/api/seller")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(delivery_bp, url_prefix="/api/delivery")

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
