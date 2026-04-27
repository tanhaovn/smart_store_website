import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { apiGet, apiPost } from "../../../services/http";
import { useAuth } from "../../auth/useAuth";
import {
  formatDateTime,
  formatMoney,
  getOrderStatusClass,
  getOrderStatusLabel,
  getPaymentStatusLabel,
  safeItems,
} from "../dashboardUtils";

const initialOrderForm = {
  payment_method: "COD",
};

const backendOrigin = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://127.0.0.1:5000"
)
  .trim()
  .replace(/\/+$/, "");
const socketServerUrl = (import.meta.env.VITE_SOCKET_URL || backendOrigin)
  .trim()
  .replace(/\/+$/, "");

function shouldUsePollingOnly(socketUrl) {
  try {
    const host = new URL(socketUrl, window.location.origin).hostname;
    return host.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

const disableRealtimeSocket = shouldUsePollingOnly(socketServerUrl);

export default function UserOrdersChatPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [chatPeers, setChatPeers] = useState([]);
  const [selectedChatKey, setSelectedChatKey] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [messageForm, setMessageForm] = useState({ message: "" });
  const [orderForm, setOrderForm] = useState(initialOrderForm);
  const [paymentQr, setPaymentQr] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeMode, setActiveMode] = useState("orders");

  const chatSocketRef = useRef(null);
  const activeThreadRef = useRef(null);
  const chatScrollRef = useRef(null);

  const selectedChatThread = useMemo(
    () => chatPeers.find((thread) => thread.key === selectedChatKey) || null,
    [chatPeers, selectedChatKey],
  );

  useEffect(() => {
    activeThreadRef.current = selectedChatThread;
  }, [selectedChatThread]);

  const loadOrders = useCallback(async () => {
    const data = await apiGet("/api/user/orders");
    setOrders(safeItems(data.items));
  }, []);

  const loadChatPeers = useCallback(async () => {
    const data = await apiGet("/api/user/chat-peers");
    setChatPeers(safeItems(data.items));
  }, []);

  const loadSelectedChat = useCallback(async () => {
    if (!selectedChatThread) {
      setChatMessages([]);
      return;
    }

    const path =
      selectedChatThread.peer_type === "DELIVERY"
        ? `/api/user/chat/delivery/${selectedChatThread.peer_id}?order_id=${selectedChatThread.order_id}`
        : selectedChatThread.order_id
          ? `/api/user/chat/seller/${selectedChatThread.peer_id}?order_id=${selectedChatThread.order_id}`
          : `/api/user/chat/seller/${selectedChatThread.peer_id}`;
    const data = await apiGet(path);
    setChatMessages(safeItems(data.items));
  }, [selectedChatThread]);

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
      payment_method: data.payment_method || prev.payment_method,
    }));
  };

  const refreshAll = useCallback(async () => {
    await Promise.all([loadOrders(), loadChatPeers()]);
  }, [loadOrders, loadChatPeers]);

  useEffect(() => {
    refreshAll().catch((error) => setNotice(error.message));
  }, [refreshAll]);

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
    loadSelectedChat().catch((error) => setNotice(error.message));
  }, [loadSelectedChat]);

  useEffect(() => {
    if (!disableRealtimeSocket || !selectedChatThread) {
      return;
    }

    const intervalId = setInterval(() => {
      loadSelectedChat().catch(() => {});
    }, 3000);

    return () => clearInterval(intervalId);
  }, [selectedChatThread, loadSelectedChat]);

  useEffect(() => {
    if (!disableRealtimeSocket) {
      return;
    }

    const intervalId = setInterval(() => {
      loadChatPeers().catch(() => {});
      loadOrders().catch(() => {});
    }, 5000);

    return () => clearInterval(intervalId);
  }, [loadChatPeers, loadOrders]);

  useEffect(() => {
    if (disableRealtimeSocket || !token || !user?.id) {
      return;
    }

    const socket = io(`${socketServerUrl}/ws/chat`, {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
    });

    chatSocketRef.current = socket;

    const onConnect = () => {
      const activeThread = activeThreadRef.current;
      if (activeThread?.peer_id) {
        socket.emit("join", { peer_id: Number(activeThread.peer_id) });
      }
    };

    const onNewMessage = (message) => {
      const activeThread = activeThreadRef.current;
      if (!activeThread?.peer_id) {
        return;
      }

      const currentUserId = Number(user.id);
      const activePeerId = Number(activeThread.peer_id);
      const senderId = Number(message.sender_id);
      const receiverId = Number(message.receiver_id);

      const isCurrentThreadMessage =
        (senderId === currentUserId && receiverId === activePeerId) ||
        (senderId === activePeerId && receiverId === currentUserId);

      if (!isCurrentThreadMessage) {
        return;
      }

      if (activeThread.order_id) {
        const activeOrderId = Number(activeThread.order_id);
        const incomingOrderId = Number(message.order_id || 0);
        if (incomingOrderId !== activeOrderId) {
          return;
        }
      }

      setChatMessages((prev) =>
        prev.some((item) => Number(item.id) === Number(message.id))
          ? prev
          : [...prev, message],
      );
    };

    socket.on("connect", onConnect);
    socket.on("new_message", onNewMessage);
    socket.on("db_changed", () => {
      Promise.all([refreshAll(), loadSelectedChat()]).catch((error) =>
        setNotice(error.message),
      );
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("new_message", onNewMessage);
      socket.off("db_changed");
      socket.disconnect();
      chatSocketRef.current = null;
    };
  }, [token, user?.id, refreshAll, loadSelectedChat]);

  useEffect(() => {
    const socket = chatSocketRef.current;
    if (!socket || !selectedChatThread?.peer_id) {
      return;
    }

    socket.emit("join", { peer_id: Number(selectedChatThread.peer_id) });
  }, [selectedChatThread?.peer_id]);

  useEffect(() => {
    const threadNode = chatScrollRef.current;
    if (threadNode) {
      threadNode.scrollTop = threadNode.scrollHeight;
    }
  }, [chatMessages, selectedChatKey]);

  const onPayOrder = async (orderId) => {
    try {
      const result = await apiPost(`/api/user/orders/${orderId}/pay`, {
        method: orderForm.payment_method || "COD",
      });
      setNotice(`Thanh toán: ${getPaymentStatusLabel(result.payment_status)}`);
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
        setNotice("COD không cần tạo mã QR");
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
      setNotice("Hãy chọn một cuộc trò chuyện trước khi gửi tin nhắn");
      return;
    }

    const message = messageForm.message.trim();
    if (!message) {
      setNotice("Nội dung chat không được để trống");
      return;
    }

    try {
      const socket = chatSocketRef.current;
      if (socket?.connected) {
        socket.emit("send_message", {
          receiver_id: Number(selectedChatThread.peer_id),
          order_id: selectedChatThread.order_id
            ? Number(selectedChatThread.order_id)
            : undefined,
          message,
        });
        setNotice("Đã gửi chat realtime");
        setMessageForm({ message: "" });
        return;
      }

      await apiPost("/api/user/chat", {
        peer_type: selectedChatThread.peer_type,
        peer_id: Number(selectedChatThread.peer_id),
        order_id: selectedChatThread.order_id || undefined,
        message,
      });
      setNotice("Đã gửi chat tới shop");
      setMessageForm({ message: "" });
      await loadSelectedChat();
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
              <div className="shop-brand-name">Đơn hàng & Chat</div>
              <div className="shop-brand-subtitle">
                Tách riêng để theo dõi đơn và nhắn tin gọn hơn
              </div>
            </div>
          </div>

          <div className="shop-actions">
            <button
              className={activeMode === "orders" ? "primary-btn" : "ghost-btn"}
              type="button"
              onClick={() => setActiveMode("orders")}
            >
              Theo dõi đơn
            </button>
            <button
              className={activeMode === "chat" ? "primary-btn" : "ghost-btn"}
              type="button"
              onClick={() => setActiveMode("chat")}
            >
              Chat
            </button>
            <button
              className="secondary-btn"
              type="button"
              onClick={() => navigate("/user")}
            >
              Về trang mua hàng
            </button>
          </div>
        </header>

        {notice && <div className="shop-notice">{notice}</div>}

        {activeMode === "orders" && (
          <section className="shop-section" id="orders-section">
            <div className="section-head">
              <div>
                <h2>Theo dõi đơn hàng</h2>
                <p>Danh sách đơn, trạng thái và chi tiết thanh toán.</p>
              </div>
              <div className="section-meta">{orders.length} đơn</div>
            </div>

            <div className="order-list">
              {orders.map((order) => (
                <article key={order.id} className="order-card">
                  <div>
                    <div className="order-title">Đơn #{order.id}</div>
                    <div className="small-text">
                      {formatDateTime(order.created_at)}
                    </div>
                  </div>
                  <div className="order-meta">
                    <span
                      className={`order-status ${getOrderStatusClass(order.status)}`}
                    >
                      {getOrderStatusLabel(order.status)}
                    </span>
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
                    Xem chi tiết
                  </button>
                </article>
              ))}
            </div>

            {orderDetail && (
              <div className="detail-card">
                <div className="section-head compact">
                  <div>
                    <h3>Chi tiết đơn #{orderDetail.id}</h3>
                    <p>Thông tin giao hàng và trạng thái thanh toán.</p>
                  </div>
                </div>
                <div className="detail-grid">
                  <article>
                    <span>Trạng thái</span>
                    <strong
                      className={`order-status ${getOrderStatusClass(orderDetail.status)}`}
                    >
                      {getOrderStatusLabel(orderDetail.status)}
                    </strong>
                  </article>
                  <article>
                    <span>Thanh toán</span>
                    <strong>
                      {getPaymentStatusLabel(orderDetail.payment_status)}
                    </strong>
                  </article>
                  <article>
                    <span>Mã giao dịch</span>
                    <strong>
                      {orderDetail.payment_transaction_code || "-"}
                    </strong>
                  </article>
                  <article>
                    <span>Số sản phẩm</span>
                    <strong>{safeItems(orderDetail.items).length}</strong>
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
                      {qrLoading ? "Đang tạo QR..." : "Tạo mã QR"}
                    </button>
                  )}
                  <button
                    className="primary-btn"
                    type="button"
                    onClick={() => onPayOrder(orderDetail.id)}
                  >
                    {String(orderForm.payment_method || "").toUpperCase() ===
                    "COD"
                      ? "Xác nhận COD"
                      : "Đã quét QR, xác nhận"}
                  </button>
                </div>

                {paymentQr && (
                  <div className="detail-card" style={{ marginTop: 14 }}>
                    <div className="section-head compact">
                      <div>
                        <h3>Mã QR thanh toán</h3>
                        <p>
                          Quét mã để thanh toán đúng số tiền:{" "}
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
                        alt={`QR thanh toán đơn ${paymentQr.order_id}`}
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
                        Phương thức: {paymentQr.method}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {activeMode === "chat" && (
          <section className="shop-section" id="chat-section">
            <div className="section-head">
              <div>
                <h2>Danh sách chat</h2>
                <p>Chọn đối tượng chat từ dropdown để mở hội thoại nhanh.</p>
              </div>
              <div className="section-meta">{chatPeers.length} thread</div>
            </div>

            <div
              className="chat-panel user-zalo-layout"
              style={{ marginBottom: 14 }}
            >
              <aside className="chat-rail user-chat-sidebar">
                <div className="chat-rail-head">
                  <div>
                    <div className="small-text">Cuộc trò chuyện</div>
                    <strong>{chatPeers.length} thread</strong>
                  </div>
                  <span className="section-meta">Inbox</span>
                </div>

                <label className="field-label">
                  Chọn người chat
                  <select
                    className="field-select"
                    value={selectedChatKey}
                    onChange={(event) => setSelectedChatKey(event.target.value)}
                    disabled={!chatPeers.length}
                  >
                    <option value="">
                      {chatPeers.length ? "-- Chọn --" : "Chưa có thread"}
                    </option>
                    {chatPeers.map((thread) => (
                      <option key={thread.key} value={thread.key}>
                        {(thread.peer_type === "DELIVERY"
                          ? "Shipper"
                          : "Shop") +
                          " - " +
                          (thread.label || `#${thread.peer_id}`) +
                          (thread.order_id ? ` (Đơn #${thread.order_id})` : "")}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="chat-user-preview user-chat-preview">
                  {selectedChatThread ? (
                    <>
                      <div>
                        <div className="chat-thread-badge">
                          {selectedChatThread.peer_type === "DELIVERY"
                            ? "Shipper"
                            : "Shop"}
                        </div>
                        <strong>{selectedChatThread.label}</strong>
                        <p>{selectedChatThread.subtitle}</p>
                      </div>
                      {selectedChatThread.order_id ? (
                        <span className="section-meta">
                          Đơn #{selectedChatThread.order_id}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <strong>Chưa chọn cuộc trò chuyện</strong>
                      <p>Hãy chọn một đối tượng chat để bắt đầu.</p>
                    </>
                  )}
                </div>
              </aside>

              <section className="chat-stage user-chat-main">
                <header className="chat-stage-head user-chat-main-head">
                  {selectedChatThread ? (
                    <>
                      <div>
                        <div className="small-text">
                          {selectedChatThread.peer_type === "DELIVERY"
                            ? "Shipper của đơn hàng"
                            : "Shop bán hàng"}
                        </div>
                        <h3>{selectedChatThread.label}</h3>
                        <p>{selectedChatThread.subtitle}</p>
                      </div>
                      <div className="small-text">
                        {selectedChatThread.order_id
                          ? `Đơn #${selectedChatThread.order_id}`
                          : "Không lọc đơn"}
                      </div>
                    </>
                  ) : (
                    <div>
                      <div className="small-text">
                        Chưa chọn cuộc trò chuyện
                      </div>
                      <h3>Hãy chọn một đối tượng chat</h3>
                      <p>
                        Sau khi chọn, khung chat bên dưới sẽ hiển thị lịch sử.
                      </p>
                    </div>
                  )}
                </header>

                <div
                  ref={chatScrollRef}
                  className="chat-thread user-zalo-thread"
                >
                  {selectedChatThread && chatMessages.length ? (
                    chatMessages.map((message) => {
                      const isMe =
                        Number(message.sender_id) === Number(user?.id);
                      return (
                        <article
                          key={message.id}
                          className={`user-message-row ${isMe ? "is-me" : "is-them"}`}
                        >
                          <div
                            className={`chat-bubble user-zalo-bubble ${isMe ? "me" : "them"}`}
                          >
                            <div className="user-zalo-meta">
                              <strong>
                                {isMe
                                  ? "Bạn"
                                  : selectedChatThread.peer_type === "DELIVERY"
                                    ? "Shipper"
                                    : "Shop"}
                              </strong>
                              <span>{formatDateTime(message.created_at)}</span>
                            </div>
                            <p>{message.message}</p>
                          </div>
                        </article>
                      );
                    })
                  ) : selectedChatThread ? (
                    <p className="muted">Chưa có nội dung chat nào.</p>
                  ) : (
                    <p className="muted">
                      Hãy chọn shop hoặc shipper từ dropdown bên trái.
                    </p>
                  )}
                </div>

                <form
                  className="chat-composer user-chat-composer"
                  onSubmit={onSendMessage}
                >
                  <textarea
                    className="field-textarea"
                    value={messageForm.message}
                    onChange={(event) =>
                      setMessageForm((prev) => ({
                        ...prev,
                        message: event.target.value,
                      }))
                    }
                    placeholder="Hỏi shop về sản phẩm, phiên bản, màu sắc..."
                    disabled={!selectedChatThread}
                  />
                  <button className="primary-btn user-chat-send" type="submit">
                    Gửi tin nhắn
                  </button>
                </form>
              </section>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
