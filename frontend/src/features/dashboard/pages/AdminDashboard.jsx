import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import DashboardLayout from "../DashboardLayout";
import { apiGet, apiPatch, apiPost } from "../../../services/http";
import {
  formatDateTime,
  formatMoney,
  getOrderStatusClass,
  getOrderStatusLabel,
  getPaymentStatusLabel,
  safeItems,
} from "../dashboardUtils";
import { useDbChangeSocket } from "../useDbChangeSocket";

const initialSellerForm = {
  email: "",
  full_name: "",
  phone: "",
  password: "",
};

export default function AdminDashboard() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [sellerForm, setSellerForm] = useState(initialSellerForm);
  const [roleByUserId, setRoleByUserId] = useState({});
  const [lockByUserId, setLockByUserId] = useState({});
  const [notice, setNotice] = useState("");
  const [activePanel, setActivePanel] = useState("overview");

  const adminPanels = useMemo(
    () => [
      {
        key: "overview",
        label: "Tổng quan",
        count: users.length + pendingProducts.length + orders.length,
        hint: "Summary",
      },
      { key: "users", label: "User", count: users.length, hint: "Roles" },
      {
        key: "products",
        label: "Duyệt",
        count: pendingProducts.length,
        hint: "Review",
      },
      { key: "orders", label: "Đơn hàng", count: orders.length, hint: "Log" },
      {
        key: "payments",
        label: "Thanh toán",
        count: payments.length,
        hint: "Ledger",
      },
    ],
    [users.length, pendingProducts.length, orders.length, payments.length],
  );

  const activePanelMeta =
    adminPanels.find((panel) => panel.key === activePanel) || adminPanels[0];

  async function refreshAll() {
    const [userData, productData, orderData, paymentData] = await Promise.all([
      apiGet("/api/admin/users"),
      apiGet("/api/admin/products/pending"),
      apiGet("/api/admin/orders"),
      apiGet("/api/admin/payments"),
    ]);
    setUsers(safeItems(userData.items));
    setPendingProducts(safeItems(productData.items));
    setOrders(safeItems(orderData.items));
    setPayments(safeItems(paymentData.items));
  }

  useEffect(() => {
    refreshAll().catch((error) => setNotice(error.message));
  }, []);

  useDbChangeSocket(token, () => {
    refreshAll().catch((error) => setNotice(error.message));
  });

  const onCreateSeller = async (event) => {
    event.preventDefault();
    try {
      await apiPost("/api/admin/sellers", sellerForm);
      setSellerForm(initialSellerForm);
      await refreshAll();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onLockUser = async (userId) => {
    try {
      await apiPatch(`/api/admin/users/${userId}/lock`, {
        is_active: lockByUserId[userId] ?? false,
      });
      await refreshAll();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onUpdateRole = async (userId) => {
    try {
      await apiPatch(`/api/admin/users/${userId}/role`, {
        role: roleByUserId[userId] || "USER",
      });
      await refreshAll();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onApproveProduct = async (productId, isApproved) => {
    try {
      await apiPatch(`/api/admin/products/${productId}/approve`, {
        is_approved: isApproved,
      });
      await refreshAll();
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <DashboardLayout
      title="Khu vực Admin"
      subtitle="Quản lý user, tạo seller, duyệt sản phẩm và xem tổng đơn hàng toàn hệ thống."
      highlights={[
        { label: "Người dùng", value: users.length },
        { label: "Chờ duyệt", value: pendingProducts.length },
        { label: "Thanh toán", value: payments.length },
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
            <div className="small-text">Workspace</div>
            <h2>{activePanelMeta.label}</h2>
            <p>
              {activePanelMeta.hint} - giao diện quản trị ngắn gọn và rõ ràng.
            </p>
          </div>
          <div className="workspace-chip">{activePanelMeta.count} items</div>
        </div>

        <div className="seller-tabs">
          {adminPanels.map((panel) => (
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

      {activePanel === "overview" && (
        <div className="seller-split">
          <section className="panel compact-panel">
            <div className="panel-head compact-head">
              <div>
                <h2>Tạo tài khoản seller</h2>
                <p>Admin có thể tạo seller mới và cấp quyền tại đây.</p>
              </div>
            </div>
            <form className="form-grid compact-form" onSubmit={onCreateSeller}>
              <div className="two-col compact-grid">
                <label className="field-label">
                  Email
                  <input
                    className="field-input"
                    value={sellerForm.email}
                    onChange={(event) =>
                      setSellerForm((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="field-label">
                  Họ tên
                  <input
                    className="field-input"
                    value={sellerForm.full_name}
                    onChange={(event) =>
                      setSellerForm((prev) => ({
                        ...prev,
                        full_name: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              </div>
              <div className="two-col compact-grid">
                <label className="field-label">
                  Số điện thoại
                  <input
                    className="field-input"
                    value={sellerForm.phone}
                    onChange={(event) =>
                      setSellerForm((prev) => ({
                        ...prev,
                        phone: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field-label">
                  Mật khẩu
                  <input
                    className="field-input"
                    type="password"
                    value={sellerForm.password}
                    onChange={(event) =>
                      setSellerForm((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              </div>
              <button className="primary-btn" type="submit">
                Tạo seller
              </button>
            </form>
          </section>

          <section className="panel compact-panel">
            <div className="panel-head compact-head">
              <div>
                <h2>Thống kê nhanh</h2>
                <p>Chốt nhanh số liệu quản trị đang xem.</p>
              </div>
            </div>
            <div className="card-grid">
              <article className="stat-card">
                <div className="small-text">Người dùng</div>
                <h2>{users.length}</h2>
              </article>
              <article className="stat-card">
                <div className="small-text">Chờ duyệt</div>
                <h2>{pendingProducts.length}</h2>
              </article>
              <article className="stat-card">
                <div className="small-text">Đơn hàng</div>
                <h2>{orders.length}</h2>
              </article>
              <article className="stat-card">
                <div className="small-text">Thanh toán</div>
                <h2>{payments.length}</h2>
              </article>
            </div>
          </section>
        </div>
      )}

      {activePanel === "users" && (
        <section className="panel compact-panel">
          <div className="panel-head compact-head">
            <div>
              <h2>Quản lý user</h2>
              <p>Cập nhật role, khóa/mở khóa tài khoản cho 4 vai trò.</p>
            </div>
            <div className="small-text">{users.length} users</div>
          </div>
          <div className="table-wrap compact-table-wrap">
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Kích hoạt</th>
                  <th>Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.full_name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{user.is_active ? "Đang hoạt động" : "Đã khóa"}</td>
                    <td>
                      <div className="inline-form">
                        <label className="field-label">
                          Vai trò
                          <select
                            className="field-select"
                            value={roleByUserId[user.id] || user.role}
                            onChange={(event) =>
                              setRoleByUserId((prev) => ({
                                ...prev,
                                [user.id]: event.target.value,
                              }))
                            }
                          >
                            <option value="USER">USER</option>
                            <option value="SELLER">SELLER</option>
                            <option value="DELIVERY">DELIVERY</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </label>
                        <label className="field-label">
                          Trạng thái khóa
                          <select
                            className="field-select"
                            value={String(
                              lockByUserId[user.id] ?? user.is_active,
                            )}
                            onChange={(event) =>
                              setLockByUserId((prev) => ({
                                ...prev,
                                [user.id]: event.target.value === "true",
                              }))
                            }
                          >
                            <option value="true">Mở</option>
                            <option value="false">Khóa</option>
                          </select>
                        </label>
                        <button
                          className="secondary-btn"
                          type="button"
                          onClick={() => onUpdateRole(user.id)}
                        >
                          Lưu role
                        </button>
                        <button
                          className="danger-btn"
                          type="button"
                          onClick={() => onLockUser(user.id)}
                        >
                          Áp dụng
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

      {activePanel === "products" && (
        <section className="panel compact-panel">
          <div className="panel-head compact-head">
            <div>
              <h2>Duyệt sản phẩm</h2>
              <p>Danh sách sản phẩm đang chờ duyệt.</p>
            </div>
            <div className="small-text">{pendingProducts.length} items</div>
          </div>
          <div className="table-wrap compact-table-wrap">
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Seller</th>
                  <th>Gia</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pendingProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.seller_id}</td>
                    <td>{formatMoney(product.price)}</td>
                    <td>
                      <div className="action-row">
                        <button
                          className="primary-btn"
                          type="button"
                          onClick={() => onApproveProduct(product.id, true)}
                        >
                          Duyệt
                        </button>
                        <button
                          className="ghost-btn"
                          type="button"
                          onClick={() => onApproveProduct(product.id, false)}
                        >
                          Từ chối
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

      {activePanel === "orders" && (
        <section className="panel compact-panel">
          <div className="panel-head compact-head">
            <div>
              <h2>Đơn hàng</h2>
              <p>Quan sát trạng thái và giá trị đơn trong hệ thống.</p>
            </div>
            <div className="small-text">{orders.length} orders</div>
          </div>
          <div className="table-wrap compact-table-wrap">
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>Đơn</th>
                  <th>Trạng thái</th>
                  <th>Giá trị</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>
                      <span
                        className={`order-status ${getOrderStatusClass(order.status)}`}
                      >
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </td>
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
        </section>
      )}

      {activePanel === "payments" && (
        <section className="panel compact-panel">
          <div className="panel-head compact-head">
            <div>
              <h2>Thanh toán</h2>
              <p>Theo dõi giao dịch toàn hệ thống.</p>
            </div>
            <div className="small-text">{payments.length} payments</div>
          </div>
          <div className="table-wrap compact-table-wrap">
            <table className="data-table compact-table">
              <thead>
                <tr>
                  <th>Payment</th>
                  <th>Phương thức</th>
                  <th>Trạng thái</th>
                  <th>Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>#{payment.order_id}</td>
                    <td>{payment.method}</td>
                    <td>{getPaymentStatusLabel(payment.status)}</td>
                    <td>{formatMoney(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </DashboardLayout>
  );
}
