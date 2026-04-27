import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { apiGet, apiPatch, apiPost } from "../../../services/http";
import {
  formatDateTime,
  formatMoney,
  getOrderStatusClass,
  getOrderStatusLabel,
  safeItems,
} from "../dashboardUtils";
import { useAuth } from "../../auth/useAuth";
import { useDbChangeSocket } from "../useDbChangeSocket";

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toUpperCase();
}

export default function DeliveryDashboard() {
  const { user, token } = useAuth();
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

  useDbChangeSocket(token, () => {
    Promise.all([refreshAll(), loadChatPeers()]).catch((error) =>
      setNotice(error.message),
    );
  });

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

  const onUpdateStatus = async (orderId, nextStatus = null) => {
    try {
      await apiPatch(`/api/delivery/orders/${orderId}/status`, {
        status: nextStatus || statusByOrderId[orderId] || "DANG_GIAO",
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
      setNotice("Hãy chọn một đơn hàng trước khi gửi chat");
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

  const pendingPickupCount = assignments.filter(
    (assignment) => normalizeStatus(assignment.status) === "DANG_CHUAN_BI",
  ).length;

  return (
    <DashboardLayout
      title="Khu vực Giao hàng"
      subtitle="Quản lý trạng thái đơn, thông tin giao hàng, phí giao hàng và mock shipper."
      highlights={[
        { label: "Phân công", value: assignments.length },
        {
          label: "Phí dự tính",
          value: shippingFee ? formatMoney(shippingFee) : "-",
        },
        { label: "Chờ nhận", value: pendingPickupCount },
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
            <h2>Tính phí vận chuyển</h2>
            <p>Công thức đơn giản dựa trên khoảng cách và cân nặng.</p>
          </div>
        </div>
        <form className="inline-form" onSubmit={onCalculateFee}>
          <label className="field-label">
            Khoảng cách (km)
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
            Cân nặng (kg)
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
            Tính phí
          </button>
        </form>
        {shippingFee !== null && (
          <p className="notice" style={{ marginTop: 12 }}>
            {formatMoney(shippingFee)}
          </p>
        )}
      </section>

      {user?.role !== "DELIVERY" && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Phân công đơn</h2>
              <p>Admin hoặc shipper có thể phân công đơn cho một shipper.</p>
            </div>
          </div>
          <form className="inline-form" onSubmit={onAssignOrder}>
            <label className="field-label">
              Mã đơn hàng
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
              Mã shipper (tùy chọn)
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
              Phân công
            </button>
          </form>
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Đơn đang giao</h2>
            <p>
              Chỉ nhận đơn khi shop đã xác nhận (Đang chuẩn bị), sau đó chuyển
              sang Đang giao.
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
                <th>Trạng thái</th>
                <th>Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.assignment_id}>
                  <td>#{assignment.assignment_id}</td>
                  <td>#{assignment.order_id}</td>
                  <td>{assignment.shipper_id}</td>
                  <td>
                    <span
                      className={`order-status ${getOrderStatusClass(assignment.status)}`}
                    >
                      {getOrderStatusLabel(assignment.status)}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      const status = normalizeStatus(assignment.status);
                      if (status === "DANG_CHUAN_BI") {
                        return (
                          <button
                            className="secondary-btn"
                            type="button"
                            onClick={() => {
                              setStatusByOrderId((prev) => ({
                                ...prev,
                                [assignment.order_id]: "DANG_GIAO",
                              }));
                              onUpdateStatus(assignment.order_id, "DANG_GIAO");
                            }}
                          >
                            Nhận đơn
                          </button>
                        );
                      }

                      if (status === "DANG_GIAO") {
                        return (
                          <button
                            className="secondary-btn"
                            type="button"
                            onClick={() => {
                              setStatusByOrderId((prev) => ({
                                ...prev,
                                [assignment.order_id]: "DA_GIAO",
                              }));
                              onUpdateStatus(assignment.order_id, "DA_GIAO");
                            }}
                          >
                            Xác nhận đã giao
                          </button>
                        );
                      }

                      return (
                        <span className="small-text">
                          {status === "DA_GIAO"
                            ? "Đơn đã hoàn tất"
                            : "Chờ shop xác nhận"}
                        </span>
                      );
                    })()}
                    {user?.role !== "DELIVERY" && (
                      <button
                        className="ghost-btn"
                        type="button"
                        onClick={() => onMockNext(assignment.order_id)}
                        style={{ marginLeft: 8 }}
                      >
                        Bước mock tiếp
                      </button>
                    )}
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
            <h2>Thông tin giao hàng</h2>
            <p>Cập nhật địa chỉ, số điện thoại và ghi chú của đơn.</p>
          </div>
        </div>
        <form
          className="form-grid"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="field-label">
            Mã đơn hàng cần cập nhật
            <input
              className="field-input"
              type="number"
              value={infoOrderId}
              onChange={(event) => setInfoOrderId(event.target.value)}
            />
          </label>
          <div className="two-col">
            <label className="field-label">
              Địa chỉ
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
              Số điện thoại
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
            Ghi chú
            <textarea
              className="field-textarea"
              value={infoForm.note}
              onChange={(event) =>
                setInfoForm((prev) => ({ ...prev, note: event.target.value }))
              }
            />
          </label>
          <p className="small-text">
            Chọn một mã đơn hàng trong danh sách ở trên và bấm nút Lưu để cập
            nhật.
          </p>
          <div className="action-row">
            <button
              className="primary-btn"
              type="button"
              onClick={() => onUpdateInfo(infoOrderId)}
            >
              Lưu thông tin
            </button>
            <p className="small-text">
              Chọn một mã đơn hàng trước khi cập nhật thông tin giao hàng.
            </p>
          </div>
        </form>
      </section>

      {user?.role === "DELIVERY" && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Chat với khách</h2>
              <p>
                Chọn đơn hàng trong danh sách để mở đúng cuộc trò chuyện với
                khách.
              </p>
            </div>
          </div>

          <div className="chat-panel" style={{ marginBottom: 14 }}>
            <div className="chat-rail">
              <div className="chat-rail-head">
                <div>
                  <div className="small-text">Đơn đang giao</div>
                  <strong>{chatPeers.length} thread</strong>
                </div>
                <span className="section-meta">Chat khách hàng</span>
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
                          <div className="chat-thread-badge">Khách hàng</div>
                          <h3 className="chat-thread-title">{thread.label}</h3>
                        </div>
                        <span className="section-meta">#{thread.order_id}</span>
                      </div>
                      <div className="chat-thread-subtitle">
                        {thread.subtitle}
                      </div>
                      <div className="chat-thread-meta">
                        <span>Mở chat theo đơn</span>
                        <span>{isActive ? "Đang mở" : "Chọn để xem"}</span>
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
                      Đơn hàng #{selectedChatThread.order_id}
                    </div>
                    <h3>{selectedChatThread.label}</h3>
                    <p>{selectedChatThread.subtitle}</p>
                  </>
                ) : (
                  <>
                    <div className="small-text">Chưa chọn thread</div>
                    <h3>Chọn đơn hàng bên trái</h3>
                    <p>Mọi tin nhắn sẽ được giữ theo đúng đơn hàng.</p>
                  </>
                )}
              </div>

              <div className="notice">
                {selectedChatThread
                  ? "Chat này gắn với khách của đơn này, không cần nhập ID thủ công."
                  : "Hãy chọn đơn hàng trước khi gửi chat."}
              </div>

              <form className="chat-composer" onSubmit={onSendChat}>
                <label className="field-label">
                  Nội dung chat
                  <textarea
                    className="field-textarea"
                    value={chatForm.message}
                    onChange={(event) =>
                      setChatForm((prev) => ({
                        ...prev,
                        message: event.target.value,
                      }))
                    }
                    placeholder="Thông báo thời gian giao hàng, liên hệ khách, ..."
                    required
                  />
                </label>
                <button className="primary-btn" type="submit">
                  Gửi chat
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
                          ? "Bạn"
                          : "Khách"}
                      </div>
                      <p>{message.message}</p>
                      <span>{formatDateTime(message.created_at)}</span>
                    </article>
                  ))
                ) : selectedChatThread ? (
                  <p className="muted">Chưa có nội dung chat nào.</p>
                ) : (
                  <p className="muted">Hãy chọn đơn hàng trước khi gửi chat.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </DashboardLayout>
  );
}
