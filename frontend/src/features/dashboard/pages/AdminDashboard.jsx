import { useEffect, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { apiGet, apiPatch, apiPost } from "../../../services/http";
import { formatDateTime, formatMoney, safeItems } from "../dashboardUtils";

const initialSellerForm = {
  email: "",
  full_name: "",
  phone: "",
  password: "",
};

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [sellerForm, setSellerForm] = useState(initialSellerForm);
  const [roleByUserId, setRoleByUserId] = useState({});
  const [lockByUserId, setLockByUserId] = useState({});
  const [notice, setNotice] = useState("");

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
      title="Khu vuc Admin"
      subtitle="Quan ly user, tao seller, duyet san pham va xem tong don hang toan he thong."
      highlights={[
        { label: "Nguoi dung", value: users.length },
        { label: "Cho duyet", value: pendingProducts.length },
        { label: "Thanh toan", value: payments.length },
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
            <h2>Tao tai khoan seller</h2>
            <p>Admin co the tao seller moi va cap quyen tai day.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={onCreateSeller}>
          <div className="two-col">
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
              Ho ten
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
          <div className="two-col">
            <label className="field-label">
              So dien thoai
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
              Mat khau
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
            Tao seller
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Quan ly user</h2>
            <p>Cap nhat role, khoa/mo khoa tai khoan cho 4 vai tro.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Kich hoat</th>
                <th>Cap nhat</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.full_name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.is_active ? "Active" : "Locked"}</td>
                  <td>
                    <div className="inline-form">
                      <label className="field-label">
                        Role
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
                        Khoa
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
                          <option value="true">Mo</option>
                          <option value="false">Khoa</option>
                        </select>
                      </label>
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={() => onUpdateRole(user.id)}
                      >
                        Luu role
                      </button>
                      <button
                        className="danger-btn"
                        type="button"
                        onClick={() => onLockUser(user.id)}
                      >
                        Ap dung
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
              <h2>Duyet san pham</h2>
              <p>Danh sach san pham dang cho duyet.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>San pham</th>
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
                          Duyet
                        </button>
                        <button
                          className="ghost-btn"
                          type="button"
                          onClick={() => onApproveProduct(product.id, false)}
                        >
                          Tu choi
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
              <h2>Don hang & thanh toan</h2>
              <p>Quan sat toan bo giao dich trong he thong.</p>
            </div>
          </div>
          <div className="card-grid">
            <article className="stat-card">
              <div className="small-text">Tong don hang</div>
              <h2>{orders.length}</h2>
            </article>
            <article className="stat-card">
              <div className="small-text">Giao dich</div>
              <h2>{payments.length}</h2>
            </article>
          </div>
          <div className="table-wrap" style={{ marginTop: 14 }}>
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
                    <td>#{order.id}</td>
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
          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payment</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>#{payment.order_id}</td>
                    <td>{payment.method}</td>
                    <td>{payment.status}</td>
                    <td>{formatMoney(payment.amount)}</td>
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
