import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

import "./App.css";

const peerConnections = {};
const config = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302"],
    },
  ],
};
const constraints = {
  video: { facingMode: "user" },
  // Uncomment to enable audio
   audio: true,
};

function App() {
  const [userId] = useState(`${new Date().getTime()}`);

  useEffect(() => {
    const socket = io(window.location.origin, {
      query: `userId=${userId}`,
    });

    const presenderVideo = document.getElementById("presenter-video");
    const receiverVideo = document.getElementById("receiver-video");

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        presenderVideo.srcObject = stream;

        socket.on("receiver", (receiverId) => {
          if (receiverId === userId) {
            return;
          }
          // CREATE RECEIVER RTC OBJECT
          const peerConnection = new RTCPeerConnection(config);
          peerConnections[receiverId] = peerConnection;

          // ADD CURRENT USER STREAM TO RECEIVER PEER OBJECT
          stream
            .getTracks()
            .forEach((track) => peerConnection.addTrack(track, stream));

          // HANDLE INTERNET CONNECTIVITY CANDIDATES
          peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit("candidate", receiverId, event.candidate);
            }
          };

          // SEND OFFER TO RECEIVER
          peerConnection
            .createOffer()
            .then((sdp) => peerConnection.setLocalDescription(sdp))
            .then(() => {
              socket.emit("offer", receiverId, peerConnection.localDescription);
            });
        });

        // RECEIVER DESCRIPTION
        socket.on("answer", (receiverId, description) => {
          if (peerConnections[receiverId] && description) {
            peerConnections[receiverId].setRemoteDescription(description);
          }
        });
      })
      .catch((error) => console.error(error));

    //  COMMON FOR BOTH SENDER AND RECEIVER
    socket.on("candidate", (id, candidate) => {
      if (peerConnections[id] && candidate) {
        peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // HANDLE PRESENTER OFFER
    socket.on("offer", (presenterId, description) => {
      const peerConnection = new RTCPeerConnection(config);
      peerConnections[presenterId] = peerConnection;
      peerConnection
        .setRemoteDescription(description)
        .then(() => peerConnection.createAnswer())
        .then((sdp) => peerConnection.setLocalDescription(sdp))
        .then(() => {
          socket.emit("answer", presenterId, peerConnection.localDescription);
        });

      // SET STREAM TO RECEIVER VIDEO TRACK
      peerConnection.ontrack = (event) => {
        receiverVideo.srcObject = event.streams[0];
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("candidate", presenterId, event.candidate);
        }
      };
    });
  }, []);

  return (
    <div className="container">
      <div className="video-container">
        <div className="presenter-video-container">
          <video id="presenter-video" autoplay="true" muted="muted"></video>
        </div>

        <video id="receiver-video" autoplay="true"></video>
      </div>
    </div>
  );
}

export default App;
