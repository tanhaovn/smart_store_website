import { useCallback, useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../services/http";
import { useAuth } from "../../auth/useAuth";
import { formatDateTime, formatMoney, safeItems } from "../dashboardUtils";

const initialOrderForm = {
  shipping_address: "",
  shipping_phone: "",
  payment_method: "COD",
  note: "",
};

const shopCategories = [
  "Flash sale",
  "Dien tu",
  "Thoi trang",
  "Gia dung",
  "Lam dep",
  "Me va be",
  "Voucher",
  "Freeship",
];

const backendOrigin =
  import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:5000";

function buildFallbackThumb(label) {
  const text = String(label || "Product")
    .trim()
    .slice(0, 18)
    .toUpperCase();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#fff7ed" />
          <stop offset="100%" stop-color="#fed7aa" />
        </linearGradient>
        <linearGradient id="accent" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#fb923c" />
          <stop offset="100%" stop-color="#ea580c" />
        </linearGradient>
      </defs>
      <rect width="480" height="480" rx="48" fill="url(#bg)" />
      <circle cx="370" cy="120" r="76" fill="#ffedd5" />
      <circle cx="110" cy="360" r="88" fill="#ffedd5" />
      <rect x="78" y="120" width="324" height="240" rx="36" fill="#ffffff" opacity="0.88" />
      <rect x="128" y="166" width="224" height="28" rx="14" fill="url(#accent)" opacity="0.92" />
      <rect x="128" y="214" width="186" height="18" rx="9" fill="#fdba74" />
      <rect x="128" y="250" width="250" height="18" rx="9" fill="#fdba74" />
      <rect x="128" y="286" width="132" height="18" rx="9" fill="#fdba74" />
      <text x="240" y="382" text-anchor="middle" font-size="30" font-family="Arial, sans-serif" fill="#9a3412" font-weight="700">${text}</text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function resolveImageUrl(imageUrl, label) {
  if (!imageUrl) {
    return buildFallbackThumb(label);
  }

  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("data:") ||
    imageUrl.startsWith("blob:")
  ) {
    return imageUrl;
  }

  if (imageUrl.startsWith("/")) {
    return `${backendOrigin}${imageUrl}`;
  }

  return imageUrl;
}

function scrollToSection(sectionId) {
  const target = document.getElementById(sectionId);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export default function UserDashboard() {
  const { user } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [addingProductId, setAddingProductId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [chatPeers, setChatPeers] = useState([]);
  const [selectedChatKey, setSelectedChatKey] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [messageForm, setMessageForm] = useState({ message: "" });
  const [orderForm, setOrderForm] = useState(initialOrderForm);
  const [quantityByProduct, setQuantityByProduct] = useState({});
  const [paymentQr, setPaymentQr] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const productsById = useMemo(
    () => Object.fromEntries(products.map((product) => [product.id, product])),
    [products],
  );

  const totalCartValue = useMemo(
    () =>
      cartItems.reduce((sum, item) => sum + Number(item.line_total || 0), 0),
    [cartItems],
  );

  const totalCartItems = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cartItems],
  );

  const selectedChatThread = useMemo(
    () => chatPeers.find((thread) => thread.key === selectedChatKey) || null,
    [chatPeers, selectedChatKey],
  );

  const activeProduct = selectedProduct || products[0] || null;

  function normalizeQuantity(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return 1;
    }
    return parsed;
  }

  const loadProducts = useCallback(
    async (currentKeyword = keyword) => {
      const params = new URLSearchParams();
      if (currentKeyword.trim()) {
        params.set("query", currentKeyword.trim());
      }
      const data = await apiGet(
        `/api/user/products${params.toString() ? `?${params}` : ""}`,
      );
      const nextProducts = safeItems(data.items);
      setProducts(nextProducts);
      setSelectedProduct((currentSelected) =>
        currentSelected &&
        nextProducts.some((product) => product.id === currentSelected.id)
          ? currentSelected
          : nextProducts[0] || null,
      );
    },
    [keyword],
  );

  const loadCart = useCallback(async () => {
    const data = await apiGet("/api/user/cart");
    setCartItems(safeItems(data.items));
  }, []);

  const loadOrders = useCallback(async () => {
    const data = await apiGet("/api/user/orders");
    setOrders(safeItems(data.items));
  }, []);

  const loadChatPeers = useCallback(async () => {
    const data = await apiGet("/api/user/chat-peers");
    setChatPeers(safeItems(data.items));
  }, []);

  const loadOrderDetail = async (orderId) => {
    if (!orderId) {
      setSelectedOrder(null);
      setOrderDetail(null);
      return;
    }
    setSelectedOrder(orderId);
    const data = await apiGet(`/api/user/orders/${orderId}`);
    setOrderDetail(data);
    setPaymentQr(null);
    setOrderForm((prev) => ({
      ...prev,
      shipping_address: data.shipping_address || prev.shipping_address,
      shipping_phone: data.shipping_phone || prev.shipping_phone,
      payment_method: data.payment_method || prev.payment_method,
    }));
  };

  const refreshAll = useCallback(async () => {
    await Promise.all([loadProducts(), loadCart(), loadOrders()]);
  }, [loadProducts, loadCart, loadOrders]);

  useEffect(() => {
    Promise.all([refreshAll(), loadChatPeers()]).catch((error) =>
      setNotice(error.message),
    );
  }, [refreshAll, loadChatPeers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts().catch((error) => setNotice(error.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  useEffect(() => {
    if (!chatPeers.length) {
      setSelectedChatKey("");
      setChatMessages([]);
      return;
    }

    if (
      !selectedChatKey ||
      !chatPeers.some((thread) => thread.key === selectedChatKey)
    ) {
      setSelectedChatKey(chatPeers[0].key);
    }
  }, [chatPeers, selectedChatKey]);

  useEffect(() => {
    if (!selectedChatThread) {
      setChatMessages([]);
      return;
    }

    const loadSelectedChat = async () => {
      const path =
        selectedChatThread.peer_type === "DELIVERY"
          ? `/api/user/chat/delivery/${selectedChatThread.peer_id}?order_id=${selectedChatThread.order_id}`
          : selectedChatThread.order_id
            ? `/api/user/chat/seller/${selectedChatThread.peer_id}?order_id=${selectedChatThread.order_id}`
            : `/api/user/chat/seller/${selectedChatThread.peer_id}`;
      const data = await apiGet(path);
      setChatMessages(safeItems(data.items));
    };

    loadSelectedChat().catch((error) => setNotice(error.message));
  }, [selectedChatThread]);

  const onAddToCart = async (productId) => {
    const product = productsById[productId];
    if (!product) {
      setNotice("Khong tim thay san pham de them vao gio hang");
      return;
    }

    try {
      const quantity = normalizeQuantity(quantityByProduct[productId] || 1);
      if (Number(product.stock || 0) > 0 && quantity > Number(product.stock)) {
        setNotice(`So luong vuot qua ton kho hien tai (${product.stock})`);
        return;
      }

      setAddingProductId(productId);
      await apiPost("/api/user/cart", { product_id: productId, quantity });
      setNotice("Da them vao gio hang");
      setQuantityByProduct((prev) => ({
        ...prev,
        [productId]: 1,
      }));
      await loadCart();
      scrollToSection("cart-section");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setAddingProductId(null);
    }
  };

  const onUpdateCart = async (cartId, quantity) => {
    try {
      await apiPatch(`/api/user/cart/${cartId}`, { quantity });
      await loadCart();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onDeleteCart = async (cartId) => {
    try {
      await apiDelete(`/api/user/cart/${cartId}`);
      await loadCart();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onPlaceOrder = async (event) => {
    event.preventDefault();
    try {
      const data = await apiPost("/api/user/orders", orderForm);
      const orderIds = Array.isArray(data.order_ids)
        ? data.order_ids
        : data.order_id
          ? [data.order_id]
          : [];
      if (orderIds.length > 1) {
        setNotice(
          `Da tao ${orderIds.length} don hang: #${orderIds.join(", #")}`,
        );
      } else if (orderIds.length === 1) {
        setNotice(`Da tao don hang #${orderIds[0]}`);
      } else {
        setNotice("Da tao don hang");
      }
      setOrderForm(initialOrderForm);
      await Promise.all([loadCart(), loadOrders()]);
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onPayOrder = async (orderId) => {
    try {
      const result = await apiPost(`/api/user/orders/${orderId}/pay`, {
        method: orderForm.payment_method || "COD",
      });
      setNotice(`Thanh toan: ${result.payment_status}`);
      await loadOrders();
      if (selectedOrder === orderId) {
        await loadOrderDetail(orderId);
      }
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onLoadPaymentQr = async (orderId) => {
    try {
      const method = (orderForm.payment_method || "BANKING").toUpperCase();
      if (method === "COD") {
        setNotice("COD khong can tao ma QR");
        return;
      }
      setQrLoading(true);
      const data = await apiGet(
        `/api/user/orders/${orderId}/payment-qr?method=${method}`,
      );
      setPaymentQr(data);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setQrLoading(false);
    }
  };

  const onSendMessage = async (event) => {
    event.preventDefault();
    if (!selectedChatThread) {
      setNotice("Hay chon mot cuoc tro chuyen truoc khi gui tin nhan");
      return;
    }

    try {
      await apiPost("/api/user/chat", {
        peer_type: selectedChatThread.peer_type,
        peer_id: Number(selectedChatThread.peer_id),
        order_id: selectedChatThread.order_id || undefined,
        message: messageForm.message,
      });
      setNotice("Da gui chat toi shop");
      setMessageForm({ message: "" });
      const path =
        selectedChatThread.peer_type === "DELIVERY"
          ? `/api/user/chat/delivery/${selectedChatThread.peer_id}?order_id=${selectedChatThread.order_id}`
          : selectedChatThread.order_id
            ? `/api/user/chat/seller/${selectedChatThread.peer_id}?order_id=${selectedChatThread.order_id}`
            : `/api/user/chat/seller/${selectedChatThread.peer_id}`;
      const data = await apiGet(path);
      setChatMessages(safeItems(data.items));
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <main className="shop-page">
      <div className="shop-shell">
        <header className="shop-topbar">
          <div className="shop-brand">
            <div className="shop-brand-mark">SV</div>
            <div>
              <div className="shop-brand-name">SmartVision Shop</div>
              <div className="shop-brand-subtitle">
                Giao dien ban hang style Shopee
              </div>
            </div>
          </div>

          <label className="shop-search">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tim san pham, shop, voucher..."
            />
            <button
              className="primary-btn"
              type="button"
              onClick={() => loadProducts(keyword)}
            >
              Tim ngay
            </button>
          </label>

          <div className="shop-actions">
            <button
              className="ghost-btn"
              type="button"
              onClick={() => scrollToSection("cart-section")}
            >
              Gio hang ({totalCartItems})
            </button>
            <button
              className="secondary-btn"
              type="button"
              onClick={() => scrollToSection("orders-section")}
            >
              Don hang
            </button>
          </div>
        </header>

        <section className="shop-hero">
          <div className="hero-copy">
            <span className="shop-badge">8.8 Mega Sale</span>
            <h1>Mua sam nhanh, dep va co anh san pham ro rang</h1>
            <p>
              Khong khi Shopee cho khu khach hang: banner lon, san pham noi bat,
              gio hang co thumbnail, va don hang nam ngay tren mot man hinh.
            </p>

            <div className="hero-actions">
              <button
                className="primary-btn"
                type="button"
                onClick={() => scrollToSection("products-section")}
              >
                Xem san pham
              </button>
              <button
                className="secondary-btn"
                type="button"
                onClick={() => scrollToSection("cart-section")}
              >
                Den gio hang
              </button>
            </div>

            <div className="hero-pills">
              <span>Freeship xtra</span>
              <span>Voucher moi ngay</span>
              <span>Ho tro chat shop</span>
            </div>

            <div className="shop-hero-stats">
              <article>
                <strong>{products.length}</strong>
                <span>San pham</span>
              </article>
              <article>
                <strong>{cartItems.length}</strong>
                <span>Mon trong gio</span>
              </article>
              <article>
                <strong>{formatMoney(totalCartValue)}</strong>
                <span>Tam tinh</span>
              </article>
            </div>
          </div>

          <div className="hero-visual">
            {activeProduct ? (
              <>
                <img
                  src={resolveImageUrl(
                    activeProduct.image_url,
                    activeProduct.name,
                  )}
                  alt={activeProduct.name}
                />
                <div className="hero-floating-card">
                  <span className="small-text">San pham noi bat</span>
                  <h3>{activeProduct.name}</h3>
                  <strong>{formatMoney(activeProduct.price)}</strong>
                </div>
              </>
            ) : (
              <div className="hero-empty-state">
                <h3>Chua co san pham</h3>
                <p>Hay tai lai hoac doi tu khoa tim kiem.</p>
              </div>
            )}
          </div>
        </section>

        {notice && <div className="shop-notice">{notice}</div>}

        <section className="shop-category-strip">
          {shopCategories.map((category) => (
            <button
              key={category}
              className="category-chip"
              type="button"
              onClick={() => setKeyword(category)}
            >
              {category}
            </button>
          ))}
        </section>

        <section className="shop-grid">
          <div className="shop-main">
            <section className="shop-section" id="products-section">
              <div className="section-head">
                <div>
                  <h2>San pham noi bat</h2>
                  <p>Card san pham lon, co anh, co gia, co nut them vao gio.</p>
                </div>
                <div className="section-meta">{products.length} san pham</div>
              </div>

              <div className="product-grid">
                {products.map((product) => {
                  const isActive = activeProduct?.id === product.id;
                  return (
                    <article
                      key={product.id}
                      className={`product-card ${isActive ? "is-active" : ""}`}
                      onClick={() => setSelectedProduct(product)}
                    >
                      <div className="product-media">
                        <img
                          src={resolveImageUrl(product.image_url, product.name)}
                          alt={product.name}
                        />
                        <span className="product-badge">Deal</span>
                      </div>

                      <div className="product-body">
                        <h3>{product.name}</h3>
                        <p>
                          {product.description ||
                            "Giao dien ro rang, co anh minh hoa va nut mua nhanh."}
                        </p>

                        <div className="product-price-row">
                          <span className="product-price">
                            {formatMoney(product.price)}
                          </span>
                          <span className="product-stock">
                            Con {product.stock}
                          </span>
                        </div>

                        <div className="product-footer">
                          <label
                            className="qty-control"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <span>SL</span>
                            <input
                              className="field-input qty-input"
                              type="number"
                              min="1"
                              value={quantityByProduct[product.id] || 1}
                              onChange={(event) =>
                                setQuantityByProduct((prev) => ({
                                  ...prev,
                                  [product.id]: normalizeQuantity(
                                    event.target.value,
                                  ),
                                }))
                              }
                            />
                          </label>

                          <button
                            className="primary-btn"
                            type="button"
                            disabled={
                              addingProductId === product.id ||
                              Number(product.stock || 0) < 1
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              onAddToCart(product.id);
                            }}
                          >
                            {addingProductId === product.id
                              ? "Dang them..."
                              : Number(product.stock || 0) < 1
                                ? "Het hang"
                                : "Them vao gio"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <div className="two-col shop-bottom-grid">
              <section className="shop-section" id="orders-section">
                <div className="section-head">
                  <div>
                    <h2>Theo doi don hang</h2>
                    <p>Danhsach don, trang thai va chi tiet thanh toan.</p>
                  </div>
                </div>

                <div className="order-list">
                  {orders.map((order) => (
                    <article key={order.id} className="order-card">
                      <div>
                        <div className="order-title">Don #{order.id}</div>
                        <div className="small-text">
                          {formatDateTime(order.created_at)}
                        </div>
                      </div>
                      <div className="order-meta">
                        <span className="order-status">{order.status}</span>
                        <strong>
                          {formatMoney(
                            Number(order.total_amount || 0) +
                              Number(order.shipping_fee || 0),
                          )}
                        </strong>
                      </div>
                      <button
                        className="ghost-btn"
                        type="button"
                        onClick={() => loadOrderDetail(order.id)}
                      >
                        Xem chi tiet
                      </button>
                    </article>
                  ))}
                </div>

                {orderDetail && (
                  <div className="detail-card">
                    <div className="section-head compact">
                      <div>
                        <h3>Chi tiet don #{orderDetail.id}</h3>
                        <p>Thong tin giao hang va trang thai thanh toan.</p>
                      </div>
                    </div>
                    <div className="detail-grid">
                      <article>
                        <span>Trang thai</span>
                        <strong>{orderDetail.status}</strong>
                      </article>
                      <article>
                        <span>Thanh toan</span>
                        <strong>{orderDetail.payment_status}</strong>
                      </article>
                      <article>
                        <span>Ma giao dich</span>
                        <strong>
                          {orderDetail.payment_transaction_code || "-"}
                        </strong>
                      </article>
                      <article>
                        <span>So san pham</span>
                        <strong>{safeItems(orderDetail.items).length}</strong>
                      </article>
                    </div>
                    <div className="detail-grid" style={{ marginTop: 10 }}>
                      <article>
                        <span>Tong thanh toan</span>
                        <strong>
                          {formatMoney(
                            Number(orderDetail.total_amount || 0) +
                              Number(orderDetail.shipping_fee || 0),
                          )}
                        </strong>
                      </article>
                    </div>
                    <div className="action-row" style={{ marginTop: 14 }}>
                      {String(orderForm.payment_method || "").toUpperCase() !==
                        "COD" && (
                        <button
                          className="secondary-btn"
                          type="button"
                          onClick={() => onLoadPaymentQr(orderDetail.id)}
                          disabled={qrLoading}
                        >
                          {qrLoading ? "Dang tao QR..." : "Tao ma QR"}
                        </button>
                      )}
                      <button
                        className="primary-btn"
                        type="button"
                        onClick={() => onPayOrder(orderDetail.id)}
                      >
                        {String(
                          orderForm.payment_method || "",
                        ).toUpperCase() === "COD"
                          ? "Xac nhan COD"
                          : "Da quet QR, xac nhan"}
                      </button>
                    </div>

                    {paymentQr && (
                      <div className="detail-card" style={{ marginTop: 14 }}>
                        <div className="section-head compact">
                          <div>
                            <h3>Ma QR thanh toan</h3>
                            <p>
                              Quet ma de thanh toan dung so tien:{" "}
                              <strong>{formatMoney(paymentQr.amount)}</strong>
                            </p>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gap: 10,
                            justifyItems: "center",
                          }}
                        >
                          <img
                            src={paymentQr.qr_url}
                            alt={`QR thanh toan don ${paymentQr.order_id}`}
                            style={{
                              width: 260,
                              maxWidth: "100%",
                              borderRadius: 16,
                              border: "1px solid rgba(238, 77, 45, 0.18)",
                              background: "#fff",
                              padding: 10,
                            }}
                          />
                          <div className="small-text">
                            Phuong thuc: {paymentQr.method}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="shop-section" id="chat-section">
                <div className="section-head">
                  <div>
                    <h2>Danh sach chat</h2>
                    <p>
                      Chon shop hoac shipper cua don hang de mo dung cuoc tro
                      chuyen.
                    </p>
                  </div>
                </div>

                <div className="chat-panel" style={{ marginBottom: 14 }}>
                  <div className="chat-rail">
                    <div className="chat-rail-head">
                      <div>
                        <div className="small-text">Cuoc tro chuyen</div>
                        <strong>{chatPeers.length} thread</strong>
                      </div>
                      <span className="section-meta">Inbox</span>
                    </div>

                    <div className="chat-thread-list">
                      {chatPeers.map((thread) => {
                        const isActive = selectedChatKey === thread.key;
                        return (
                          <button
                            key={thread.key}
                            type="button"
                            className={`chat-thread-card ${isActive ? "is-active" : ""}`}
                            onClick={() => setSelectedChatKey(thread.key)}
                          >
                            <div className="chat-thread-top">
                              <div>
                                <div className="chat-thread-badge">
                                  {thread.peer_type === "DELIVERY"
                                    ? "Shipper"
                                    : "Shop"}
                                </div>
                                <h3 className="chat-thread-title">
                                  {thread.label}
                                </h3>
                              </div>
                              {thread.order_id ? (
                                <span className="section-meta">
                                  #{thread.order_id}
                                </span>
                              ) : null}
                            </div>
                            <div className="chat-thread-subtitle">
                              {thread.subtitle}
                            </div>
                            <div className="chat-thread-meta">
                              <span>
                                {thread.peer_type === "DELIVERY"
                                  ? "Gan voi don hang"
                                  : "Lich su shop"}
                              </span>
                              <span>
                                {isActive ? "Dang mo" : "Mo hoi thoai"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="chat-stage">
                    <div className="chat-stage-head">
                      {selectedChatThread ? (
                        <>
                          <div className="small-text">
                            {selectedChatThread.peer_type === "DELIVERY"
                              ? "Shipper cua don hang"
                              : "Shop ban hang"}
                          </div>
                          <h3>{selectedChatThread.label}</h3>
                          <p>{selectedChatThread.subtitle}</p>
                        </>
                      ) : (
                        <>
                          <div className="small-text">
                            Chua chon cuoc tro chuyen
                          </div>
                          <h3>Hay chon 1 thread ben trai</h3>
                          <p>
                            Moi thread se giu nguyen boi canh don hang va nguoi
                            nhan.
                          </p>
                        </>
                      )}
                    </div>

                    <div className="notice">
                      {selectedChatThread
                        ? selectedChatThread.peer_type === "DELIVERY"
                          ? "Chat nay duoc gan voi don hang va shipper cu the."
                          : "Chat nay mo voi shop tu danh sach lich su."
                        : "Chon mot cuoc tro chuyen truoc khi gui tin nhan."}
                    </div>

                    <form className="chat-composer" onSubmit={onSendMessage}>
                      <label className="field-label">
                        Noi dung chat
                        <textarea
                          className="field-textarea"
                          value={messageForm.message}
                          onChange={(event) =>
                            setMessageForm((prev) => ({
                              ...prev,
                              message: event.target.value,
                            }))
                          }
                          placeholder="Hoi shop ve san pham, phien ban, mau sac..."
                        />
                      </label>
                      <button className="primary-btn" type="submit">
                        Gui tin nhan
                      </button>
                    </form>

                    <div className="chat-thread">
                      {selectedChatThread && chatMessages.length ? (
                        chatMessages.map((message) => (
                          <article
                            key={message.id}
                            className={`chat-bubble ${
                              Number(message.sender_id) === Number(user?.id)
                                ? "me"
                                : "them"
                            }`}
                          >
                            <div className="small-text">
                              {message.sender_id === user?.id
                                ? "Ban"
                                : selectedChatThread.peer_type === "DELIVERY"
                                  ? "Shipper"
                                  : "Shop"}
                            </div>
                            <p>{message.message}</p>
                            <span>{formatDateTime(message.created_at)}</span>
                          </article>
                        ))
                      ) : selectedChatThread ? (
                        <p className="muted">Chua co noi dung chat nao.</p>
                      ) : (
                        <p className="muted">
                          Hay chon shop hoac shipper tu danh sach ben tren.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <aside className="shop-sidebar" id="cart-section">
            <div className="section-head compact">
              <div>
                <h2>Gio hang</h2>
                <p>Thumbnail san pham, so luong va tong tien ro rang.</p>
              </div>
            </div>

            <div className="cart-list">
              {cartItems.length ? (
                cartItems.map((item) => {
                  const cartProduct = productsById[item.product_id];
                  const thumb = resolveImageUrl(
                    cartProduct?.image_url,
                    item.name,
                  );

                  return (
                    <article key={item.cart_id} className="cart-item">
                      <img className="cart-thumb" src={thumb} alt={item.name} />

                      <div className="cart-body">
                        <div className="cart-title">{item.name}</div>
                        <div className="cart-price">
                          {formatMoney(item.line_total)}
                        </div>
                        <div className="cart-controls">
                          <label className="qty-control compact">
                            <span>SL</span>
                            <input
                              className="field-input qty-input"
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(event) =>
                                onUpdateCart(
                                  item.cart_id,
                                  Number(event.target.value),
                                )
                              }
                            />
                          </label>

                          <button
                            className="ghost-btn"
                            type="button"
                            onClick={() => onDeleteCart(item.cart_id)}
                          >
                            Xoa
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="empty-card">
                  <h3>Gio hang dang trong</h3>
                  <p>Hay chon san pham ben trai va them vao gio.</p>
                </div>
              )}
            </div>

            <div className="cart-summary">
              <div className="summary-row">
                <span>Tam tinh</span>
                <strong>{formatMoney(totalCartValue)}</strong>
              </div>
              <div className="summary-row">
                <span>Mon hang</span>
                <strong>{totalCartItems}</strong>
              </div>
            </div>

            <form className="form-grid checkout-form" onSubmit={onPlaceOrder}>
              <label className="field-label">
                Dia chi giao hang
                <input
                  className="field-input"
                  value={orderForm.shipping_address}
                  onChange={(event) =>
                    setOrderForm((prev) => ({
                      ...prev,
                      shipping_address: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="field-label">
                So dien thoai
                <input
                  className="field-input"
                  value={orderForm.shipping_phone}
                  onChange={(event) =>
                    setOrderForm((prev) => ({
                      ...prev,
                      shipping_phone: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="field-label">
                Thanh toan
                <select
                  className="field-select"
                  value={orderForm.payment_method}
                  onChange={(event) =>
                    setOrderForm((prev) => ({
                      ...prev,
                      payment_method: event.target.value,
                    }))
                  }
                >
                  <option value="COD">COD</option>
                  <option value="BANKING">BANKING</option>
                  <option value="MOMO">MOMO</option>
                </select>
              </label>

              <label className="field-label">
                Ghi chu
                <input
                  className="field-input"
                  value={orderForm.note}
                  onChange={(event) =>
                    setOrderForm((prev) => ({
                      ...prev,
                      note: event.target.value,
                    }))
                  }
                  placeholder="Chon mau, size, thoi gian giao..."
                />
              </label>

              <button
                className="primary-btn"
                type="submit"
                disabled={!cartItems.length}
              >
                Dat hang ngay
              </button>
            </form>
          </aside>
        </section>
      </div>
    </main>
  );
}
