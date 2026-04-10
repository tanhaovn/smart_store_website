import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../../services/http";
import { formatDateTime, formatMoney, safeItems } from "../dashboardUtils";

const initialOrderForm = {
  shipping_address: "",
  shipping_phone: "",
  payment_method: "COD",
  note: "",
};

export default function UserDashboard() {
  const [keyword, setKeyword] = useState("");
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageForm, setMessageForm] = useState({
    seller_id: "",
    message: "",
    order_id: "",
  });
  const [orderForm, setOrderForm] = useState(initialOrderForm);
  const [quantityByProduct, setQuantityByProduct] = useState({});
  const [notice, setNotice] = useState("");

  const totalCartValue = useMemo(
    () =>
      cartItems.reduce((sum, item) => sum + Number(item.line_total || 0), 0),
    [cartItems],
  );

  async function loadProducts(currentKeyword = keyword) {
    const params = new URLSearchParams();
    if (currentKeyword.trim()) {
      params.set("query", currentKeyword.trim());
    }
    const data = await apiGet(
      `/api/user/products${params.toString() ? `?${params}` : ""}`,
    );
    setProducts(safeItems(data.items));
  }

  async function loadCart() {
    const data = await apiGet("/api/user/cart");
    setCartItems(safeItems(data.items));
  }

  async function loadOrders() {
    const data = await apiGet("/api/user/orders");
    setOrders(safeItems(data.items));
  }

  async function loadOrderDetail(orderId) {
    if (!orderId) {
      setSelectedOrder(null);
      setOrderDetail(null);
      return;
    }
    setSelectedOrder(orderId);
    const data = await apiGet(`/api/user/orders/${orderId}`);
    setOrderDetail(data);
    setOrderForm((prev) => ({
      ...prev,
      shipping_address: data.shipping_address || prev.shipping_address,
      shipping_phone: data.shipping_phone || prev.shipping_phone,
      payment_method: data.payment_method || prev.payment_method,
    }));
  }

  async function loadChatHistory(sellerId) {
    if (!sellerId) {
      setChatMessages([]);
      return;
    }
    const data = await apiGet(`/api/user/chat/${sellerId}`);
    setChatMessages(safeItems(data.items));
  }

  async function refreshAll() {
    await Promise.all([loadProducts(), loadCart(), loadOrders()]);
  }

  useEffect(() => {
    refreshAll().catch((error) => setNotice(error.message));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts(keyword).catch((error) => setNotice(error.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    if (!messageForm.seller_id) {
      setChatMessages([]);
      return;
    }
    loadChatHistory(messageForm.seller_id).catch((error) =>
      setNotice(error.message),
    );
  }, [messageForm.seller_id]);

  const onAddToCart = async (productId) => {
    try {
      const quantity = Number(quantityByProduct[productId] || 1);
      await apiPost("/api/user/cart", { product_id: productId, quantity });
      setNotice("Da them vao gio hang");
      await loadCart();
    } catch (error) {
      setNotice(error.message);
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
      setNotice(`Da tao don hang #${data.order_id}`);
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

  const onSendMessage = async (event) => {
    event.preventDefault();
    try {
      await apiPost("/api/user/chat", {
        seller_id: Number(messageForm.seller_id),
        order_id: messageForm.order_id
          ? Number(messageForm.order_id)
          : undefined,
        message: messageForm.message,
      });
      setNotice("Da gui chat toi shop");
      setMessageForm((prev) => ({ ...prev, message: "" }));
      await loadChatHistory(messageForm.seller_id);
    } catch (error) {
      setNotice(error.message);
    }
  };

  const selectedSellerId = selectedProduct?.seller_id || messageForm.seller_id;

  return (
    <DashboardLayout
      title="Khu vuc Khach Hang"
      subtitle="Tim kiem san pham, quan ly gio hang, dat hang, theo doi don va chat voi shop."
      highlights={[
        { label: "San pham", value: products.length },
        { label: "Gio hang", value: formatMoney(totalCartValue) },
        { label: "Don hang", value: orders.length },
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
            <h2>Tim kiem san pham</h2>
            <p>Loc theo tu khoa, gia va danh muc san pham da duyet.</p>
          </div>
          <div className="inline-form" style={{ minWidth: 360 }}>
            <label className="field-label">
              Tu khoa
              <input
                className="field-input"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </label>
            <button
              className="secondary-btn"
              type="button"
              onClick={() => loadProducts(keyword)}
            >
              Tim
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>San pham</th>
                <th>Gia</th>
                <th>Ton kho</th>
                <th>Shop</th>
                <th>So luong</th>
                <th>Hanh dong</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <button
                      className="ghost-btn"
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                    >
                      {product.name}
                    </button>
                  </td>
                  <td>{formatMoney(product.price)}</td>
                  <td>{product.stock}</td>
                  <td>{product.seller_id}</td>
                  <td>
                    <input
                      className="field-input"
                      type="number"
                      min="1"
                      value={quantityByProduct[product.id] || 1}
                      onChange={(event) =>
                        setQuantityByProduct((prev) => ({
                          ...prev,
                          [product.id]: Number(event.target.value),
                        }))
                      }
                      style={{ width: 90 }}
                    />
                  </td>
                  <td>
                    <button
                      className="primary-btn"
                      type="button"
                      onClick={() => onAddToCart(product.id)}
                    >
                      Them gio
                    </button>
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
              <h2>Chi tiet san pham</h2>
              <p>Xem nhanh san pham dang chon de ra quyet dinh mua hang.</p>
            </div>
          </div>
          {selectedProduct ? (
            <div className="card-grid">
              <article className="stat-card">
                <div className="small-text">Ten</div>
                <h3>{selectedProduct.name}</h3>
              </article>
              <article className="stat-card">
                <div className="small-text">Gia</div>
                <h3>{formatMoney(selectedProduct.price)}</h3>
              </article>
              <article className="stat-card">
                <div className="small-text">Ton kho</div>
                <h3>{selectedProduct.stock}</h3>
              </article>
              <article className="stat-card">
                <div className="small-text">Mo ta</div>
                <p>{selectedProduct.description || "Chua co mo ta"}</p>
              </article>
            </div>
          ) : (
            <p className="muted">Chon mot san pham trong danh sach ben trai.</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Gio hang</h2>
              <p>Cap nhat so luong hoac xoa san pham truoc khi dat hang.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>San pham</th>
                  <th>So luong</th>
                  <th>Thanh tien</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cartItems.map((item) => (
                  <tr key={item.cart_id}>
                    <td>{item.name}</td>
                    <td>
                      <input
                        className="field-input"
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(event) =>
                          onUpdateCart(item.cart_id, Number(event.target.value))
                        }
                        style={{ width: 90 }}
                      />
                    </td>
                    <td>{formatMoney(item.line_total)}</td>
                    <td>
                      <button
                        className="ghost-btn"
                        type="button"
                        onClick={() => onDeleteCart(item.cart_id)}
                      >
                        Xoa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small-text" style={{ marginTop: 10 }}>
            Tong tien tam tinh: {formatMoney(totalCartValue)}
          </p>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Dat hang</h2>
            <p>Nhap thong tin giao hang va chon phuong thuc thanh toan.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={onPlaceOrder}>
          <div className="two-col">
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
          </div>
          <div className="two-col">
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
              />
            </label>
          </div>
          <button
            className="primary-btn"
            type="submit"
            disabled={!cartItems.length}
          >
            Dat hang
          </button>
        </form>
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Theo doi don hang</h2>
              <p>Chon don de xem chi tiet va thanh toan.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Don</th>
                  <th>Trang thai</th>
                  <th>Gia tri</th>
                  <th>Ngay tao</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <button
                        className="ghost-btn"
                        type="button"
                        onClick={() => loadOrderDetail(order.id)}
                      >
                        #{order.id}
                      </button>
                    </td>
                    <td>{order.status}</td>
                    <td>
                      {formatMoney(
                        Number(order.total_amount || 0) +
                          Number(order.shipping_fee || 0),
                      )}
                    </td>
                    <td>{formatDateTime(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {orderDetail && (
            <div className="stat-card" style={{ marginTop: 12 }}>
              <div className="small-text">Chi tiet don #{orderDetail.id}</div>
              <p>Trang thai: {orderDetail.status}</p>
              <p>Thanh toan: {orderDetail.payment_status}</p>
              <p>Mã giao dịch: {orderDetail.payment_transaction_code || "-"}</p>
              <p>So san pham: {safeItems(orderDetail.items).length}</p>
              <div className="action-row" style={{ marginTop: 10 }}>
                <button
                  className="primary-btn"
                  type="button"
                  onClick={() => onPayOrder(orderDetail.id)}
                >
                  Thanh toan
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Chat voi shop</h2>
              <p>Nhap seller_id de xem lich su va nhan vien shop.</p>
            </div>
          </div>
          <form className="form-grid" onSubmit={onSendMessage}>
            <div className="two-col">
              <label className="field-label">
                Seller ID
                <input
                  className="field-input"
                  type="number"
                  value={messageForm.seller_id || selectedSellerId || ""}
                  onChange={(event) =>
                    setMessageForm((prev) => ({
                      ...prev,
                      seller_id: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="field-label">
                Order ID
                <input
                  className="field-input"
                  type="number"
                  value={messageForm.order_id}
                  onChange={(event) =>
                    setMessageForm((prev) => ({
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
                value={messageForm.message}
                onChange={(event) =>
                  setMessageForm((prev) => ({
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
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Goi y chat</th>
                  <th>Thoi gian</th>
                </tr>
              </thead>
              <tbody>
                {chatMessages.map((message) => (
                  <tr key={message.id}>
                    <td>
                      <strong>
                        {message.sender_id === Number(messageForm.seller_id)
                          ? "Shop"
                          : "Ban"}
                        :
                      </strong>{" "}
                      {message.message}
                    </td>
                    <td>{formatDateTime(message.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
