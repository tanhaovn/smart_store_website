import { useEffect, useState } from "react";
import DashboardLayout from "../DashboardLayout";
import { apiGet, apiPatch, apiPost } from "../../../services/http";
import { formatMoney, safeItems } from "../dashboardUtils";

export default function DeliveryDashboard() {
  const [assignments, setAssignments] = useState([]);
  const [shippingFee, setShippingFee] = useState(null);
  const [notice, setNotice] = useState("");
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

  async function refreshAll() {
    const data = await apiGet("/api/delivery/orders");
    setAssignments(safeItems(data.items));
  }

  useEffect(() => {
    refreshAll().catch((error) => setNotice(error.message));
  }, []);

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
    </DashboardLayout>
  );
}
