import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../services/http";
import { formatMoney, safeItems } from "../dashboardUtils";

const initialOrderForm = {
  shipping_address: "",
  shipping_phone: "",
  payment_method: "COD",
  note: "",
};

const shopCategories = [
  "Flash sale",
  "Điện tử",
  "Thời trang",
  "Gia dụng",
  "Làm đẹp",
  "Mẹ và bé",
  "Voucher",
  "Freeship",
];

const INITIAL_VISIBLE_PRODUCTS = 8;

const backendOrigin = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://127.0.0.1:5000"
)
  .trim()
  .replace(/\/+$/, "");

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
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [addingProductId, setAddingProductId] = useState(null);
  const [quantityByProduct, setQuantityByProduct] = useState({});
  const [orderForm, setOrderForm] = useState(initialOrderForm);
  const [notice, setNotice] = useState("");
  const [showAllProducts, setShowAllProducts] = useState(false);

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

  const visibleProducts = useMemo(
    () =>
      showAllProducts ? products : products.slice(0, INITIAL_VISIBLE_PRODUCTS),
    [products, showAllProducts],
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

  const refreshAll = useCallback(async () => {
    await Promise.all([loadProducts(), loadCart()]);
  }, [loadProducts, loadCart]);

  useEffect(() => {
    refreshAll().catch((error) => setNotice(error.message));
  }, [refreshAll]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts().catch((error) => setNotice(error.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  const onAddToCart = async (productId) => {
    const product = productsById[productId];
    if (!product) {
      setNotice("Không tìm thấy sản phẩm để thêm vào giỏ hàng");
      return;
    }

    try {
      const quantity = normalizeQuantity(quantityByProduct[productId] || 1);
      if (Number(product.stock || 0) > 0 && quantity > Number(product.stock)) {
        setNotice(`Số lượng vượt quá tồn kho hiện tại (${product.stock})`);
        return;
      }

      setAddingProductId(productId);
      await apiPost("/api/user/cart", { product_id: productId, quantity });
      setNotice("Đã thêm vào giỏ hàng");
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
          `Đã tạo ${orderIds.length} đơn hàng: #${orderIds.join(", #")}. Xem ở trang Đơn hàng & Chat.`,
        );
      } else if (orderIds.length === 1) {
        setNotice(
          `Đã tạo đơn hàng #${orderIds[0]}. Xem ở trang Đơn hàng & Chat.`,
        );
      } else {
        setNotice("Đã tạo đơn hàng.");
      }
      setOrderForm(initialOrderForm);
      await loadCart();
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
                Giao diện bán hàng style Shopee
              </div>
            </div>
          </div>

          <label className="shop-search">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm sản phẩm, shop, voucher..."
            />
            <button
              className="primary-btn"
              type="button"
              onClick={() => loadProducts(keyword)}
            >
              Tìm ngay
            </button>
          </label>

          <div className="shop-actions">
            <button
              className="ghost-btn"
              type="button"
              onClick={() => scrollToSection("cart-section")}
            >
              Giỏ hàng ({totalCartItems})
            </button>
            <button
              className="secondary-btn"
              type="button"
              onClick={() => navigate("/user/orders-chat")}
            >
              Đơn hàng + Chat
            </button>
          </div>
        </header>

        <section className="shop-hero">
          <div className="hero-copy">
            <span className="shop-badge">8.8 Mega Sale</span>
            <h1>Mua sắm nhanh, đẹp và có ảnh sản phẩm rõ ràng</h1>
            <p>
              Không khí Shopee cho khu khách hàng: banner lớn, sản phẩm nổi bật,
              giỏ hàng có thumbnail, và tách riêng trang theo dõi đơn/chat cho
              gọn hơn.
            </p>

            <div className="hero-actions">
              <button
                className="primary-btn"
                type="button"
                onClick={() => scrollToSection("products-section")}
              >
                Xem sản phẩm
              </button>
              <button
                className="secondary-btn"
                type="button"
                onClick={() => navigate("/user/orders-chat")}
              >
                Đơn hàng + Chat
              </button>
            </div>

            <div className="hero-pills">
              <span>Freeship xtra</span>
              <span>Voucher mỗi ngày</span>
              <span>Hỗ trợ chat shop</span>
            </div>

            <div className="shop-hero-stats">
              <article>
                <strong>{products.length}</strong>
                <span>Sản phẩm</span>
              </article>
              <article>
                <strong>{cartItems.length}</strong>
                <span>Món trong giỏ</span>
              </article>
              <article>
                <strong>{formatMoney(totalCartValue)}</strong>
                <span>Tạm tính</span>
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
                  <span className="small-text">Sản phẩm nổi bật</span>
                  <h3>{activeProduct.name}</h3>
                  <strong>{formatMoney(activeProduct.price)}</strong>
                </div>
              </>
            ) : (
              <div className="hero-empty-state">
                <h3>Chưa có sản phẩm</h3>
                <p>Hãy tải lại hoặc đổi từ khóa tìm kiếm.</p>
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
                  <h2>Sản phẩm nổi bật</h2>
                  <p>
                    Mặc định hiển thị gọn {INITIAL_VISIBLE_PRODUCTS} sản phẩm,
                    bấm Xem thêm để mở toàn bộ.
                  </p>
                </div>
                <div className="section-meta">
                  {visibleProducts.length}/{products.length} sản phẩm
                </div>
              </div>

              <div className="product-grid">
                {visibleProducts.map((product) => {
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
                            "Giao diện rõ ràng, có ảnh minh họa và nút mua nhanh."}
                        </p>

                        <div className="product-price-row">
                          <span className="product-price">
                            {formatMoney(product.price)}
                          </span>
                          <span className="product-stock">
                            Còn {product.stock}
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
                              ? "Đang thêm..."
                              : Number(product.stock || 0) < 1
                                ? "Hết hàng"
                                : "Thêm vào giỏ"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {products.length > INITIAL_VISIBLE_PRODUCTS && (
                <div className="action-row" style={{ marginTop: 14 }}>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setShowAllProducts((prev) => !prev)}
                  >
                    {showAllProducts ? "Thu gọn" : "Xem thêm"}
                  </button>
                </div>
              )}
            </section>
          </div>

          <aside className="shop-sidebar" id="cart-section">
            <div className="section-head compact">
              <div>
                <h2>Giỏ hàng</h2>
                <p>Thumbnail sản phẩm, số lượng và tổng tiền rõ ràng.</p>
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
                            Xóa
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="empty-card">
                  <h3>Giỏ hàng đang trống</h3>
                  <p>Hãy chọn sản phẩm bên trái và thêm vào giỏ.</p>
                </div>
              )}
            </div>

            <div className="cart-summary">
              <div className="summary-row">
                <span>Tạm tính</span>
                <strong>{formatMoney(totalCartValue)}</strong>
              </div>
              <div className="summary-row">
                <span>Món hàng</span>
                <strong>{totalCartItems}</strong>
              </div>
            </div>

            <form className="form-grid checkout-form" onSubmit={onPlaceOrder}>
              <label className="field-label">
                Địa chỉ giao hàng
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
                Số điện thoại
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
                Thanh toán
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
                Ghi chú
                <input
                  className="field-input"
                  value={orderForm.note}
                  onChange={(event) =>
                    setOrderForm((prev) => ({
                      ...prev,
                      note: event.target.value,
                    }))
                  }
                  placeholder="Chọn màu, size, thời gian giao..."
                />
              </label>

              <button
                className="primary-btn"
                type="submit"
                disabled={!cartItems.length}
              >
                Đặt hàng ngay
              </button>
            </form>
          </aside>
        </section>
      </div>
    </main>
  );
}
