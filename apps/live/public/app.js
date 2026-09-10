/**
 * Izora live engine — embed-only WebRTC (loaded in iframe from the main app).
 * Direct visits to this origin show an engine-only notice, not a video-call lobby.
 */
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const params = new URLSearchParams(location.search);
const prefillRoom = params.get("room")?.trim() ?? "";
const hostLabel = params.get("host");
const autoJoin = params.get("autojoin") === "1";
const isEmbed = params.get("embed") === "1";
const joinRole = params.get("role") === "viewer" ? "viewer" : "host";
const broadcastLayout = params.get("layout") !== "call";
const audioOnlyMode = params.get("audioOnly") === "1";
/** Host, or a guest accepted onto the stream — both send video. Passive viewers don't. */
const isBroadcaster = joinRole !== "viewer";

/** Main app iframe must pass room + embed + autojoin */
const embedSession = isEmbed && !!prefillRoom && autoJoin;

const engineOnlyEl = document.getElementById("engine-only");
const callPanel = document.getElementById("call-panel");
const joinErr = document.getElementById("join-err");
const localVideo = document.getElementById("local");
const remoteGrid = document.getElementById("remote-grid");
const callMain = document.getElementById("call-main");
const callPip = document.getElementById("call-pip");
const btnMic = document.getElementById("btn-mic");
const btnCam = document.getElementById("btn-cam");
const btnHangup = document.getElementById("btn-hangup");
const btnMicIcon = document.getElementById("btn-mic-icon");
const btnCamIcon = document.getElementById("btn-cam-icon");
const statusEl = document.getElementById("status");
const callTimerEl = document.getElementById("call-timer");
const callMetaEl = document.getElementById("call-meta");

let socket;
/** @type {Map<string, RTCPeerConnection>} */
const peerConnections = new Map();
/** @type {Map<string, HTMLVideoElement>} */
const remoteVideos = new Map();
let localStream;
let viewsSwapped = false;
let currentRoomId = prefillRoom;
let timerInterval = null;
let callStartedAt = null;

if (!embedSession) {
  if (engineOnlyEl) engineOnlyEl.hidden = false;
  document.body.classList.add("engine-only-mode");
  const appLink = document.getElementById("engine-only-app-link");
  if (appLink) {
    try {
      const main = new URL("http://localhost:5173");
      if (hostLabel) main.pathname = `/u/${hostLabel}/live`;
      appLink.href = main.href;
      appLink.textContent = main.href;
    } catch {
      /* keep default */
    }
  }
} else {
  document.body.classList.add("broadcast-mode");
  document.body.classList.add(isBroadcaster ? "role-broadcaster" : "role-viewer");
  if (callPanel) callPanel.hidden = false;
  // A viewer has no camera/mic of their own — those controls are the host's, not theirs.
  // (.call-btn sets its own `display`, which beats the `hidden` attribute in the cascade.)
  if (!isBroadcaster) {
    if (btnMic) btnMic.style.display = "none";
    if (btnCam) btnCam.style.display = "none";
  }
  const hangupLabel = document.querySelector("#btn-hangup .call-btn-label");
  if (hangupLabel) hangupLabel.textContent = isBroadcaster ? "End stream" : "Leave";
  void startEmbedSession();
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function showJoinError(msg) {
  if (!joinErr) return;
  joinErr.hidden = !msg;
  joinErr.textContent = msg || "";
  try {
    window.parent.postMessage({ type: "izora-live-error", message: msg }, "*");
  } catch {
    /* ignore */
  }
}

function notifyParentLayout() {
  const n = peerConnections.size;
  const layout = n === 0 ? "solo" : n === 1 ? "duo" : "grid";
  try {
    window.parent.postMessage({ type: "izora-live-layout", layout, peers: n }, "*");
  } catch {
    /* ignore */
  }
}

function updateLayoutMode() {
  if (!callMain) return;
  const n = peerConnections.size;
  callMain.classList.toggle("call-main--duo", n === 1);
  callMain.classList.toggle("call-main--group", n >= 2);
  document.body.classList.toggle("broadcast--solo", n === 0);
  document.body.classList.toggle("broadcast--duo", n === 1);
  document.body.classList.toggle("broadcast--grid", n >= 2);
  notifyParentLayout();
}

/**
 * No one else is sending video yet (no guest has been accepted onto the
 * stream) — for a host/guest that means THEY are the stream, so their own
 * camera belongs on the main stage, not hidden in a corner waiting for a
 * "remote" party that will never arrive from a receive-only viewer.
 */
function soloBroadcast() {
  return isBroadcaster && remoteVideos.size === 0;
}

function applyViewLayout() {
  if (!callMain || !callPip || !remoteGrid) return;
  const singleRemote = remoteVideos.size === 1;
  const mainIsLocal = soloBroadcast() || (singleRemote && viewsSwapped);

  if (mainIsLocal) {
    callMain.appendChild(localVideo);
    callPip.appendChild(remoteGrid);
  } else {
    callMain.appendChild(remoteGrid);
    callPip.appendChild(localVideo);
  }
  // Nothing meaningful to show in the corner: a viewer has no camera of
  // their own, and a solo broadcaster's PIP would just be an empty tile.
  if (callPip) callPip.hidden = !isBroadcaster || soloBroadcast();
  updateWaitingPlaceholder();
  localVideo?.play().catch(() => {});
  for (const v of remoteVideos.values()) v.play().catch(() => {});
}

function toggleCallViews() {
  if (remoteVideos.size !== 1) return;
  viewsSwapped = !viewsSwapped;
  applyViewLayout();
}

if (callPip) {
  callPip.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCallViews();
  });
}

function updateWaitingPlaceholder() {
  const el = document.getElementById("call-waiting");
  if (!el) return;
  el.hidden = remoteVideos.size > 0 || soloBroadcast();
  if (!el.hidden) el.textContent = "Waiting for host to go live…";
}

function updateConnectionStatus() {
  // Co-broadcasters only (accepted guests actually sending video) — a silent
  // viewer isn't "on stream" with you, so they don't belong in this count.
  const co = remoteVideos.size;
  if (callMetaEl) {
    if (joinRole === "viewer") callMetaEl.textContent = "Watching";
    else if (co === 0) callMetaEl.textContent = "On air";
    else if (co === 1) callMetaEl.textContent = "You + 1 co-host";
    else callMetaEl.textContent = `You + ${co} co-hosts`;
  }
  const conns = [...peerConnections.values()];
  if (conns.length === 0) {
    setStatus(joinRole === "viewer" ? "Waiting for host…" : "Waiting for viewers…");
    return;
  }
  const anyFailed = conns.some((c) => c.connectionState === "failed");
  const allConnected = conns.every((c) => c.connectionState === "connected");
  if (anyFailed) setStatus("Connection issue");
  else if (allConnected) setStatus("Live");
  else setStatus("Connecting…");
}

function startCallTimer() {
  if (timerInterval) return;
  callStartedAt = Date.now();
  timerInterval = setInterval(() => {
    if (!callStartedAt || !callTimerEl) return;
    const s = Math.floor((Date.now() - callStartedAt) / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    callTimerEl.textContent = `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }, 1000);
}

function stopCallTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  callStartedAt = null;
  if (callTimerEl) callTimerEl.textContent = "";
}

function maybeStartTimer() {
  for (const conn of peerConnections.values()) {
    if (conn.connectionState === "connected") {
      startCallTimer();
      return;
    }
  }
}

function updateMediaButtons() {
  const audioT = localStream?.getAudioTracks()[0];
  const videoT = localStream?.getVideoTracks()[0];
  const micOn = audioT?.enabled ?? true;
  const camOn = videoT?.enabled ?? true;
  if (btnMic) {
    btnMic.classList.toggle("is-off", !micOn);
    if (btnMicIcon) btnMicIcon.textContent = micOn ? "🎤" : "🔇";
  }
  if (btnCam) {
    btnCam.classList.toggle("is-off", !camOn);
    if (btnCamIcon) btnCamIcon.textContent = camOn ? "📷" : "📵";
  }
}

function toggleMic() {
  const t = localStream?.getAudioTracks()[0];
  if (!t) return;
  t.enabled = !t.enabled;
  updateMediaButtons();
}

function toggleCam() {
  const t = localStream?.getVideoTracks()[0];
  if (!t) return;
  t.enabled = !t.enabled;
  updateMediaButtons();
}

function cleanupCallState() {
  stopCallTimer();
  if (socket) {
    try {
      if (socket.connected) socket.emit("leave-room");
    } catch {
      /* ignore */
    }
    socket.disconnect();
    socket = null;
  }
  for (const conn of peerConnections.values()) conn.close();
  peerConnections.clear();
  for (const vid of remoteVideos.values()) {
    vid.srcObject = null;
    vid.remove();
  }
  remoteVideos.clear();
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  if (localVideo) localVideo.srcObject = null;
  viewsSwapped = false;
  applyViewLayout();
  setStatus("");
}

function hangUp() {
  cleanupCallState();
  const waiting = document.getElementById("call-waiting");
  if (waiting) {
    waiting.hidden = false;
    waiting.textContent = isBroadcaster ? "Stream ended" : "You left the stream";
  }
  try {
    window.parent.postMessage({ type: "izora-live-left" }, "*");
  } catch {
    /* ignore */
  }
}

function formatGetUserMediaError(err) {
  const name = err?.name || "Error";
  const msg = err?.message || String(err);
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Allow camera and microphone for this site.";
  }
  if (name === "NotFoundError") return "No camera or microphone found.";
  if (name === "NotReadableError") return "Camera or mic is in use elsewhere.";
  return msg || name;
}

async function ensureMedia() {
  if (localStream) return localStream;
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera not available — use https://");
  }
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: { facingMode: { ideal: "user" } },
  });
  if (localVideo) localVideo.srcObject = localStream;
  if (audioOnlyMode) {
    for (const t of localStream.getVideoTracks()) t.enabled = false;
  }
  updateMediaButtons();
  return localStream;
}

function ensureRemoteVideo(peerId, stream) {
  let vid = remoteVideos.get(peerId);
  if (!vid && remoteGrid) {
    vid = document.createElement("video");
    vid.id = `remote-${peerId}`;
    vid.autoplay = true;
    vid.playsInline = true;
    vid.setAttribute("playsinline", "");
    vid.className = "call-remote-tile";
    remoteVideos.set(peerId, vid);
    remoteGrid.appendChild(vid);
  }
  if (vid) {
    vid.srcObject = stream;
    vid.play().catch(() => {});
  }
  updateWaitingPlaceholder();
  updateLayoutMode();
}

function removePeer(peerId) {
  const conn = peerConnections.get(peerId);
  if (conn) {
    conn.close();
    peerConnections.delete(peerId);
  }
  const vid = remoteVideos.get(peerId);
  if (vid) {
    vid.srcObject = null;
    vid.remove();
    remoteVideos.delete(peerId);
  }
  if (peerConnections.size !== 1) viewsSwapped = false;
  updateLayoutMode();
  applyViewLayout();
  updateConnectionStatus();
}

function createPeerConnection(peerId) {
  if (peerConnections.has(peerId)) return peerConnections.get(peerId);
  const conn = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  peerConnections.set(peerId, conn);
  updateLayoutMode();
  applyViewLayout();

  if (localStream) {
    for (const track of localStream.getTracks()) {
      conn.addTrack(track, localStream);
    }
  }

  conn.ontrack = (ev) => {
    if (ev.streams[0]) ensureRemoteVideo(peerId, ev.streams[0]);
  };

  conn.onicecandidate = (ev) => {
    if (ev.candidate && socket) {
      socket.emit("signal", { to: peerId, type: "ice", candidate: ev.candidate });
    }
  };

  conn.onconnectionstatechange = () => {
    updateConnectionStatus();
    maybeStartTimer();
  };

  return conn;
}

async function initiatePeer(peerId) {
  const conn = createPeerConnection(peerId);
  const offer = await conn.createOffer();
  await conn.setLocalDescription(offer);
  socket.emit("signal", { to: peerId, type: "offer", sdp: conn.localDescription });
}

async function handleSignal(data) {
  const peerId = data.from;
  if (!peerId) return;

  if (data.type === "ice" && data.candidate) {
    const conn = peerConnections.get(peerId);
    if (!conn) return;
    try {
      await conn.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch {
      /* ignore */
    }
    return;
  }

  if (data.type === "offer" && data.sdp) {
    let conn = peerConnections.get(peerId);
    if (!conn) conn = createPeerConnection(peerId);
    await conn.setRemoteDescription(new RTCSessionDescription(data.sdp));
    const answer = await conn.createAnswer();
    await conn.setLocalDescription(answer);
    socket.emit("signal", { to: peerId, type: "answer", sdp: conn.localDescription });
    return;
  }

  if (data.type === "answer" && data.sdp) {
    const conn = peerConnections.get(peerId);
    if (!conn) return;
    await conn.setRemoteDescription(new RTCSessionDescription(data.sdp));
  }
}

async function joinRoomFlow() {
  showJoinError("");
  const roomId = prefillRoom;
  if (!roomId) {
    showJoinError("Missing room — open live from the main app.");
    return;
  }

  if (joinRole !== "viewer") {
    try {
      await ensureMedia();
    } catch (err) {
      showJoinError(formatGetUserMediaError(err));
      return;
    }
  } else if (localVideo) {
    localVideo.style.display = "none";
  }

  viewsSwapped = false;
  applyViewLayout();
  await localVideo?.play().catch(() => {});

  socket = io();

  socket.on("connect_error", () => {
    showJoinError("Could not connect to live engine.");
    cleanupCallState();
  });

  socket.on("signal", (payload) => {
    handleSignal(payload).catch(() => {});
  });

  socket.on("peer-joined", (data) => {
    const peerId = data.id;
    if (!peerId || peerId === socket.id) return;
    createPeerConnection(peerId);
    if (joinRole !== "viewer" && localStream) void initiatePeer(peerId);
    updateConnectionStatus();
  });

  socket.on("peer-left", (data) => {
    if (data?.id) removePeer(data.id);
  });

  socket.emit("join-room", roomId, async (res) => {
    if (!res?.ok) {
      showJoinError(res?.error === "room-full" ? "Stream is full." : "Could not join stream.");
      cleanupCallState();
      return;
    }

    currentRoomId = res.room || roomId;
    setStatus("Connecting…");
    updateConnectionStatus();

    for (const peerId of res.peers || []) {
      createPeerConnection(peerId);
      if (joinRole !== "viewer" && localStream) await initiatePeer(peerId);
    }
    notifyParentLayout();
  });
}

async function startEmbedSession() {
  applyViewLayout();
  await joinRoomFlow();
}

if (btnMic) btnMic.addEventListener("click", () => toggleMic());
if (btnCam) btnCam.addEventListener("click", () => toggleCam());
if (btnHangup) btnHangup.addEventListener("click", () => hangUp());

document.addEventListener("keydown", (e) => {
  if (!embedSession || callPanel?.hidden) return;
  if (e.target.closest?.("input, textarea, select")) return;
  const k = e.key.toLowerCase();
  if (k === "m") {
    e.preventDefault();
    toggleMic();
  } else if (k === "v") {
    e.preventDefault();
    toggleCam();
  } else if (e.key === "Escape") {
    e.preventDefault();
    hangUp();
  }
});
