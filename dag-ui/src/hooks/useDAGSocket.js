import { useEffect, useRef, useCallback } from "react";

export default function useDAGSocket(runId, onEvent) {
    const wsRef = useRef(null);
    const retryRef = useRef(null);
    const onEventRef = useRef(onEvent);

    useEffect(() => { onEventRef.current = onEvent; });

    const connect = useCallback(() => {
        if (!runId) return;

        // ✅ 如果已有连接且未关闭，不重复连
        if (wsRef.current && wsRef.current.readyState < 2) return;

        const ws = new WebSocket(`ws://127.0.0.1:8000/ws/${runId}`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("✅ WS connected");
            if (retryRef.current) {
                clearTimeout(retryRef.current);
                retryRef.current = null;
            }
        };

        ws.onmessage = (msg) => {
            try {
                const event = JSON.parse(msg.data);
                console.log("📨 WS event:", event);
                onEventRef.current?.(event);
            } catch (e) {
                console.error("WS parse error", e);
            }
        };

        ws.onerror = (e) => console.warn("❌ WS error", e);

        ws.onclose = () => {
            console.log("WS closed, retrying in 2s...");
            // ✅ 确保没有重复的 retry timer
            if (!retryRef.current) {
                retryRef.current = setTimeout(() => {
                    retryRef.current = null;
                    connect();
                }, 2000);
            }
        };
    }, [runId]);

    useEffect(() => {
        connect();
        return () => {
            if (retryRef.current) clearTimeout(retryRef.current);
            wsRef.current?.close();
        };
    }, [connect]);
}