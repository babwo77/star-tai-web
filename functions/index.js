const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { initializeApp } = require("firebase-admin/app");

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

// ============================================
// 1. 예약 생성 시 관리자에게 푸시 알림
// ============================================
exports.onReservationCreated = onDocumentCreated("reservations/{reservationId}", async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const reservationId = event.params.reservationId;

    console.log("=== 새 예약 생성 ===");
    console.log("ID:", reservationId);
    console.log("데이터:", JSON.stringify(data));

    // 관리자 토큰들 가져오기
    const tokensSnapshot = await db.collection("tokens").get();
    const tokens = tokensSnapshot.docs.map(doc => doc.data().token).filter(Boolean);

    console.log("관리자 토큰 수:", tokens.length);
    console.log("토큰 목록:", tokens);

    if (tokens.length === 0) {
        console.log("❌ 관리자 토큰 없음 - 알림 스킵");
        return;
    }

    // 슬롯 시간 계산
    const slotIndex = parseInt((data.slotId || "").replace("slot-", "")) || 0;
    const hour24 = 10 + Math.floor((slotIndex * 30) / 60);
    const minute = (slotIndex * 30) % 60;
    const period = hour24 < 12 ? "오전" : "오후";
    const hour12 = hour24 > 12 ? hour24 - 12 : (hour24 === 0 ? 12 : hour24);
    const minuteStr = minute < 10 ? "0" + minute : minute;
    const timeLabel = `${period} ${hour12}:${minuteStr}`;

    const message = {
        tokens: tokens,
        notification: {
            title: "⭐ 별타이 새 예약 요청",
            body: `${timeLabel} / ${data.people}명 / ${data.duration}분 / ${data.phoneNumber}`
        },
        data: {
            type: "new_reservation",
            reservationId: reservationId,
            slotId: data.slotId || "",
            people: String(data.people || 0),
            duration: String(data.duration || 0),
            phoneNumber: data.phoneNumber || "",
            title: "⭐ 별타이 새 예약 요청",
            body: `${timeLabel} / ${data.people}명 / ${data.duration}분`
        },
        android: {
            priority: "high",
            notification: {
                channelId: "reservation_channel",
                sound: "default",
                priority: "high"
            }
        }
    };

    try {
        const response = await messaging.sendEachForMulticast(message);
        console.log("FCM 전송 결과:", response.successCount, "/", tokens.length, "성공");

        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                console.error("❌ 토큰 실패:", tokens[idx], resp.error);
                failedTokens.push(tokens[idx]);
            }
        });

        if (failedTokens.length > 0) {
            const batch = db.batch();
            failedTokens.forEach(token => {
                batch.delete(db.collection("tokens").doc(token));
            });
            await batch.commit();
            console.log("실패 토큰 삭제:", failedTokens.length, "개");
        }
    } catch (error) {
        console.error("❌ FCM 전송 실패:", error);
    }
});

// ============================================
// 2. 예약 상태 변경 시 (승인/거절) 고객에게 알림
// ============================================
exports.onReservationUpdated = onDocumentUpdated("reservations/{reservationId}", async (event) => {
    const afterSnap = event.data.after;
    const beforeSnap = event.data.before;
    if (!afterSnap || !beforeSnap) return;

    const newData = afterSnap.data();
    const oldData = beforeSnap.data();
    const reservationId = event.params.reservationId;

    console.log("=== 예약 상태 변경 ===");
    console.log("ID:", reservationId);
    console.log("이전 상태:", oldData.status, "→ 새 상태:", newData.status);
    console.log("FCM 토큰:", newData.fcmToken || "없음");

    if (newData.status === oldData.status) {
        console.log("상태 변화 없음 - 스킵");
        return;
    }

    if (!newData.fcmToken || newData.fcmToken === "") {
        console.log("❌ 고객 FCM 토큰 없음 - 알림 스킵");
        return;
    }

    let title, body;
    if (newData.status === "approved") {
        title = "⭐ 별타이 예약 수락";
        body = "예약이 수락되셨습니다.\n예약 변경은 2시간 전 가능하며, 반복 취소/변경 시 불이익을 받으실 수 있습니다.";
    } else if (newData.status === "rejected") {
        title = "⭐ 별타이 예약 안내";
        body = "현재 시간 및 인원 조정이 필요합니다.";
    } else {
        console.log("처리할 수 없는 상태:", newData.status);
        return;
    }

    const message = {
        token: newData.fcmToken,
        notification: { title, body },
        data: {
            type: "status_changed",
            status: newData.status,
            reservationId: reservationId,
            title,
            body
        },
        webpush: {
            notification: { requireInteraction: true }
        },
        android: {
            priority: "high",
            notification: {
                channelId: "reservation_channel",
                sound: "default"
            }
        }
    };

    try {
        const response = await messaging.send(message);
        console.log("✅ 고객 알림 전송 성공:", response);
    } catch (error) {
        console.error("❌ 고객 알림 실패:", error);
        if (error.code === "messaging/registration-token-not-registered") {
            await db.collection("customerTokens").doc(newData.fcmToken.substring(0, 20)).delete();
            console.log("유효하지 않은 토큰 삭제");
        }
    }
});

// ============================================
// 3. 🆕 예약 삭제 시 (리셋) 고객에게 알림
// ============================================
exports.onReservationDeleted = onDocumentDeleted("reservations/{reservationId}", async (event) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const reservationId = event.params.reservationId;

    console.log("=== 예약 삭제됨 (리셋) ===");
    console.log("ID:", reservationId);
    console.log("데이터:", JSON.stringify(data));
    console.log("FCM 토큰:", data.fcmToken || "없음");

    if (!data.fcmToken || data.fcmToken === "") {
        console.log("❌ 고객 FCM 토큰 없음 - 알림 스킵");
        return;
    }

    // 슬롯 시간 계산
    const slotIndex = parseInt((data.slotId || "").replace("slot-", "")) || 0;
    const hour24 = 10 + Math.floor((slotIndex * 30) / 60);
    const minute = (slotIndex * 30) % 60;
    const period = hour24 < 12 ? "오전" : "오후";
    const hour12 = hour24 > 12 ? hour24 - 12 : (hour24 === 0 ? 12 : hour24);
    const minuteStr = minute < 10 ? "0" + minute : minute;
    const timeLabel = `${period} ${hour12}:${minuteStr}`;

    const title = "⭐ 별타이 예약 안내";
    const body = `관리자에 의해 ${timeLabel} 예약이 초기화되었습니다.\n다시 예약해주세요.`;

    const message = {
        token: data.fcmToken,
        notification: { title, body },
        data: {
            type: "reservation_reset",
            status: "reset",
            reservationId: reservationId,
            slotId: data.slotId || "",
            title,
            body
        },
        webpush: {
            notification: { requireInteraction: true }
        },
        android: {
            priority: "high",
            notification: {
                channelId: "reservation_channel",
                sound: "default"
            }
        }
    };

    try {
        const response = await messaging.send(message);
        console.log("✅ 삭제 알림 전송 성공:", response);
    } catch (error) {
        console.error("❌ 삭제 알림 실패:", error);
        if (error.code === "messaging/registration-token-not-registered") {
            await db.collection("customerTokens").doc(data.fcmToken.substring(0, 20)).delete();
            console.log("유효하지 않은 토큰 삭제");
        }
    }
});