const { log } = require("console");
const express = require("express");
const cors = require("cors");
const http = require("http");
const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: "*", // Allow all origins or specify specific ones
    methods: ["GET", "POST"]
}));
const io = require("socket.io")(server, {
    cors: {
        // origin: ["http://localhost:3000","http://capstone24.sit.kmutt.ac.th/ssa2/"],
        origin: "*",
        methods: ["GET", "POST"]
    },
    path: "/ssa2-meeting/",
    // forceNew: true

});
const PORT = process.env.PORT || 5000;
let users = [];

app.get("/meeting", (req, res) => {
    res.send("server is running");
});
io.on("connection", (socket) => {
    const socketId = socket.id;
    socket.emit("id", socket.id);
    socket.on("username", (name, id) => {
        users.push({ socketId, name, socketId: socket.id, room: null });
        io.emit("allUsers", users);
        console.log('Users:', users);
    });

    socket.on("disconnect", () => {
        const user = users.filter(user => user.socketId === socket.id).pop();
        if (user) {
            socket.to(user.room).emit("userDisconnected", { id: socket.id, name: user.name });
            console.log('User disconnected:', user.name);
            users = users.filter(user => user.socketId !== socket.id);
            console.log('Users:', users);
        }

    });

    socket.on("callUser", (data) => {
        const userToCall = users.filter(user => user.name === data.userToCall).pop();
        const roomName = `room-${data.from}-${userToCall?.socketId}`;
        socket.join(roomName);
        if (userToCall) {
            userToCall.room = roomName;
            io.to(userToCall.socketId).emit("callUser", { signal: data.signalData, from: data.from, name: data.name ,dataappointment:data.dataappointment});
        }else{
            io.to(socketId).emit("callUserError", { error: "The user is not currently logged in." });
        }
        
    });

    socket.on("answerCall", (data) => {
        const roomName = `room-${data.to}-${data.from}`;
        socket.join(roomName);
        const user = users.find(user => user.socketId === data.to);
        if (user) {
            user.room = roomName; 
        }
        io.to(data.to).emit("callAccepted", { signal: data.signal, name: data.name });
    });

    socket.on("callEnded", (id) => {
        const userroom = users.filter(user => user.socketId === id).pop()?.room;
        users.filter(user => user.room === userroom).map(user => user.room = null);
        const rooms = Array.from(socket.rooms);
        const room = rooms.find(room => room === userroom);
        socket.to(room).emit("callUserEnded");
        socket.leave(room);
    });

    // New event for toggling audio
    socket.on("togglevideo", (data) => {
        const user = users.filter(user => user.socketId === data.socketId).pop()
        const username = user?.name;
        const status = data.status;
        // console.log("room",user.room);
        if (user && user.room) {
            socket.to(user.room).emit("videoStatus", { username,status  });
        }
    });
    socket.on("toggleaudio", (data) => {
        const user = users.filter(user => user.socketId === data.socketId).pop()
        const username = user?.name;
        const status = data.status;

        // console.log("room",user.room);
        if (user && user.room) {
            socket.to(user.room).emit("audioStatus", { username,status  });
        }
    });
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
