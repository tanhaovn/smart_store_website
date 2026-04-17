import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { apiGet, apiPatch, apiPost } from "../../../services/http";
import { formatDateTime, formatMoney, safeItems } from "../dashboardUtils";
import { useAuth } from "../../auth/useAuth";

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [shippingFee, setShippingFee] = useState(null);
  const [notice, setNotice] = useState("");
  const [chatPeers, setChatPeers] = useState([]);
  const [selectedChatKey, setSelectedChatKey] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [feeForm, setFeeForm] = useState({ distance_km: 0, weight_kg: 0 });
  const [statusByOrderId, setStatusByOrderId] = useState({});
  const [infoForm, setInfoForm] = useState({
    shipping_address: "",
    shipping_phone: "",
    note: "",
  });
  const [assignForm, setAssignForm] = useState({
    order_id: "",
    shipper_id: "",
  });
  const [infoOrderId, setInfoOrderId] = useState("");
  const [chatForm, setChatForm] = useState({ message: "" });

  const selectedChatThread = useMemo(
    () => chatPeers.find((thread) => thread.key === selectedChatKey) || null,
    [chatPeers, selectedChatKey],
  );

  async function refreshAll() {
    const data = await apiGet("/api/delivery/orders");
    setAssignments(safeItems(data.items));
  }

  const loadChatPeers = async () => {
    const data = await apiGet("/api/delivery/chat-peers");
    setChatPeers(safeItems(data.items));
  };

  useEffect(() => {
    if (user?.role !== "DELIVERY") {
      setChatPeers([]);
      setSelectedChatKey("");
      setChatMessages([]);
      refreshAll().catch((error) => setNotice(error.message));
      return;
    }

    Promise.all([refreshAll(), loadChatPeers()]).catch((error) =>
      setNotice(error.message),
    );
  }, [user?.role]);

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

    apiGet(
      `/api/delivery/chat/${selectedChatThread.peer_id}?order_id=${selectedChatThread.order_id}`,
    )
      .then((data) => setChatMessages(safeItems(data.items)))
      .catch((error) => setNotice(error.message));
  }, [selectedChatThread]);

  const onCalculateFee = async (event) => {
    event.preventDefault();
    try {
      const data = await apiPost("/api/delivery/shipping-fee", {
        distance_km: Number(feeForm.distance_km),
        weight_kg: Number(feeForm.weight_kg),
      });
      setShippingFee(data.shipping_fee);
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onUpdateStatus = async (orderId) => {
    try {
      await apiPatch(`/api/delivery/orders/${orderId}/status`, {
        status: statusByOrderId[orderId] || "CHO_XAC_NHAN",
      });
      await refreshAll();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onUpdateInfo = async (orderId) => {
    try {
      await apiPatch(`/api/delivery/orders/${orderId}/info`, infoForm);
      await refreshAll();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onAssignOrder = async (event) => {
    event.preventDefault();
    try {
      await apiPost("/api/delivery/assign", {
        order_id: Number(assignForm.order_id),
        shipper_id: assignForm.shipper_id
          ? Number(assignForm.shipper_id)
          : undefined,
      });
      await refreshAll();
      setAssignForm({ order_id: "", shipper_id: "" });
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onMockNext = async (orderId) => {
    try {
      await apiPost(`/api/delivery/mock-shipper/${orderId}/next`, {});
      await refreshAll();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const onSendChat = async (event) => {
    event.preventDefault();
    if (!selectedChatThread) {
      setNotice("Hay chon mot don hang truoc khi gui chat");
      return;
    }

    try {
      await apiPost("/api/delivery/chat", {
        user_id: Number(selectedChatThread.peer_id),
        order_id: Number(selectedChatThread.order_id),
        message: chatForm.message,
      });
      setChatForm({ message: "" });
      const data = await apiGet(
        `/api/delivery/chat/${selectedChatThread.peer_id}?order_id=${selectedChatThread.order_id}`,
      );
      setChatMessages(safeItems(data.items));
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <DashboardLayout
      title="Khu vuc Giao hang"
      subtitle="Quan ly trang thai don, thong tin giao hang, phi giao hang va mock shipper."
      highlights={[
        { label: "Phan cong", value: assignments.length },
        {
          label: "Phi du tinh",
          value: shippingFee ? formatMoney(shippingFee) : "-",
        },
        { label: "Trang thai", value: "4 buoc" },
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
            <h2>Tinh phi van chuyen</h2>
            <p>Cong thuc don gian dua tren khoang cach va can nang.</p>
          </div>
        </div>
        <form className="inline-form" onSubmit={onCalculateFee}>
          <label className="field-label">
            Distance (km)
            <input
              className="field-input"
              type="number"
              min="0"
              value={feeForm.distance_km}
              onChange={(event) =>
                setFeeForm((prev) => ({
                  ...prev,
                  distance_km: event.target.value,
                }))
              }
            />
          </label>
          <label className="field-label">
            Weight (kg)
            <input
              className="field-input"
              type="number"
              min="0"
              value={feeForm.weight_kg}
              onChange={(event) =>
                setFeeForm((prev) => ({
                  ...prev,
                  weight_kg: event.target.value,
                }))
              }
            />
          </label>
          <button className="primary-btn" type="submit">
            Tinh phi
          </button>
        </form>
        {shippingFee !== null && (
          <p className="notice" style={{ marginTop: 12 }}>
            {formatMoney(shippingFee)}
          </p>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Phan cong don</h2>
            <p>Admin hoac shipper co the phan cong don cho mot shipper.</p>
          </div>
        </div>
        <form className="inline-form" onSubmit={onAssignOrder}>
          <label className="field-label">
            Order ID
            <input
              className="field-input"
              type="number"
              value={assignForm.order_id}
              onChange={(event) =>
                setAssignForm((prev) => ({
                  ...prev,
                  order_id: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className="field-label">
            Shipper ID (tuy chon)
            <input
              className="field-input"
              type="number"
              value={assignForm.shipper_id}
              onChange={(event) =>
                setAssignForm((prev) => ({
                  ...prev,
                  shipper_id: event.target.value,
                }))
              }
            />
          </label>
          <button className="primary-btn" type="submit">
            Phan cong
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Don dang giao</h2>
            <p>
              Cap nhat trang thai, dia chi, so dien thoai va ghi chu giao hang.
            </p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Order</th>
                <th>Shipper</th>
                <th>Status</th>
                <th>Cap nhat</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.assignment_id}>
                  <td>#{assignment.assignment_id}</td>
                  <td>#{assignment.order_id}</td>
                  <td>{assignment.shipper_id}</td>
                  <td>{assignment.status}</td>
                  <td>
                    <div className="inline-form">
                      <label className="field-label">
                        Trang thai
                        <select
                          className="field-select"
                          value={
                            statusByOrderId[assignment.order_id] ||
                            assignment.status
                          }
                          onChange={(event) =>
                            setStatusByOrderId((prev) => ({
                              ...prev,
                              [assignment.order_id]: event.target.value,
                            }))
                          }
                        >
                          <option value="CHO_XAC_NHAN">CHO_XAC_NHAN</option>
                          <option value="DANG_CHUAN_BI">DANG_CHUAN_BI</option>
                          <option value="DANG_GIAO">DANG_GIAO</option>
                          <option value="DA_GIAO">DA_GIAO</option>
                        </select>
                      </label>
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={() => onUpdateStatus(assignment.order_id)}
                      >
                        Luu
                      </button>
                      <button
                        className="ghost-btn"
                        type="button"
                        onClick={() => onMockNext(assignment.order_id)}
                      >
                        Next mock
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
            <h2>Thong tin giao hang</h2>
            <p>Cap nhat dia chi, so dien thoai va ghi chu cua don.</p>
          </div>
        </div>
        <form
          className="form-grid"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="field-label">
            Order ID can cap nhat
            <input
              className="field-input"
              type="number"
              value={infoOrderId}
              onChange={(event) => setInfoOrderId(event.target.value)}
            />
          </label>
          <div className="two-col">
            <label className="field-label">
              Dia chi
              <input
                className="field-input"
                value={infoForm.shipping_address}
                onChange={(event) =>
                  setInfoForm((prev) => ({
                    ...prev,
                    shipping_address: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field-label">
              So dien thoai
              <input
                className="field-input"
                value={infoForm.shipping_phone}
                onChange={(event) =>
                  setInfoForm((prev) => ({
                    ...prev,
                    shipping_phone: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <label className="field-label">
            Ghi chu
            <textarea
              className="field-textarea"
              value={infoForm.note}
              onChange={(event) =>
                setInfoForm((prev) => ({ ...prev, note: event.target.value }))
              }
            />
          </label>
          <p className="small-text">
            Chon mot order ID trong danh sach o tren va bam nut Luu de cap nhat.
          </p>
          <div className="action-row">
            <button
              className="primary-btn"
              type="button"
              onClick={() => onUpdateInfo(infoOrderId)}
            >
              Luu thong tin
            </button>
            <p className="small-text">
              Chon mot order ID truoc khi cap nhat thong tin giao hang.
            </p>
          </div>
        </form>
      </section>

      {user?.role === "DELIVERY" && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Chat voi khach</h2>
              <p>
                Chon don hang trong danh sach de mo dung cuoc tro chuyen voi
                khach.
              </p>
            </div>
          </div>

          <div className="chat-panel" style={{ marginBottom: 14 }}>
            <div className="chat-rail">
              <div className="chat-rail-head">
                <div>
                  <div className="small-text">Don dang giao</div>
                  <strong>{chatPeers.length} thread</strong>
                </div>
                <span className="section-meta">Customer chat</span>
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
                          <div className="chat-thread-badge">Khach hang</div>
                          <h3 className="chat-thread-title">{thread.label}</h3>
                        </div>
                        <span className="section-meta">#{thread.order_id}</span>
                      </div>
                      <div className="chat-thread-subtitle">
                        {thread.subtitle}
                      </div>
                      <div className="chat-thread-meta">
                        <span>Mo chat theo don</span>
                        <span>{isActive ? "Dang mo" : "Chon de xem"}</span>
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
                      Don hang #{selectedChatThread.order_id}
                    </div>
                    <h3>{selectedChatThread.label}</h3>
                    <p>{selectedChatThread.subtitle}</p>
                  </>
                ) : (
                  <>
                    <div className="small-text">Chua chon thread</div>
                    <h3>Chon don hang ben trai</h3>
                    <p>Moi tin nhan se duoc giu theo dung order.</p>
                  </>
                )}
              </div>

              <div className="notice">
                {selectedChatThread
                  ? "Chat nay gan voi khach cua don nay, khong can nhap ID thu cong."
                  : "Hay chon don hang truoc khi gui chat."}
              </div>

              <form className="chat-composer" onSubmit={onSendChat}>
                <label className="field-label">
                  Noi dung chat
                  <textarea
                    className="field-textarea"
                    value={chatForm.message}
                    onChange={(event) =>
                      setChatForm((prev) => ({
                        ...prev,
                        message: event.target.value,
                      }))
                    }
                    placeholder="Thong bao thoi gian giao hang, lien he khach, ..."
                    required
                  />
                </label>
                <button className="primary-btn" type="submit">
                  Gui chat
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
                        {Number(message.sender_id) === Number(user?.id)
                          ? "Ban"
                          : "Khach"}
                      </div>
                      <p>{message.message}</p>
                      <span>{formatDateTime(message.created_at)}</span>
                    </article>
                  ))
                ) : selectedChatThread ? (
                  <p className="muted">Chua co noi dung chat nao.</p>
                ) : (
                  <p className="muted">Hay chon don hang truoc khi gui chat.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </DashboardLayout>
  );
}
