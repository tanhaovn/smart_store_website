# Cơ Sở Dữ Liệu SmartVision Shop

Sơ đồ dưới đây được dựng từ `backend/app/models.py` và các migration hiện có.

```mermaid
erDiagram
    USERS {
        int id PK
        string email
        string full_name
        string phone
        string password_hash
        string role
        boolean is_active
        datetime created_at
    }

    REGISTRATION_OTPS {
        int id PK
        string email
        string full_name
        string phone
        string password_hash
        string otp_hash
        datetime expires_at
        boolean is_used
        datetime used_at
        datetime created_at
    }

    CATEGORIES {
        int id PK
        string name
        string description
        datetime created_at
    }

    PRODUCTS {
        int id PK
        string name
        string image_url
        text description
        float price
        int stock
        int seller_id FK
        int category_id FK
        boolean is_approved
        datetime created_at
    }

    CARTS {
        int id PK
        int user_id FK
        int product_id FK
        int quantity
        datetime created_at
    }

    ORDERS {
        int id PK
        int user_id FK
        int seller_id FK
        float total_amount
        float shipping_fee
        string payment_method
        string shipping_address
        string shipping_phone
        string note
        string status
        datetime created_at
    }

    ORDER_ITEMS {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
        float unit_price
    }

    PROMOTIONS {
        int id PK
        int seller_id FK
        string code
        float discount_percent
        boolean is_active
        datetime created_at
    }

    CHAT_MESSAGES {
        int id PK
        int sender_id FK
        int receiver_id FK
        int order_id FK
        text message
        datetime created_at
    }

    DELIVERY_ASSIGNMENTS {
        int id PK
        int order_id FK
        int shipper_id FK
        string status
        datetime created_at
    }

    PAYMENT_TRANSACTIONS {
        int id PK
        int order_id FK
        int user_id FK
        string method
        float amount
        string status
        string transaction_code
        datetime paid_at
        datetime created_at
    }

    USERS ||--o{ PRODUCTS : sells
    CATEGORIES ||--o{ PRODUCTS : contains
    USERS ||--o{ CARTS : owns
    PRODUCTS ||--o{ CARTS : added_to
    USERS ||--o{ ORDERS : places
    USERS ||--o{ ORDERS : sells_for
    ORDERS ||--o{ ORDER_ITEMS : includes
    PRODUCTS ||--o{ ORDER_ITEMS : appears_in
    USERS ||--o{ PROMOTIONS : creates
    USERS ||--o{ CHAT_MESSAGES : sends
    USERS ||--o{ CHAT_MESSAGES : receives
    ORDERS ||--o{ CHAT_MESSAGES : related_to
    ORDERS ||--o| DELIVERY_ASSIGNMENTS : has
    USERS ||--o{ DELIVERY_ASSIGNMENTS : handles
    ORDERS ||--o| PAYMENT_TRANSACTIONS : has
    USERS ||--o{ PAYMENT_TRANSACTIONS : makes
```

## Ghi chú nhanh

- `orders.user_id` là người mua, `orders.seller_id` là người bán.
- `delivery_assignments.order_id` và `payment_transactions.order_id` là duy nhất nên mỗi đơn hàng chỉ có tối đa một bản ghi tương ứng.
- `registration_otps` là bảng tạm phục vụ đăng ký, không liên kết khóa ngoại với các bảng còn lại.