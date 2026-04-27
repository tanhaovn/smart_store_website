import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

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

export function useDbChangeSocket(token, onDbChanged) {
  const onDbChangedRef = useRef(onDbChanged);

  useEffect(() => {
    onDbChangedRef.current = onDbChanged;
  }, [onDbChanged]);

  useEffect(() => {
    if (disableRealtimeSocket || !token) {
      return undefined;
    }

    const socket = io(`${socketServerUrl}/ws/chat`, {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
    });

    const handleDbChanged = (payload) => {
      if (typeof onDbChangedRef.current === "function") {
        onDbChangedRef.current(payload);
      }
    };

    socket.on("db_changed", handleDbChanged);

    return () => {
      socket.off("db_changed", handleDbChanged);
      socket.disconnect();
    };
  }, [token]);
}
