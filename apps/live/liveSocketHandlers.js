import {
  getRoom,
  snapshot,
  addChat,
  removeChat,
  addGuestRequest,
  popGuestRequest,
  recalcViewerCount,
  deleteRoomIfEmpty,
} from "./liveRoomState.js";

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function registerLiveSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("live-join", (payload, ack) => {
      const roomId = String(payload?.roomId || "").trim().slice(0, 64);
      if (!roomId) {
        ack?.({ ok: false, error: "invalid-room" });
        return;
      }

      const room = getRoom(roomId);
      if (!room) {
        ack?.({ ok: false, error: "invalid-room" });
        return;
      }

      let role = payload?.role === "host" || payload?.role === "guest" ? payload.role : "viewer";
      const userId = payload?.userId ? String(payload.userId).slice(0, 64) : undefined;
      const displayName = String(payload?.displayName || "Viewer").slice(0, 80);
      const avatarUrl = payload?.avatarUrl ? String(payload.avatarUrl).slice(0, 512) : undefined;
      const wantsHost = payload?.claimHost === true;

      if (wantsHost || (role === "host" && !room.hostSocketId)) {
        role = "host";
        room.hostSocketId = socket.id;
        room.hostUserId = userId || null;
        room.isLive = true;
      } else if (role === "host" && room.hostSocketId && room.hostSocketId !== socket.id) {
        role = "viewer";
      }

      if (role === "guest" && room.hostSocketId !== payload?.approvedByHost) {
        role = "viewer";
      }

      const member = {
        id: newId(),
        socketId: socket.id,
        userId,
        displayName,
        avatarUrl,
        role,
        audioOnly: !!payload?.audioOnly,
      };

      room.members.set(socket.id, member);
      socket.join(`live:${roomId}`);
      socket.data.liveRoom = roomId;
      socket.data.liveRole = role;
      socket.data.liveMemberId = member.id;

      recalcViewerCount(room);

      const joinToast =
        role === "viewer"
          ? { type: "joined", displayName, at: new Date().toISOString() }
          : null;

      if (joinToast) {
        io.to(`live:${roomId}`).emit("live-toast", joinToast);
      }

      io.to(`live:${roomId}`).emit("live-state", snapshot(room));

      ack?.({
        ok: true,
        roomId,
        role,
        memberId: member.id,
        state: snapshot(room),
        chat: room.chat.slice(-80),
        hostSocketId: room.hostSocketId,
      });
    });

    socket.on("live-leave", () => {
      leaveLiveSocket(socket, io);
    });

    socket.on("live-chat", (payload) => {
      const roomId = socket.data.liveRoom;
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room) return;
      const member = room.members.get(socket.id);
      if (!member) return;

      const body = String(payload?.body || "").trim().slice(0, 500);
      if (!body) return;

      const msg = {
        id: newId(),
        roomId,
        authorId: member.userId,
        authorName: member.displayName,
        authorAvatarUrl: member.avatarUrl,
        body,
        createdAt: new Date().toISOString(),
        kind: payload?.kind === "gift" ? "gift" : "chat",
        giftId: payload?.giftId,
        giftLabel: payload?.giftLabel,
      };

      addChat(room, msg);
      io.to(`live:${roomId}`).emit("live-chat", msg);
    });

    socket.on("live-like", () => {
      const roomId = socket.data.liveRoom;
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room) return;
      room.likeCount += 1;
      io.to(`live:${roomId}`).emit("live-like", { count: room.likeCount });
    });

    socket.on("live-gift", (payload) => {
      const roomId = socket.data.liveRoom;
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room) return;
      const member = room.members.get(socket.id);
      if (!member) return;

      const gift = {
        id: newId(),
        giftId: String(payload?.giftId || "rose"),
        giftLabel: String(payload?.giftLabel || "Gift"),
        coins: Number(payload?.coins) || 10,
        fromUserId: member.userId,
        fromName: member.displayName,
        at: new Date().toISOString(),
      };

      if (member.userId) {
        room.giftTotals[member.userId] = (room.giftTotals[member.userId] || 0) + gift.coins;
      }

      room.recentGifts.push(gift);
      if (room.recentGifts.length > 20) room.recentGifts = room.recentGifts.slice(-20);

      io.to(`live:${roomId}`).emit("live-gift", gift);
      io.to(`live:${roomId}`).emit("live-state", snapshot(room));
    });

    socket.on("live-guest-request", (payload, ack) => {
      const roomId = socket.data.liveRoom;
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room) return;
      const member = room.members.get(socket.id);
      if (!member || member.role !== "viewer") {
        ack?.({ ok: false, error: "not-viewer" });
        return;
      }

      const entry = {
        id: newId(),
        socketId: socket.id,
        userId: member.userId,
        displayName: member.displayName,
        avatarUrl: member.avatarUrl,
        message: String(payload?.message || "").slice(0, 200),
        at: new Date().toISOString(),
      };

      const added = addGuestRequest(room, entry);
      if (!added) {
        ack?.({ ok: false, error: "queue-full" });
        return;
      }

      if (room.hostSocketId) {
        io.to(room.hostSocketId).emit("live-guest-request", entry);
      }
      io.to(`live:${roomId}`).emit("live-state", snapshot(room));
      ack?.({ ok: true, requestId: entry.id });
    });

    socket.on("live-guest-respond", (payload, ack) => {
      const roomId = socket.data.liveRoom;
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room) return;
      if (socket.id !== room.hostSocketId) {
        ack?.({ ok: false, error: "not-host" });
        return;
      }

      const requestId = String(payload?.requestId || "");
      const accept = payload?.accept === true;
      const entry = popGuestRequest(room, requestId);
      if (!entry) {
        ack?.({ ok: false, error: "missing" });
        return;
      }

      const targetSocket = entry.socketId ? io.sockets.sockets.get(entry.socketId) : null;
      if (accept && targetSocket) {
        const m = room.members.get(entry.socketId);
        if (m) {
          m.role = "guest";
          targetSocket.data.liveRole = "guest";
        }
        targetSocket.emit("live-guest-accepted", { roomId, approvedByHost: room.hostSocketId });
        io.to(`live:${roomId}`).emit("live-toast", {
          type: "guest-on",
          displayName: entry.displayName,
        });
      } else if (targetSocket) {
        targetSocket.emit("live-guest-rejected", { requestId });
      }

      io.to(`live:${roomId}`).emit("live-state", snapshot(room));
      ack?.({ ok: true });
    });

    socket.on("live-guest-remove", (payload) => {
      const roomId = socket.data.liveRoom;
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room || socket.id !== room.hostSocketId) return;

      const targetSocketId = payload?.socketId;
      if (!targetSocketId) return;
      const m = room.members.get(targetSocketId);
      if (m && m.role === "guest") {
        m.role = "viewer";
        const ts = io.sockets.sockets.get(targetSocketId);
        if (ts) {
          ts.data.liveRole = "viewer";
          ts.emit("live-guest-removed", {});
        }
        io.to(`live:${roomId}`).emit("live-state", snapshot(room));
      }
    });

    socket.on("live-pin", (payload) => {
      const roomId = socket.data.liveRoom;
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room || socket.id !== room.hostSocketId) return;
      room.pinnedChatId = payload?.messageId ? String(payload.messageId) : null;
      io.to(`live:${roomId}`).emit("live-pin", { messageId: room.pinnedChatId });
    });

    socket.on("live-delete-chat", (payload) => {
      const roomId = socket.data.liveRoom;
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room) return;
      const isHost = socket.id === room.hostSocketId;
      const member = room.members.get(socket.id);
      if (!isHost && member?.role !== "mod") return;
      const messageId = String(payload?.messageId || "");
      if (!messageId) return;
      if (removeChat(room, messageId)) {
        io.to(`live:${roomId}`).emit("live-delete-chat", { messageId });
      }
    });

    socket.on("live-settings", (payload) => {
      const roomId = socket.data.liveRoom;
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room || socket.id !== room.hostSocketId) return;
      if (typeof payload?.slowMode === "boolean") room.slowMode = payload.slowMode;
      if (typeof payload?.followersOnly === "boolean") room.followersOnly = payload.followersOnly;
      if (typeof payload?.privateLive === "boolean") room.privateLive = payload.privateLive;
      if (payload?.title != null) room.title = String(payload.title).slice(0, 120);
      if (payload?.isLive === false) room.isLive = false;
      io.to(`live:${roomId}`).emit("live-state", snapshot(room));
    });

    socket.on("live-poll", (payload) => {
      const roomId = socket.data.liveRoom;
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room || socket.id !== room.hostSocketId) return;
      if (payload?.clear) {
        room.poll = null;
      } else {
        room.poll = {
          id: newId(),
          question: String(payload?.question || "").slice(0, 200),
          options: (payload?.options || []).slice(0, 4).map((o) => String(o).slice(0, 80)),
          votes: {},
        };
      }
      io.to(`live:${roomId}`).emit("live-poll", room.poll);
    });

    socket.on("live-poll-vote", (payload) => {
      const roomId = socket.data.liveRoom;
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room?.poll) return;
      const member = room.members.get(socket.id);
      const key = member?.userId || socket.id;
      const idx = Number(payload?.optionIndex);
      if (Number.isFinite(idx) && idx >= 0 && idx < room.poll.options.length) {
        room.poll.votes[key] = idx;
        io.to(`live:${roomId}`).emit("live-poll", room.poll);
      }
    });

    socket.on("live-qa", (payload) => {
      const roomId = socket.data.liveRoom;
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room) return;
      const member = room.members.get(socket.id);
      if (!member) return;
      const body = String(payload?.body || "").trim().slice(0, 300);
      if (!body) return;
      const q = {
        id: newId(),
        userId: member.userId,
        displayName: member.displayName,
        body,
        at: new Date().toISOString(),
      };
      room.qa.unshift(q);
      if (room.qa.length > 50) room.qa = room.qa.slice(0, 50);
      io.to(`live:${roomId}`).emit("live-qa", q);
      if (room.hostSocketId) io.to(room.hostSocketId).emit("live-qa", q);
    });

    socket.on("live-end", () => {
      const roomId = socket.data.liveRoom;
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room || socket.id !== room.hostSocketId) return;
      room.isLive = false;
      io.to(`live:${roomId}`).emit("live-ended", { roomId });
      io.to(`live:${roomId}`).emit("live-state", snapshot(room));
    });

    socket.on("disconnecting", () => {
      leaveLiveSocket(socket, io);
    });
  });
}

function leaveLiveSocket(socket, io) {
  const roomId = socket.data.liveRoom;
  if (!roomId) return;
  const room = getRoom(roomId);
  if (!room) return;

  room.members.delete(socket.id);
  if (room.hostSocketId === socket.id) {
    room.hostSocketId = null;
    room.isLive = false;
    for (const m of room.members.values()) {
      if (m.role === "host") m.role = "viewer";
    }
  }

  recalcViewerCount(room);
  io.to(`live:${roomId}`).emit("live-state", snapshot(room));
  deleteRoomIfEmpty(roomId);
  delete socket.data.liveRoom;
}
