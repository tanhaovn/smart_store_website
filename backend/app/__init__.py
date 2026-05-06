import os

from flask_cors import CORS
from flask import Flask, request
from werkzeug.exceptions import HTTPException

from app.database import db, migrate, socketio
from app.models import Category, ChatMessage, Order, OrderItem, Product, Promotion, User
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


def _seed_default_commerce_data_if_empty():
    if Product.query.count() > 0:
        return

    seller = User.query.filter_by(email="seller1@smartstore.local").first()
    if not seller:
        seller = User(
            email="seller1@smartstore.local",
            full_name="Demo Seller",
            phone="0922222222",
            password_hash=hash_password("Hao@1909"),
            role="SELLER",
            is_active=True,
        )
        db.session.add(seller)
        db.session.flush()

    user = User.query.filter_by(email="user1@smartstore.local").first()
    if not user:
        user = User(
            email="user1@smartstore.local",
            full_name="Demo User",
            phone="0933333333",
            password_hash=hash_password("Hao@1909"),
            role="USER",
            is_active=True,
        )
        db.session.add(user)
        db.session.flush()

    category_names = [
        "Rau cu - trai cay",
        "Thit ca - hai san",
        "Trung - sua",
        "Gao - mi - do kho",
        "Gia vi - nuoc cham",
        "Do dung gia dinh",
    ]
    categories = {}
    for category_name in category_names:
        category = Category.query.filter_by(name=category_name).first()
        if not category:
            category = Category(name=category_name, description=f"Danh muc {category_name}")
            db.session.add(category)
            db.session.flush()
        categories[category_name] = category

    products_seed = [
        {
            "name": "Rau cai xanh huu co 500g",
            "price": 22000,
            "stock": 120,
            "category": "Rau cu - trai cay",
            "image_url": "https://picsum.photos/seed/rau-cai-xanh/800/800",
        },
        {
            "name": "Thit ba chi heo 500g",
            "price": 89000,
            "stock": 80,
            "category": "Thit ca - hai san",
            "image_url": "https://picsum.photos/seed/thit-ba-chi/800/800",
        },
        {
            "name": "Trung ga ta hop 10 qua",
            "price": 35000,
            "stock": 100,
            "category": "Trung - sua",
            "image_url": "https://picsum.photos/seed/trung-ga/800/800",
        },
        {
            "name": "Gao ST25 tui 5kg",
            "price": 185000,
            "stock": 60,
            "category": "Gao - mi - do kho",
            "image_url": "https://picsum.photos/seed/gao-st25/800/800",
        },
        {
            "name": "Nuoc mam truyen thong 500ml",
            "price": 42000,
            "stock": 90,
            "category": "Gia vi - nuoc cham",
            "image_url": "https://picsum.photos/seed/nuoc-mam/800/800",
        },
        {
            "name": "Nuoc rua chen chanh 750ml",
            "price": 28000,
            "stock": 70,
            "category": "Do dung gia dinh",
            "image_url": "https://picsum.photos/seed/nuoc-rua-chen/800/800",
        },
    ]

    product_rows = []
    for item in products_seed:
        product = Product.query.filter_by(name=item["name"], seller_id=seller.id).first()
        if not product:
            product = Product(
                name=item["name"],
                image_url=item.get("image_url", ""),
                description=f"San pham demo {item['name']}",
                price=item["price"],
                stock=item["stock"],
                seller_id=seller.id,
                category_id=categories[item["category"]].id,
                is_approved=True,
            )
            db.session.add(product)
            db.session.flush()
        product_rows.append(product)

    if not Promotion.query.filter_by(seller_id=seller.id, code="DEMO10").first():
        db.session.add(Promotion(seller_id=seller.id, code="DEMO10", discount_percent=10, is_active=True))

    demo_order = Order.query.filter_by(user_id=user.id, seller_id=seller.id).first()
    if not demo_order:
        demo_order = Order(
            user_id=user.id,
            seller_id=seller.id,
            total_amount=(product_rows[0].price * 2) + product_rows[1].price,
            shipping_fee=15000,
            payment_method="COD",
            shipping_address="45 Nguyen Van Linh, Q7, TP.HCM",
            shipping_phone="0933333333",
            note="Nho giao truoc 18h, goi truoc khi giao",
            status="CHO_XAC_NHAN",
        )
        db.session.add(demo_order)
        db.session.flush()

        db.session.add_all(
            [
                OrderItem(
                    order_id=demo_order.id,
                    product_id=product_rows[0].id,
                    quantity=2,
                    unit_price=product_rows[0].price,
                ),
                OrderItem(
                    order_id=demo_order.id,
                    product_id=product_rows[1].id,
                    quantity=1,
                    unit_price=product_rows[1].price,
                ),
            ]
        )

    if not ChatMessage.query.filter_by(sender_id=user.id, receiver_id=seller.id).first():
        db.session.add(
            ChatMessage(
                sender_id=user.id,
                receiver_id=seller.id,
                order_id=demo_order.id,
                message="Shop oi, rau nay minh lay loai non giup nhe.",
            )
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
            _seed_default_commerce_data_if_empty()

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
