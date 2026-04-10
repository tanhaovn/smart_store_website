import { useEffect, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../services/http";
import { formatDateTime, formatMoney, safeItems } from "../dashboardUtils";

const initialProductForm = {
  name: "",
  price: "",
  stock: 0,
  category_id: "",
  image_url: "",
  description: "",
};

const initialCategoryForm = { name: "", description: "" };

export default function SellerDashboard() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [revenue, setRevenue] = useState({
    total_revenue: 0,
    completed_orders: 0,
  });
  const [chatMessages, setChatMessages] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
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

  async function refreshAll() {
    const [productData, categoryData, orderData, promotionData, revenueData] =
      await Promise.all([
        apiGet("/api/seller/products"),
        apiGet("/api/seller/categories"),
        apiGet("/api/seller/orders"),
        apiGet("/api/seller/promotions"),
        apiGet("/api/seller/revenue"),
      ]);
    setProducts(safeItems(productData.items));
    setCategories(safeItems(categoryData.items));
    setOrders(safeItems(orderData.items));
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
      await refreshAll();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onCreateCategory = async (event) => {
    event.preventDefault();
    try {
      await apiPost("/api/seller/categories", categoryForm);
      setCategoryForm(initialCategoryForm);
      await refreshAll();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onDeleteCategory = async (categoryId) => {
    try {
      await apiDelete(`/api/seller/categories/${categoryId}`);
      await refreshAll();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onUpdateOrderStatus = async (orderId) => {
    try {
      await apiPatch(`/api/seller/orders/${orderId}/status`, {
        status: orderStatusById[orderId] || "XAC_NHAN",
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
        <section className="panel">
          <div className="notice">{notice}</div>
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Quan ly san pham</h2>
            <p>Them, sua, xoa san pham va dieu chinh ton kho.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={onCreateProduct}>
          <div className="two-col">
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
          <div className="two-col">
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
          <div className="two-col">
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
          </div>
          <div className="action-row">
            <button className="primary-btn" type="submit">
              {editingProductId ? "Luu san pham" : "Tao san pham"}
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

        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>San pham</th>
                <th>Gia</th>
                <th>Ton kho</th>
                <th>Duyet</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{formatMoney(product.price)}</td>
                  <td>{product.stock}</td>
                  <td>{product.is_approved ? "Da duyet" : "Cho duyet"}</td>
                  <td>
                    <div className="action-row">
                      <button
                        className="ghost-btn"
                        type="button"
                        onClick={() => onSelectProduct(product)}
                      >
                        Chon sua
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
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Danh muc</h2>
              <p>Quan ly danh muc phuc vu loc san pham.</p>
            </div>
          </div>
          <form className="form-grid" onSubmit={onCreateCategory}>
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
            <button className="primary-btn" type="submit">
              Tao danh muc
            </button>
          </form>
          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Danh muc</th>
                  <th>Mo ta</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td>{category.description || "-"}</td>
                    <td>
                      <button
                        className="ghost-btn"
                        type="button"
                        onClick={() => onDeleteCategory(category.id)}
                      >
                        Xoa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Doanh thu & khuyen mai</h2>
              <p>Thong ke don hoan thanh va quan ly ma giam gia.</p>
            </div>
          </div>
          <div className="card-grid">
            <article className="stat-card">
              <div className="small-text">Doanh thu</div>
              <h2>{formatMoney(revenue.total_revenue)}</h2>
            </article>
            <article className="stat-card">
              <div className="small-text">Don hoan thanh</div>
              <h2>{revenue.completed_orders}</h2>
            </article>
          </div>
          <form
            className="form-grid"
            onSubmit={onCreatePromotion}
            style={{ marginTop: 14 }}
          >
            <div className="two-col">
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
              Tao khuyen mai
            </button>
          </form>
          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table className="data-table">
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
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Quan ly don hang</h2>
            <p>Xac nhan, dang chuan bi, dang giao va hoan thanh don hang.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Don</th>
                <th>Khach</th>
                <th>Trang thai</th>
                <th>Thanh tien</th>
                <th>Cap nhat</th>
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
                    <div className="inline-form">
                      <label className="field-label">
                        Trang thai
                        <select
                          className="field-select"
                          value={orderStatusById[order.id] || order.status}
                          onChange={(event) =>
                            setOrderStatusById((prev) => ({
                              ...prev,
                              [order.id]: event.target.value,
                            }))
                          }
                        >
                          <option value="XAC_NHAN">XAC_NHAN</option>
                          <option value="DANG_CHUAN_BI">DANG_CHUAN_BI</option>
                          <option value="DANG_GIAO">DANG_GIAO</option>
                          <option value="HOAN_THANH">HOAN_THANH</option>
                        </select>
                      </label>
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

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Chat voi khach</h2>
            <p>Tim lich su trao doi voi mot user theo user_id.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={onSendChat}>
          <div className="two-col">
            <label className="field-label">
              User ID
              <input
                className="field-input"
                type="number"
                value={chatForm.user_id}
                onChange={(event) => {
                  setChatForm((prev) => ({
                    ...prev,
                    user_id: event.target.value,
                  }));
                  setSelectedUserId(event.target.value);
                }}
                required
              />
            </label>
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
            Gui chat
          </button>
        </form>
        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Sender</th>
                <th>Noi dung</th>
                <th>Thoi gian</th>
              </tr>
            </thead>
            <tbody>
              {chatMessages.map((message) => (
                <tr key={message.id}>
                  <td>
                    {message.sender_id === Number(selectedUserId)
                      ? "Khach"
                      : "Shop"}
                  </td>
                  <td>{message.message}</td>
                  <td>{formatDateTime(message.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}
