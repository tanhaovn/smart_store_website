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
    ("tai nghe", "headphones"),
    ("ao", "tshirt fashion"),
    ("ban phim", "mechanical keyboard"),
    ("chuot", "computer mouse"),
    ("noi chien", "air fryer"),
    ("sach", "book cover"),
    ("sua rua mat", "face wash bottle"),
    ("binh giu nhiet", "thermos bottle"),
    ("den ban", "desk lamp"),
    ("may xay", "blender"),
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

    category_names = ["Dien tu", "Thoi trang"]
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
            "name": "Tai nghe Bluetooth",
            "price": 450000,
            "stock": 30,
            "category": "Dien tu",
            "image_url": "https://picsum.photos/seed/tai-nghe/800/800",
        },
        {
            "name": "Ao thun basic",
            "price": 180000,
            "stock": 50,
            "category": "Thoi trang",
            "image_url": "https://picsum.photos/seed/ao-thun/800/800",
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
        db.session.add(Cart(user_id=user.id, product_id=product_rows[0].id, quantity=1))

    demo_order = Order.query.filter_by(user_id=user.id, seller_id=seller.id).first()
    if not demo_order:
        total_amount = product_rows[0].price
        demo_order = Order(
            user_id=user.id,
            seller_id=seller.id,
            total_amount=total_amount,
            shipping_fee=15000,
            payment_method="COD",
            shipping_address="123 Demo Street, HCM",
            shipping_phone="0933333333",
            note="Don demo",
            status="CHO_XAC_NHAN",
        )
        db.session.add(demo_order)
        db.session.flush()

        db.session.add(
            OrderItem(
                order_id=demo_order.id,
                product_id=product_rows[0].id,
                quantity=1,
                unit_price=product_rows[0].price,
            )
        )

    demo_message = ChatMessage.query.filter_by(sender_id=user.id, receiver_id=seller.id).first()
    if not demo_message:
        db.session.add(
            ChatMessage(
                sender_id=user.id,
                receiver_id=seller.id,
                order_id=demo_order.id if demo_order else None,
                message="Shop oi, cho minh hoi them ve san pham nha.",
            )
        )

    db.session.commit()
    print("Seed demo data done.")


def seed_realistic_data_impl(users: int, sellers: int, products: int, orders: int, chats: int):
    fake = Faker("vi_VN")

    seed_accounts_impl()

    categories_seed = [
        ("Dien tu", "Do cong nghe va thiet bi thong minh"),
        ("Thoi trang", "Quan ao va phu kien"),
        ("Gia dung", "Vat dung nha bep, nha cua"),
        ("Suc khoe", "Cham soc ca nhan"),
        ("Me va be", "Do dung cho me va be"),
        ("Sach", "Sach va van phong pham"),
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
        "Premium",
        "Smart",
        "Classic",
        "Eco",
        "Mini",
        "Pro",
        "Plus",
        "Luxury",
    ]
    product_nouns = [
        "Tai nghe",
        "Ban phim",
        "Chuot",
        "Ao khoac",
        "Noi chien",
        "Sach ky nang",
        "Sua rua mat",
        "Binh giu nhiet",
        "Den ban",
        "May xay mini",
    ]

    for idx in range(products):
        seller = random.choice(all_sellers)
        category = random.choice(categories)
        name = f"{random.choice(product_prefixes)} {random.choice(product_nouns)} {idx + 1}"
        product = Product(
            name=name,
            image_url=build_product_image_url(name),
            description=f"{name} - {fake.sentence(nb_words=10)}",
            price=random.randint(50000, 2500000),
            stock=random.randint(5, 200),
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
        "Shop oi, san pham nay con mau den khong?",
        "Cho minh xin them anh that duoc khong?",
        "Don nay du kien giao khi nao vay shop?",
        "Minh dat 2 cai co du hang khong?",
        "Shop goi hang ky giup minh nhe.",
        "Cam on shop, minh da nhan duoc hang roi.",
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
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
