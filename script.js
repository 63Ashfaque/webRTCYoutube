// 1. Generate custom Peer ID
function generateCustomPeerID(length = 4) {
  const capitals = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
 
  const result = [];

  while (result.length < length) {
    result.push(
      capitals[Math.floor(Math.random() * capitals.length)],
      numbers[Math.floor(Math.random() * numbers.length)]
      // Removed special characters
    );
  }

  // Trim and shuffle
  const trimmed = result.slice(0, length);
  for (let i = trimmed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [trimmed[i], trimmed[j]] = [trimmed[j], trimmed[i]];
  }

  return trimmed.join('');
}

// 2. Variables
const myCustomId = generateCustomPeerID();
const peer = new Peer(myCustomId);
let conn, call, player, playerReady = false;
let isConnected = false;

// 3. Show own Peer ID when ready
peer.on('open', id => {
  document.getElementById('myPeerId').value = id;
});

// 4. Handle incoming data connections
peer.on('connection', incomingConn => {
  conn = incomingConn;
  conn.on('data', handleDataFromPeer);
  showConnectionSuccess();
});

// 5. Handle incoming audio calls
peer.on('call', incomingCall => {
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    incomingCall.answer(stream);
    incomingCall.on('stream', remoteStream => {
      document.getElementById('remoteAudio').srcObject = remoteStream;
    });
  });
});

// 6. Connect to a peer
function connectToPeer() {
  const remoteId = document.getElementById('connectToId').value;
  if (!remoteId) {
    alert("Please enter a Peer ID to connect");
    return;
  }
  
  conn = peer.connect(remoteId);
  conn.on('open', () => {
    conn.on('data', handleDataFromPeer);
    console.log('Data channel open');
    showConnectionSuccess();
  });

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    call = peer.call(remoteId, stream);
    call.on('stream', remoteStream => {
      document.getElementById('remoteAudio').srcObject = remoteStream;
    });
  });
}

// 7. Disconnect from peer
function disconnectPeer() {
  if (conn) {
    conn.close();
  }
  if (call) {
    call.close();
  }
  
  // Reset UI
  document.getElementById('connection-card').style.display = 'block';
  document.getElementById('youtube-card').style.display = 'none';
  document.getElementById('player-container').style.display = 'none';
  document.getElementById('connection-status').style.display = 'none';
  
  // Reset state
  isConnected = false;
  
  // Optional: reload the page for a fresh start
  window.location.reload();
}

// Show connection success and reveal YouTube section
function showConnectionSuccess() {
  if (isConnected) return; // Prevent multiple executions
  
  isConnected = true;
  
  // Show connection status
  const connectionStatus = document.getElementById('connection-status');
  connectionStatus.style.display = 'inline-flex';
  
  // Hide connection card and show YouTube card after a short delay
  setTimeout(() => {
    document.getElementById('connection-card').style.display = 'none';
    document.getElementById('youtube-card').style.display = 'block';
  }, 1000);
}

// 8. Load YouTube API player
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '360',
    width: '640',
    videoId: '',
    events: {
      onReady: () => { playerReady = true; },
      onStateChange: onPlayerStateChange
    }
  });
}

// 9. Load specific YouTube video
function loadVideo() {
  const videoId = document.getElementById('videoId').value;
  if (!playerReady) {
    alert("YouTube player is not ready yet. Please try again in a moment.");
    return;
  }
  
  if (!videoId) {
    alert("Please enter a YouTube Video ID");
    return;
  }
  
  // Show player container
  document.getElementById('player-container').style.display = 'block';
  
  // Load the video
  player.loadVideoById(videoId);
  
  // Send video ID to peer
  if (conn && isConnected) {
    conn.send({ type: 'loadVideo', videoId: videoId });
  }
}

// 10. Detect local play/pause and sync to peer
function onPlayerStateChange(event) {
  if (!conn || !playerReady) return;

  const currentTime = player.getCurrentTime();
  if (event.data === YT.PlayerState.PLAYING) {
    conn.send({ type: 'play', time: currentTime });
  } else if (event.data === YT.PlayerState.PAUSED) {
    conn.send({ type: 'pause', time: currentTime });
  }
}

// 11. Handle all data from peer
function handleDataFromPeer(data) {
  if (!playerReady) return;

  switch(data.type) {
    case 'play':
      player.seekTo(data.time, true);
      player.playVideo();
      break;
      
    case 'pause':
      player.pauseVideo();
      player.seekTo(data.time, true);
      break;
      
    case 'loadVideo':
      // Load the same video on this side
      document.getElementById('videoId').value = data.videoId;
      document.getElementById('player-container').style.display = 'block';
      player.loadVideoById(data.videoId);
      break;
  }
}
