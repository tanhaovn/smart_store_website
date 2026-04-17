import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../services/http";
import { formatDateTime, formatMoney, safeItems } from "../dashboardUtils";
import { useAuth } from "../../auth/useAuth";

const initialProductForm = {
  name: "",
  price: "",
  stock: 0,
  category_id: "",
  image_url: "",
  description: "",
};

const initialCategoryForm = { name: "", description: "" };

const backendOrigin =
  import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:5000";

function buildFallbackProductThumb(label) {
  const text = String(label || "San pham")
    .trim()
    .slice(0, 18)
    .toUpperCase();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#ecfeff" />
          <stop offset="100%" stop-color="#ccfbf1" />
        </linearGradient>
        <linearGradient id="accent" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#0f766e" />
          <stop offset="100%" stop-color="#14b8a6" />
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="28" fill="url(#bg)" />
      <circle cx="188" cy="56" r="28" fill="#f0fdfa" />
      <circle cx="52" cy="190" r="32" fill="#f0fdfa" />
      <rect x="38" y="44" width="164" height="152" rx="24" fill="#ffffff" opacity="0.95" />
      <rect x="58" y="68" width="124" height="18" rx="9" fill="url(#accent)" opacity="0.95" />
      <rect x="58" y="100" width="98" height="12" rx="6" fill="#5eead4" />
      <rect x="58" y="122" width="118" height="12" rx="6" fill="#5eead4" />
      <rect x="58" y="144" width="76" height="12" rx="6" fill="#5eead4" />
      <text x="120" y="202" text-anchor="middle" font-size="18" font-family="Segoe UI, Arial, sans-serif" fill="#0f766e" font-weight="700">${text}</text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildFallbackAvatar(label) {
  const parts = String(label || "Khach")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials = (
    parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("") || "KH"
  ).toUpperCase();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#ecfeff" />
          <stop offset="100%" stop-color="#ccfbf1" />
        </linearGradient>
        <linearGradient id="ring" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#0f766e" />
          <stop offset="100%" stop-color="#14b8a6" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="80" r="80" fill="url(#bg)" />
      <circle cx="80" cy="80" r="64" fill="#ffffff" opacity="0.72" />
      <circle cx="80" cy="62" r="24" fill="url(#ring)" opacity="0.96" />
      <path d="M40 124c10-20 28-30 40-30s30 10 40 30" fill="url(#ring)" opacity="0.96" />
      <text x="80" y="90" text-anchor="middle" font-size="30" font-family="Segoe UI, Arial, sans-serif" fill="#ffffff" font-weight="800">${initials}</text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function resolveImageUrl(
  imageUrl,
  fallbackLabel,
  fallbackBuilder = buildFallbackProductThumb,
) {
  if (!imageUrl) {
    return fallbackBuilder(fallbackLabel);
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

export default function SellerDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [chatUsers, setChatUsers] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [revenue, setRevenue] = useState({
    total_revenue: 0,
    completed_orders: 0,
  });
  const [chatMessages, setChatMessages] = useState([]);
  const [notice, setNotice] = useState("");
  const [productForm, setProductForm] = useState(initialProductForm);
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm);
  const [promotionForm, setPromotionForm] = useState({
    code: "",
    discount_percent: 10,
  });
  const [orderStatusById, setOrderStatusById] = useState({});
  const [chatForm, setChatForm] = useState({
    user_id: "",
    message: "",
    order_id: "",
  });
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [inventoryDraftById, setInventoryDraftById] = useState({});
  const [busyProductId, setBusyProductId] = useState(null);
  const [activePanel, setActivePanel] = useState("products");

  const sellerPanels = useMemo(
    () => [
      {
        key: "products",
        label: "San pham",
        count: products.length,
        hint: "CRUD",
      },
      {
        key: "categories",
        label: "Danh muc",
        count: categories.length,
        hint: "CRUD",
      },
      {
        key: "orders",
        label: "Don hang",
        count: orders.length,
        hint: "Status",
      },
      {
        key: "promotions",
        label: "Khuyen mai",
        count: promotions.length,
        hint: "Deals",
      },
      { key: "chat", label: "Chat", count: chatUsers.length, hint: "Inbox" },
    ],
    [
      products.length,
      categories.length,
      orders.length,
      promotions.length,
      chatUsers.length,
    ],
  );

  const activePanelMeta =
    sellerPanels.find((panel) => panel.key === activePanel) || sellerPanels[0];

  const chatUserById = useMemo(
    () => Object.fromEntries(chatUsers.map((user) => [String(user.id), user])),
    [chatUsers],
  );

  const selectedChatUser =
    (chatForm.user_id && chatUserById[String(chatForm.user_id)]) || null;

  function normalizeStock(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return parsed;
  }

  async function refreshAll() {
    const [
      productData,
      categoryData,
      orderData,
      chatUserData,
      promotionData,
      revenueData,
    ] = await Promise.all([
      apiGet("/api/seller/products"),
      apiGet("/api/seller/categories"),
      apiGet("/api/seller/orders"),
      apiGet("/api/seller/chat-users"),
      apiGet("/api/seller/promotions"),
      apiGet("/api/seller/revenue"),
    ]);
    setProducts(safeItems(productData.items));
    setCategories(safeItems(categoryData.items));
    setOrders(safeItems(orderData.items));
    setChatUsers(safeItems(chatUserData.items));
    setPromotions(safeItems(promotionData.items));
    setRevenue(revenueData);
  }

  async function loadChatHistory(userId) {
    if (!userId) {
      setChatMessages([]);
      return;
    }
    const data = await apiGet(`/api/seller/chat/${userId}`);
    setChatMessages(safeItems(data.items));
  }

  useEffect(() => {
    refreshAll().catch((error) => setNotice(error.message));
  }, []);

  useEffect(() => {
    if (!chatForm.user_id) {
      setChatMessages([]);
      return;
    }
    loadChatHistory(chatForm.user_id).catch((error) =>
      setNotice(error.message),
    );
  }, [chatForm.user_id]);

  const onCreateProduct = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...productForm,
        price: Number(productForm.price),
        stock: Number(productForm.stock),
        category_id: productForm.category_id
          ? Number(productForm.category_id)
          : undefined,
      };
      if (editingProductId) {
        await apiPatch(`/api/seller/products/${editingProductId}`, payload);
        setNotice(`Da cap nhat san pham #${editingProductId}`);
      } else {
        await apiPost("/api/seller/products", payload);
        setNotice("Da tao san pham moi, dang cho admin duyet");
      }

      setProductForm(initialProductForm);
      setEditingProductId(null);
      await refreshAll();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onSelectProduct = (product) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name || "",
      price: product.price ?? "",
      stock: product.stock ?? 0,
      category_id: product.category_id || "",
      image_url: product.image_url || "",
      description: product.description || "",
    });
  };

  const onDeleteProduct = async (productId) => {
    try {
      await apiDelete(`/api/seller/products/${productId}`);
      setInventoryDraftById((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      await refreshAll();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onSaveInventory = async (productId) => {
    try {
      const stock = normalizeStock(inventoryDraftById[productId]);
      setBusyProductId(productId);
      await apiPatch(`/api/seller/inventory/${productId}`, { stock });
      setNotice(`Da cap nhat ton kho san pham #${productId}`);
      await refreshAll();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusyProductId(null);
    }
  };

  const onCreateCategory = async (event) => {
    event.preventDefault();
    try {
      if (editingCategoryId) {
        await apiPatch(
          `/api/seller/categories/${editingCategoryId}`,
          categoryForm,
        );
        setNotice(`Da cap nhat danh muc #${editingCategoryId}`);
      } else {
        await apiPost("/api/seller/categories", categoryForm);
        setNotice("Da tao danh muc moi");
      }

      setCategoryForm(initialCategoryForm);
      setEditingCategoryId(null);
      await refreshAll();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onSelectCategory = (category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name || "",
      description: category.description || "",
    });
  };

  const onDeleteCategory = async (categoryId) => {
    try {
      await apiDelete(`/api/seller/categories/${categoryId}`);
      if (editingCategoryId === categoryId) {
        setEditingCategoryId(null);
        setCategoryForm(initialCategoryForm);
      }
      await refreshAll();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onUpdateOrderStatus = async (orderId) => {
    try {
      await apiPatch(`/api/seller/orders/${orderId}/status`, {
        status: orderStatusById[orderId] || "CHO_XAC_NHAN",
      });
      await refreshAll();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onCreatePromotion = async (event) => {
    event.preventDefault();
    try {
      await apiPost("/api/seller/promotions", {
        code: promotionForm.code,
        discount_percent: Number(promotionForm.discount_percent),
      });
      setPromotionForm({ code: "", discount_percent: 10 });
      await refreshAll();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onSendChat = async (event) => {
    event.preventDefault();
    try {
      await apiPost("/api/seller/chat", {
        user_id: Number(chatForm.user_id),
        order_id: chatForm.order_id ? Number(chatForm.order_id) : undefined,
        message: chatForm.message,
      });
      setChatForm((prev) => ({ ...prev, message: "" }));
      await loadChatHistory(chatForm.user_id);
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <DashboardLayout
      title="Khu vuc Seller"
      subtitle="Quan ly san pham, danh muc, don hang, khuyen mai va chat voi khach."
      highlights={[
        { label: "San pham", value: products.length },
        { label: "Don hang", value: orders.length },
        { label: "Doanh thu", value: formatMoney(revenue.total_revenue) },
      ]}
    >
      {notice && (
        <section className="panel compact-panel">
          <div className="notice">{notice}</div>
        </section>
      )}

      <section className="panel compact-panel">
        <div className="seller-workspace-head">
          <div>
            <div className="small-text">Ben lam viec</div>
            <h2>{activePanelMeta.label}</h2>
            <p>{activePanelMeta.hint} - giao dien toi uu cho tac vu nhanh.</p>
          </div>
          <div className="workspace-chip">{activePanelMeta.count} items</div>
        </div>

        <div className="seller-tabs">
          {sellerPanels.map((panel) => (
            <button
              key={panel.key}
              type="button"
              className={`seller-tab ${activePanel === panel.key ? "is-active" : ""}`}
              onClick={() => setActivePanel(panel.key)}
            >
              <span>{panel.label}</span>
              <strong>{panel.count}</strong>
            </button>
          ))}
        </div>
      </section>

      {activePanel === "products" && (
        <section className="panel compact-panel">
          <div className="panel-head compact-head">
            <div>
              <h2>CRUD san pham</h2>
              <p>
                Quan ly san pham, ton kho va anh trong mot khu vuc ngan gon.
              </p>
            </div>
            <div className="small-text">{products.length} items</div>
          </div>

          <div className="seller-split">
            <form className="form-grid compact-form" onSubmit={onCreateProduct}>
              <div className="two-col compact-grid">
                <label className="field-label">
                  Ten san pham
                  <input
                    className="field-input"
                    value={productForm.name}
                    onChange={(event) =>
                      setProductForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field-label">
                  Gia
                  <input
                    className="field-input"
                    type="number"
                    min="0"
                    value={productForm.price}
                    onChange={(event) =>
                      setProductForm((prev) => ({
                        ...prev,
                        price: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              </div>
              <div className="two-col compact-grid">
                <label className="field-label">
                  Ton kho
                  <input
                    className="field-input"
                    type="number"
                    min="0"
                    value={productForm.stock}
                    onChange={(event) =>
                      setProductForm((prev) => ({
                        ...prev,
                        stock: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field-label">
                  Category ID
                  <input
                    className="field-input"
                    type="number"
                    value={productForm.category_id}
                    onChange={(event) =>
                      setProductForm((prev) => ({
                        ...prev,
                        category_id: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <label className="field-label">
                Image URL
                <input
                  className="field-input"
                  value={productForm.image_url}
                  onChange={(event) =>
                    setProductForm((prev) => ({
                      ...prev,
                      image_url: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field-label">
                Mo ta
                <input
                  className="field-input"
                  value={productForm.description}
                  onChange={(event) =>
                    setProductForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="action-row compact-actions">
                <button className="primary-btn" type="submit">
                  {editingProductId ? "Luu" : "Tao"}
                </button>
                {editingProductId && (
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => {
                      setEditingProductId(null);
                      setProductForm(initialProductForm);
                    }}
                  >
                    Huy sua
                  </button>
                )}
              </div>
            </form>

            <div className="table-wrap compact-table-wrap">
              <table className="data-table compact-table">
                <thead>
                  <tr>
                    <th>San pham</th>
                    <th>Gia</th>
                    <th>Ton kho</th>
                    <th>CRUD</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="compact-product-cell">
                          <img
                            className="compact-product-thumb"
                            src={resolveImageUrl(
                              product.image_url,
                              product.name,
                            )}
                            alt={product.name}
                          />
                          <div className="compact-product-copy">
                            <strong>{product.name}</strong>
                            <span>
                              {product.is_approved ? "Da duyet" : "Cho duyet"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>{formatMoney(product.price)}</td>
                      <td>
                        <div className="compact-inline">
                          <input
                            className="field-input compact-input"
                            type="number"
                            min="0"
                            value={
                              inventoryDraftById[product.id] ?? product.stock
                            }
                            onChange={(event) =>
                              setInventoryDraftById((prev) => ({
                                ...prev,
                                [product.id]: event.target.value,
                              }))
                            }
                          />
                          <button
                            className="secondary-btn"
                            type="button"
                            disabled={busyProductId === product.id}
                            onClick={() => onSaveInventory(product.id)}
                          >
                            {busyProductId === product.id ? "..." : "Luu"}
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="compact-inline">
                          <button
                            className="ghost-btn"
                            type="button"
                            onClick={() => onSelectProduct(product)}
                          >
                            Sua
                          </button>
                          <button
                            className="danger-btn"
                            type="button"
                            onClick={() => onDeleteProduct(product.id)}
                          >
                            Xoa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {activePanel === "categories" && (
        <section className="panel compact-panel">
          <div className="panel-head compact-head">
            <div>
              <h2>CRUD danh muc</h2>
              <p>Tao, sua, xoa danh muc trong 1 man hinh ngan gon.</p>
            </div>
            <div className="small-text">{categories.length} categories</div>
          </div>
          <div className="seller-split">
            <form
              className="form-grid compact-form"
              onSubmit={onCreateCategory}
            >
              <label className="field-label">
                Ten danh muc
                <input
                  className="field-input"
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="field-label">
                Mo ta
                <input
                  className="field-input"
                  value={categoryForm.description}
                  onChange={(event) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="action-row compact-actions">
                <button className="primary-btn" type="submit">
                  {editingCategoryId ? "Luu" : "Tao"}
                </button>
                {editingCategoryId && (
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => {
                      setEditingCategoryId(null);
                      setCategoryForm(initialCategoryForm);
                    }}
                  >
                    Huy sua
                  </button>
                )}
              </div>
            </form>

            <div className="table-wrap compact-table-wrap">
              <table className="data-table compact-table">
                <thead>
                  <tr>
                    <th>Danh muc</th>
                    <th>Mo ta</th>
                    <th>CRUD</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td>{category.name}</td>
                      <td>{category.description || "-"}</td>
                      <td>
                        <div className="compact-inline">
                          <button
                            className="ghost-btn"
                            type="button"
                            onClick={() => onSelectCategory(category)}
                          >
                            Sua
                          </button>
                          <button
                            className="danger-btn"
                            type="button"
                            onClick={() => onDeleteCategory(category.id)}
                          >
                            Xoa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {activePanel === "orders" && (
        <section className="panel compact-panel">
          <div className="panel-head compact-head">
            <div>
              <h2>CRUD don hang</h2>
              <p>Cap nhat trang thai don trong bang ngan va ro.</p>
            </div>
            <div className="small-text">{orders.length} orders</div>
          </div>
          <div className="table-wrap compact-table-wrap">
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>Don</th>
                  <th>Khach</th>
                  <th>Trang thai</th>
                  <th>Thanh tien</th>
                  <th>CRUD</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.user_id}</td>
                    <td>{order.status}</td>
                    <td>
                      {formatMoney(
                        Number(order.total_amount || 0) +
                          Number(order.shipping_fee || 0),
                      )}
                    </td>
                    <td>
                      <div className="compact-inline">
                        <select
                          className="field-select compact-select"
                          value={orderStatusById[order.id] || order.status}
                          onChange={(event) =>
                            setOrderStatusById((prev) => ({
                              ...prev,
                              [order.id]: event.target.value,
                            }))
                          }
                        >
                          <option value="CHO_XAC_NHAN">CHO_XAC_NHAN</option>
                          <option value="DANG_CHUAN_BI">DANG_CHUAN_BI</option>
                          <option value="DANG_GIAO">DANG_GIAO</option>
                          <option value="DA_GIAO">DA_GIAO</option>
                        </select>
                        <button
                          className="primary-btn"
                          type="button"
                          onClick={() => onUpdateOrderStatus(order.id)}
                        >
                          Luu
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activePanel === "promotions" && (
        <section className="panel compact-panel">
          <div className="panel-head compact-head">
            <div>
              <h2>CRUD khuyen mai</h2>
              <p>Them ma giam gia va theo doi danh sach nhanh.</p>
            </div>
            <div className="small-text">{promotions.length} codes</div>
          </div>
          <div className="seller-split">
            <form
              className="form-grid compact-form"
              onSubmit={onCreatePromotion}
            >
              <div className="two-col compact-grid">
                <label className="field-label">
                  Ma khuyen mai
                  <input
                    className="field-input"
                    value={promotionForm.code}
                    onChange={(event) =>
                      setPromotionForm((prev) => ({
                        ...prev,
                        code: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field-label">
                  Giam %
                  <input
                    className="field-input"
                    type="number"
                    value={promotionForm.discount_percent}
                    onChange={(event) =>
                      setPromotionForm((prev) => ({
                        ...prev,
                        discount_percent: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              </div>
              <button className="primary-btn" type="submit">
                Tao
              </button>
            </form>
            <div className="table-wrap compact-table-wrap">
              <table className="data-table compact-table">
                <thead>
                  <tr>
                    <th>Ma</th>
                    <th>Giam</th>
                    <th>Trang thai</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((promotion) => (
                    <tr key={promotion.id}>
                      <td>{promotion.code}</td>
                      <td>{promotion.discount_percent}%</td>
                      <td>{promotion.is_active ? "Active" : "Inactive"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {activePanel === "chat" && (
        <section className="panel compact-panel">
          <div className="panel-head compact-head">
            <div>
              <h2>CRUD chat</h2>
              <p>Tra loi khach hang trong khung chat ngan gon.</p>
            </div>
            <div className="small-text">{chatUsers.length} customers</div>
          </div>
          <div className="seller-chat-layout">
            <form className="form-grid compact-form" onSubmit={onSendChat}>
              <div className="two-col compact-grid">
                <label className="field-label">
                  Khach hang
                  <select
                    className="field-select"
                    value={chatForm.user_id}
                    onChange={(event) => {
                      const userId = event.target.value;
                      const selectedUser = chatUserById[userId];
                      setChatForm((prev) => ({
                        ...prev,
                        user_id: userId,
                        order_id:
                          selectedUser?.latest_order_id !== undefined &&
                          selectedUser?.latest_order_id !== null
                            ? String(selectedUser.latest_order_id)
                            : "",
                      }));
                    }}
                    required
                    disabled={!chatUsers.length}
                  >
                    <option value="">
                      {chatUsers.length ? "-- Chon --" : "Chua co"}
                    </option>
                    {chatUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email || `User #${user.id}`}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="chat-user-preview">
                  <img
                    className="compact-avatar"
                    src={resolveImageUrl(
                      selectedChatUser?.avatar_url,
                      selectedChatUser?.full_name || selectedChatUser?.email,
                      buildFallbackAvatar,
                    )}
                    alt={selectedChatUser?.full_name || "Khach hang"}
                  />
                  <div>
                    <strong>
                      {selectedChatUser?.full_name || "Chua chon khach hang"}
                    </strong>
                    <p>
                      {selectedChatUser?.email ||
                        "Chon mot khach hang de hien avatar va luong chat."}
                    </p>
                  </div>
                </div>
                <label className="field-label">
                  Order ID
                  <input
                    className="field-input"
                    type="number"
                    value={chatForm.order_id}
                    onChange={(event) =>
                      setChatForm((prev) => ({
                        ...prev,
                        order_id: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <label className="field-label">
                Noi dung
                <textarea
                  className="field-textarea"
                  value={chatForm.message}
                  onChange={(event) =>
                    setChatForm((prev) => ({
                      ...prev,
                      message: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <button className="primary-btn" type="submit">
                Gui
              </button>
            </form>

            <div className="chat-thread compact-chat-thread">
              {chatMessages.length ? (
                chatMessages.map((message) => (
                  <article
                    key={message.id}
                    className={`chat-bubble ${Number(message.sender_id) === Number(user?.id) ? "me" : "them"}`}
                  >
                    <div className="chat-bubble-head">
                      <img
                        className="compact-avatar compact-avatar-sm"
                        src={resolveImageUrl(
                          Number(message.sender_id) === Number(user?.id)
                            ? user?.avatar_url
                            : selectedChatUser?.avatar_url,
                          Number(message.sender_id) === Number(user?.id)
                            ? user?.full_name || user?.email
                            : selectedChatUser?.full_name ||
                                selectedChatUser?.email,
                          buildFallbackAvatar,
                        )}
                        alt={
                          Number(message.sender_id) === Number(user?.id)
                            ? "Shop"
                            : selectedChatUser?.full_name || "Khach"
                        }
                      />
                      <div>
                        <div className="small-text">
                          {Number(message.sender_id) === Number(user?.id)
                            ? "Shop"
                            : selectedChatUser?.full_name || "Khach"}
                        </div>
                        <div className="chat-bubble-meta">
                          {Number(message.sender_id) === Number(user?.id)
                            ? user?.email || ""
                            : selectedChatUser?.phone ||
                              selectedChatUser?.email ||
                              ""}
                        </div>
                      </div>
                    </div>
                    <p>{message.message}</p>
                    <span>{formatDateTime(message.created_at)}</span>
                  </article>
                ))
              ) : (
                <p className="muted">Chua co noi dung chat nao.</p>
              )}
            </div>
          </div>
        </section>
      )}
    </DashboardLayout>
  );
}
