import React, { useEffect, useState, useReducer } from "react";
import { io } from "socket.io-client";
import {
  Modal,
  Spin,
  Alert,
  Drawer,
  Tooltip,
  Button,
  Input,
  Badge,
  Avatar,
} from "antd";
import {
  ExclamationCircleOutlined,
  LoadingOutlined,
  MessageOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";

import "./Video.css";

const { confirm } = Modal;
const { TextArea } = Input;
const spinIcon = <LoadingOutlined style={{ fontSize: 40 }} spin />;

const peerConnections = {};
let sendChannel = null;
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

const hanldePermissionModal = () => {
  return new Promise(async (resolve) => {
    let haveVideoPermission = true;
    let haveAudioPermission = true;

    await navigator.permissions
      .query({ name: "camera" })
      .then(function (result) {
        if (result.state !== "granted") {
          haveVideoPermission = false;
        }
      });
    await navigator.permissions
      .query({ name: "microphone" })
      .then(function (result) {
        if (result.state !== "granted") {
          haveAudioPermission = false;
        }
      });

    if (!haveVideoPermission || !haveAudioPermission) {
      confirm({
        cancelButtonProps: { style: { display: "none" } },
        title: `V-Connect wants to enable ${
          !haveAudioPermission ? "microphone" : ""
        } ${!haveVideoPermission && !haveAudioPermission ? "&" : ""} ${
          !haveVideoPermission ? "camera" : ""
        }`,
        icon: <ExclamationCircleOutlined />,
        onOk() {
          resolve();
        },
      });
    } else {
      resolve();
    }
  });
};

const Video = () => {
  const [userId] = useState(`${new Date().getTime()}`);
  const [showChat, onShowChat] = useState(false);

  const [{ messages, msg, badge, showSpin }, dispatch] = useReducer(
    (state, action) => {
      if (action.type === "NEW_MESSAGE") {
        return { ...state, messages: [...state.messages, action.data] };
      } else if (action.type === "TYPE_MESSAGE") {
        return { ...state, msg: action.data };
      } else if (action.type === "BADGE") {
        const count = state.badge ? state.badge + 1 : 1;
        return { ...state, badge: count };
      } else if (action.type === "RESET_BADGE") {
        return { ...state, badge: null };
      } else if (action.type === "SHOW_SPIN") {
        return { ...state, showSpin: action.data };
      }
      return state;
    },
    { messages: [], msg: "", badge: null, showSpin: true }
  );

  const handleSendChannelStatusChange = (event) => {
    if (sendChannel) {
      let state = sendChannel.readyState;
      console.log("state", state);
      if (state === "open") {
        // Enable send msg btn
        dispatch({
          type: "SHOW_SPIN",
          data: false,
        });
      } else {
        // Disable send msg btn
        dispatch({
          type: "SHOW_SPIN",
          data: true,
        });
      }
    }
  };

  const onSendMsg = () => {
    if (sendChannel) {
      sendChannel.send(msg);
      dispatch({
        type: "NEW_MESSAGE",
        data: {
          isPresenter: true,
          msg,
        },
      });
      dispatch({
        type: "TYPE_MESSAGE",
        data: "",
      });
    }
  };

  const handleReceiveMessage = (event) => {
    var receivedMsg = event.data;
    if (!showChat) {
      dispatch({
        type: "BADGE",
      });
    }
    dispatch({
      type: "NEW_MESSAGE",
      data: {
        msg: receivedMsg,
      },
    });
  };

  const handleReceiveChannelStatusChange = (event) => {};

  useEffect(async () => {
    await hanldePermissionModal();

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

          // DATA CHANNEL
          sendChannel = peerConnection.createDataChannel("sendChannel");
          sendChannel.onopen = handleSendChannelStatusChange;
          sendChannel.onclose = handleSendChannelStatusChange;

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

      //DATA CHANNEL
      peerConnection.ondatachannel = (event) => {
        let receiveChannel = event.channel;
        receiveChannel.onmessage = handleReceiveMessage;
        receiveChannel.onopen = handleReceiveChannelStatusChange;
        receiveChannel.onclose = handleReceiveChannelStatusChange;
      };

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

    return () => {
      socket.disconnect();
      stopTracks(presenderVideo);
      stopTracks(receiverVideo);
    };
  }, []);

  const stopTracks = (videoObj) => {
    if (videoObj?.srcObject?.getTracks) {
      const tracks = videoObj.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoObj.srcObject = null;
    }
  };

  const toggleChatVisibility = () => {
    dispatch({
      type: "RESET_BADGE",
    });
    onShowChat(!showChat);
  };

  const ChatIcon = () => (
    <div className="chat-icon-container">
      <Badge count={badge}>
        <MessageOutlined
          onClick={toggleChatVisibility}
          className="chat-icon"
          disabled={showSpin}
        />
      </Badge>
    </div>
  );

  const SendIcon = () => (
    <SendOutlined onClick={onSendMsg} className="chat-icon chat-send-icon" />
  );

  const onMsgChange = (event) =>
    dispatch({
      type: "TYPE_MESSAGE",
      data: event.target.value,
    });

  const Message = ({ isPresenter, msg }) => (
    <>
      {msg && (
        <div
          className={`chat-message-container ${
            isPresenter ? "chat-message-presenter" : ""
          }`}
        >
          <div className="chat-avatar-container">
            <Avatar className="chat-avatar" icon={<UserOutlined />} />
          </div>
          <div>
            <div>{`${isPresenter ? "You" : "Partner"}`}</div>
            <div>{msg}</div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="call-container">
      <div className="video-container">
        <div className="presenter-video-container">
          <video
            id="presenter-video"
            autoplay="true"
            muted="true"
            controls
          ></video>
        </div>
        {showSpin && (
          <div className="spin-container">
            <Spin indicator={spinIcon} tip="Waiting for partner..." />
          </div>
        )}
        <video id="receiver-video" autoplay="true"></video>
      </div>
      <div className="meet-id-container">
        <Alert message="Your Meeting ID 15bc" type="info" />
      </div>
      <Drawer
        title="Message"
        placement="left"
        closable={true}
        onClose={toggleChatVisibility}
        visible={showChat && !showSpin}
        width="30%"
        key="left"
        footer={
          <div className="chat-footer-container">
            <TextArea rows={4} value={msg} onChange={onMsgChange} />
            <div className="chat-send-btn">
              <SendIcon />
            </div>
          </div>
        }
      >
        <div>
          {React.Children.toArray(
            messages.map(({ ...msgData }) => <Message {...msgData} />)
          )}
        </div>
      </Drawer>
      {!showChat && (
        <Tooltip title="Chat">
          <ChatIcon />
        </Tooltip>
      )}
    </div>
  );
};

export default Video;
