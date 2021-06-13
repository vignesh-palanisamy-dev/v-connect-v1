const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});
var passwordGenerator = require("generate-otp");

const socketObj = {};
const connectionObj = {};

// Tell Express to serve up the public folder and everything inside of it
// This done for heroku deployment
const publicPath = path.join(__dirname, "..", "build");
app.use(express.static(publicPath));

// For every get response it redirect to index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// Here we can use process.env but process.env is not woking while deploying in aws server.
const env = require("dotenv").config({ path: require("find-config")("env") });

// Default asign of port if it is unavailable from env.
// But in heroku it need process.env.PORT  (they add port in .env dynamically)
const port = process.env.PORT || (env.parsed && env.parsed.PORT) || 5000;

// Allow all origin to access this server resource.
// In Production :  Need to allow particular origin.
app.use(cors());

// parse data based on content-type (json/byte)
app.use(express.json());

io.on("connection", (socket) => {
  const currentUserId = socket.handshake.query["userId"];
  const meetId = socket.handshake.query["meetId"];
  let generatedMeetId = null;
  console.log(
    new Date().toISOString() + ": Socket Connected ",
    currentUserId,
    meetId
  );
  socketObj[currentUserId] = socket;

  console.log(connectionObj, meetId);

  if (!meetId) {
    generatedMeetId = passwordGenerator.generate(4);
    socket.emit("meetId", generatedMeetId);
    console.log(
      new Date().toISOString() + ": Generated MeetId ",
      currentUserId,
      generatedMeetId
    );
    connectionObj[generatedMeetId] = { [currentUserId]: true };
  } else if (
    connectionObj[meetId] &&
    Object.keys(connectionObj[meetId]).length === 1
  ) {
    const initUserId = Object.keys(connectionObj[meetId])[0];
    const initUserSocket = socketObj[initUserId];
    connectionObj[meetId] = { ...connectionObj[meetId], [currentUserId]: true };
    setTimeout(
      (initUserId) => {
        socket.emit("receiver", initUserId);
      },
      2000,
      initUserId
    );
    if (initUserSocket) {
      initUserSocket.emit("receiver", currentUserId);
    }
  } else {
    socket.emit("invalidMeet");
  }

  socket.on("offer", (receiverId, localDescription) => {
    if (socketObj[receiverId]) {
      const otherSocket = socketObj[receiverId];
      otherSocket.emit("offer", currentUserId, localDescription);
    }
  });

  socket.on("answer", (presenterId, localDescription) => {
    if (socketObj[presenterId]) {
      const otherSocket = socketObj[presenterId];
      otherSocket.emit("answer", currentUserId, localDescription);
    }
  });

  socket.on("candidate", (id, candidate) => {
    if (socketObj[id]) {
      const otherSocket = socketObj[id];
      otherSocket.emit("candidate", currentUserId, candidate);
    }
  });

  socket.on("disconnect", () => {
    const cleanup = (meetId) => {
      if (
        connectionObj[meetId] &&
        Object.keys(connectionObj[meetId]).length > 0
      ) {
        Object.keys(connectionObj[meetId]).forEach((userId) => {
          if (userId !== currentUserId && socketObj[userId]) {
            socketObj[userId].emit("meetEndByPartner");
          }
          delete socketObj[userId];
        });
        delete connectionObj[meetId];
      }
    };
    cleanup(meetId);
    cleanup(generatedMeetId);

    delete socketObj[currentUserId];
    console.log(
      new Date().toISOString() + ": Socket Disconnected ",
      currentUserId
    );
  });
});

server.listen(port, () => {
  console.log(new Date().toISOString() + ": Server At PORT " + port);
});
