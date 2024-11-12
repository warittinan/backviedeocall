const { log } = require("console");
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;
let users = [];

io.on("connection", (socket) => {
    const socketId = socket.id;
    socket.emit("me", socket.id);

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
            console.log('Users:', users);
        }
    });

    socket.on("callUser", (data) => {
        const userToCall = users.filter(user => user.name === data.userToCall).pop();
        const roomName = `room-${data.from}-${userToCall?.socketId}`;
        socket.join(roomName);
        if (userToCall) {
            userToCall.room = roomName;
            io.to(userToCall.socketId).emit("callUser", { signal: data.signalData, from: data.from, name: data.name });
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
