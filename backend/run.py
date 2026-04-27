import os
import random
from urllib.parse import quote_plus

import click
from faker import Faker

from app import create_app
from app.database import db, socketio
from app.models import Cart, Category, ChatMessage, DeliveryAssignment, Order, OrderItem, Product, Promotion, User
from app.utils import hash_password


app = create_app()


KEYWORD_IMAGE_QUERIES = [
    ("rau", "fresh vegetables"),
    ("cu", "root vegetables"),
    ("qua", "fresh fruits"),
    ("trai cay", "fresh fruits"),
    ("thit", "fresh meat"),
    ("ca", "fresh fish market"),
    ("tom", "fresh shrimp"),
    ("trung", "eggs tray"),
    ("gao", "rice bag"),
    ("mi", "instant noodles"),
    ("nuoc mam", "fish sauce bottle"),
    ("nuoc tuong", "soy sauce bottle"),
    ("dau an", "cooking oil bottle"),
    ("duong", "sugar pack"),
    ("muoi", "salt package"),
    ("sua", "milk carton"),
    ("banh", "snack package"),
    ("bot giat", "laundry detergent"),
    ("nuoc rua chen", "dish soap"),
    ("khau trang", "face mask"),
]


def build_product_image_url(product_name: str, product_id: int | None = None) -> str:
    lowered = (product_name or "").lower()
    query = None
    for keyword, mapped_query in KEYWORD_IMAGE_QUERIES:
        if keyword in lowered:
            query = mapped_query
            break

    if not query:
        query = lowered.strip() or "product"

    label = product_name.strip() if product_name else query
    encoded_label = quote_plus(label[:60])
    signature = product_id if product_id is not None else random.randint(1, 100000)
    bg_colors = ["E2E8F0", "DBEAFE", "DCFCE7", "FEF3C7", "FCE7F3", "F3E8FF"]
    fg_colors = ["0F172A", "1E3A8A", "14532D", "854D0E", "831843", "4C1D95"]
    idx = signature % len(bg_colors)
    return (
        "https://placehold.co/800x800"
        f"/{bg_colors[idx]}/{fg_colors[idx]}"
        f"?text={encoded_label}"
    )


@app.cli.command("seed-accounts")
def seed_accounts():
    seed_accounts_impl()


def seed_accounts_impl():
    admin_email = "admin@smartstore.local"
    delivery_email = "delivery@smartstore.local"

    admin = User.query.filter_by(email=admin_email).first()
    if not admin:
        admin = User(
            email=admin_email,
            full_name="System Admin",
            phone="0900000000",
            password_hash=hash_password("Hao@1909"),
            role="ADMIN",
            is_active=True,
        )
        db.session.add(admin)

    delivery = User.query.filter_by(email=delivery_email).first()
    if not delivery:
        delivery = User(
            email=delivery_email,
            full_name="Mock Shipper",
            phone="0911111111",
            password_hash=hash_password("Hao@1909"),
            role="DELIVERY",
            is_active=True,
        )
        db.session.add(delivery)

    db.session.commit()
    print("Seed accounts done.")


def reset_commerce_data_impl():
    # Keep user accounts, only clear transactional/catalog data.
    db.session.query(ChatMessage).delete()
    db.session.query(DeliveryAssignment).delete()
    db.session.query(OrderItem).delete()
    db.session.query(Order).delete()
    db.session.query(Cart).delete()
    db.session.query(Promotion).delete()
    db.session.query(Product).delete()
    db.session.query(Category).delete()
    db.session.commit()


@app.cli.command("reset-commerce-data")
def reset_commerce_data():
    reset_commerce_data_impl()
    print("Reset commerce data done.")


@app.cli.command("seed-demo-data")
def seed_demo_data():
    seller_email = "seller1@smartstore.local"
    user_email = "user1@smartstore.local"

    seller = User.query.filter_by(email=seller_email).first()
    if not seller:
        seller = User(
            email=seller_email,
            full_name="Demo Seller",
            phone="0922222222",
            password_hash=hash_password("Hao@1909"),
            role="SELLER",
            is_active=True,
        )
        db.session.add(seller)
        db.session.flush()

    user = User.query.filter_by(email=user_email).first()
    if not user:
        user = User(
            email=user_email,
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
                image_url=item.get("image_url") or build_product_image_url(item["name"]),
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

    promotion = Promotion.query.filter_by(seller_id=seller.id, code="DEMO10").first()
    if not promotion:
        db.session.add(Promotion(seller_id=seller.id, code="DEMO10", discount_percent=10, is_active=True))

    existing_cart = Cart.query.filter_by(user_id=user.id).all()
    if not existing_cart:
        db.session.add(Cart(user_id=user.id, product_id=product_rows[0].id, quantity=2))
        db.session.add(Cart(user_id=user.id, product_id=product_rows[2].id, quantity=1))

    demo_order = Order.query.filter_by(user_id=user.id, seller_id=seller.id).first()
    if not demo_order:
        total_amount = (product_rows[0].price * 2) + product_rows[1].price
        demo_order = Order(
            user_id=user.id,
            seller_id=seller.id,
            total_amount=total_amount,
            shipping_fee=15000,
            payment_method="COD",
            shipping_address="45 Nguyen Van Linh, Q7, TP.HCM",
            shipping_phone="0933333333",
            note="Nho giao truoc 18h, goi truoc khi giao",
            status="CHO_XAC_NHAN",
        )
        db.session.add(demo_order)
        db.session.flush()

        db.session.add(
            OrderItem(
                order_id=demo_order.id,
                product_id=product_rows[0].id,
                quantity=2,
                unit_price=product_rows[0].price,
            )
        )
        db.session.add(
            OrderItem(
                order_id=demo_order.id,
                product_id=product_rows[1].id,
                quantity=1,
                unit_price=product_rows[1].price,
            )
        )

    demo_message = ChatMessage.query.filter_by(sender_id=user.id, receiver_id=seller.id).first()
    if not demo_message:
        db.session.add(
            ChatMessage(
                sender_id=user.id,
                receiver_id=seller.id,
                order_id=demo_order.id if demo_order else None,
                message="Shop oi, rau nay minh lay loai non giup nhe.",
            )
        )

    db.session.commit()
    print("Seed demo data done.")


def seed_realistic_data_impl(users: int, sellers: int, products: int, orders: int, chats: int):
    fake = Faker("vi_VN")

    seed_accounts_impl()

    categories_seed = [
        ("Rau cu", "Rau la, cu qua tuoi moi ngay"),
        ("Trai cay", "Trai cay trong nuoc va nhap khau"),
        ("Thit heo bo ga", "Thit tuoi da qua kiem dinh"),
        ("Hai san", "Ca, tom, muc va do dong lanh"),
        ("Trung - sua", "Trung gia cam, sua tuoi va sua hop"),
        ("Gao - mi - ngu coc", "Gao, mi goi, bun, pho kho"),
        ("Gia vi", "Nuoc mam, nuoc tuong, dau an, duong, muoi"),
        ("Do hop - do kho", "Ca hop, hat, trai cay say, do kho"),
        ("Do uong", "Nuoc suoi, nuoc ngot, sua hat"),
        ("Ve sinh nha cua", "Nuoc rua chen, bot giat, lau san"),
    ]
    categories = []
    for name, description in categories_seed:
        category = Category.query.filter_by(name=name).first()
        if not category:
            category = Category(name=name, description=description)
            db.session.add(category)
            db.session.flush()
        categories.append(category)

    existing_seller_count = User.query.filter_by(role="SELLER").count()
    new_sellers = []
    for idx in range(sellers):
        serial = existing_seller_count + idx + 1
        email = f"seller{serial}@smartstore.local"
        if User.query.filter_by(email=email).first():
            continue
        seller = User(
            email=email,
            full_name=fake.name(),
            phone=f"09{random.randint(10000000, 99999999)}",
            password_hash=hash_password("Hao@1909"),
            role="SELLER",
            is_active=True,
        )
        db.session.add(seller)
        new_sellers.append(seller)

    existing_user_count = User.query.filter_by(role="USER").count()
    new_users = []
    for idx in range(users):
        serial = existing_user_count + idx + 1
        email = f"user{serial}@smartstore.local"
        if User.query.filter_by(email=email).first():
            continue
        customer = User(
            email=email,
            full_name=fake.name(),
            phone=f"09{random.randint(10000000, 99999999)}",
            password_hash=hash_password("Hao@1909"),
            role="USER",
            is_active=True,
        )
        db.session.add(customer)
        new_users.append(customer)

    db.session.flush()

    all_sellers = User.query.filter_by(role="SELLER", is_active=True).all()
    all_users = User.query.filter_by(role="USER", is_active=True).all()
    all_delivery = User.query.filter_by(role="DELIVERY", is_active=True).all()

    if not all_sellers or not all_users:
        db.session.commit()
        print("Cannot create realistic data: missing sellers or users.")
        return

    product_prefixes = [
        "Tuoi ngon",
        "Loai 1",
        "Nong trai",
        "An toan",
        "Tiet kiem",
        "Gia tot",
        "Thuong hang",
        "Huu co",
    ]
    product_nouns = [
        "Rau muong 500g",
        "Ca rot Da Lat 1kg",
        "Chuoi cau 1kg",
        "Tao Gala 1kg",
        "Thit heo xay 500g",
        "Uc ga phi le 500g",
        "Ca basa cat khuc 500g",
        "Tom the 300g",
        "Trung ga hop 10 qua",
        "Sua tuoi khong duong 1L",
        "Gao ST25 5kg",
        "Mi goi tom chua cay goi",
        "Nuoc mam 500ml",
        "Nuoc tuong 500ml",
        "Dau an 1L",
        "Duong cat 1kg",
        "Muoi iot 500g",
        "Ca hop sot ca",
        "Nuoc rua chen 750ml",
        "Bot giat 3kg",
    ]

    for idx in range(products):
        seller = random.choice(all_sellers)
        category = random.choice(categories)
        name = f"{random.choice(product_prefixes)} {random.choice(product_nouns)} {idx + 1}"
        product = Product(
            name=name,
            image_url=build_product_image_url(name),
            description=f"{name} - Hang phuc vu nhu cau di cho hang ngay.",
            price=random.randint(8000, 240000),
            stock=random.randint(10, 300),
            seller_id=seller.id,
            category_id=category.id,
            is_approved=True,
        )
        db.session.add(product)

    db.session.flush()

    all_products = Product.query.filter_by(is_approved=True).all()
    products_by_seller = {}
    for product in all_products:
        products_by_seller.setdefault(product.seller_id, []).append(product)

    status_choices = ["CHO_XAC_NHAN", "DANG_CHUAN_BI", "DANG_GIAO", "DA_GIAO", "HOAN_THANH"]
    payment_choices = ["COD", "BANKING", "MOMO"]
    orders_created = []
    for _ in range(orders):
        user = random.choice(all_users)
        seller = random.choice(all_sellers)
        seller_products = products_by_seller.get(seller.id, [])
        if not seller_products:
            continue

        selected_items = random.sample(seller_products, k=min(len(seller_products), random.randint(1, 3)))
        shipping_fee = random.randint(12000, 45000)
        order_status = random.choice(status_choices)
        order = Order(
            user_id=user.id,
            seller_id=seller.id,
            total_amount=0,
            shipping_fee=shipping_fee,
            payment_method=random.choice(payment_choices),
            shipping_address=fake.address().replace("\n", ", "),
            shipping_phone=f"09{random.randint(10000000, 99999999)}",
            note=fake.sentence(nb_words=8),
            status=order_status,
        )
        db.session.add(order)
        db.session.flush()

        total_amount = 0
        for item_product in selected_items:
            quantity = random.randint(1, 3)
            total_amount += item_product.price * quantity
            db.session.add(
                OrderItem(
                    order_id=order.id,
                    product_id=item_product.id,
                    quantity=quantity,
                    unit_price=item_product.price,
                )
            )
        order.total_amount = total_amount
        orders_created.append(order)

        if all_delivery and order_status in {"DANG_GIAO", "DA_GIAO", "HOAN_THANH"}:
            shipper = random.choice(all_delivery)
            db.session.add(
                DeliveryAssignment(
                    order_id=order.id,
                    shipper_id=shipper.id,
                    status=order.status,
                )
            )

    for seller in all_sellers:
        if random.random() > 0.6:
            continue
        code = f"SALE{seller.id}"
        exists = Promotion.query.filter_by(seller_id=seller.id, code=code).first()
        if not exists:
            db.session.add(
                Promotion(
                    seller_id=seller.id,
                    code=code,
                    discount_percent=random.choice([5, 10, 15, 20, 25]),
                    is_active=True,
                )
            )

    sample_messages = [
        "Shop oi, rau nay hom nay moi cat khong a?",
        "Cho minh xin giao trong khung 16h-18h nhe.",
        "Tom nay con tuoi khong shop?",
        "Neu het hang thi doi qua loai tuong duong giup minh.",
        "Nho dong goi ky trung va trai cay giup minh nhe.",
        "Cam on shop, hang tuoi va dong goi rat gon.",
    ]
    for _ in range(chats):
        user = random.choice(all_users)
        seller = random.choice(all_sellers)
        related_order = None
        if orders_created and random.random() > 0.4:
            related_order = random.choice(orders_created)

        if random.random() > 0.5:
            sender_id, receiver_id = user.id, seller.id
        else:
            sender_id, receiver_id = seller.id, user.id

        db.session.add(
            ChatMessage(
                sender_id=sender_id,
                receiver_id=receiver_id,
                order_id=related_order.id if related_order else None,
                message=random.choice(sample_messages),
            )
        )

    db.session.commit()
    print(
        "Seed realistic data done. "
        f"users+={len(new_users)}, sellers+={len(new_sellers)}, products+={products}, orders+={len(orders_created)}, chats+={chats}"
    )


@app.cli.command("seed-realistic-data")
@click.option("--users", default=40, show_default=True, type=int, help="Number of customer accounts to add")
@click.option("--sellers", default=12, show_default=True, type=int, help="Number of seller accounts to add")
@click.option("--products", default=180, show_default=True, type=int, help="Number of products to add")
@click.option("--orders", default=220, show_default=True, type=int, help="Number of orders to add")
@click.option("--chats", default=350, show_default=True, type=int, help="Number of chat messages to add")
def seed_realistic_data(users: int, sellers: int, products: int, orders: int, chats: int):
    seed_realistic_data_impl(users=users, sellers=sellers, products=products, orders=orders, chats=chats)


@app.cli.command("sync-product-images")
@click.option("--overwrite", is_flag=True, default=False, help="Overwrite existing image_url values")
def sync_product_images(overwrite: bool):
    products = Product.query.order_by(Product.id.asc()).all()
    updated = 0
    for product in products:
        if not overwrite and product.image_url:
            continue
        product.image_url = build_product_image_url(product.name, product.id)
        updated += 1

    db.session.commit()
    print(f"Synced product images: updated={updated}, total={len(products)}, overwrite={overwrite}")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    debug = str(os.environ.get("FLASK_DEBUG", "false")).strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    socketio.run(app, host="0.0.0.0", port=port, debug=debug)
