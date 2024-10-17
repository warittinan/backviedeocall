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
    socket.emit("me", socket.id);

    socket.on("username", (name, id) => {
        users.push({ id, name, socketId: socket.id, room: null }); // เพิ่ม room เป็น null
        io.emit("allUsers", users);
        console.log('Users:', users);
    });

    socket.on("disconnect", () => {
        const user = users.find(user => user.socketId === socket.id);
        if (user) {
            users = users.filter(u => u.socketId !== socket.id);
            socket.to(user.room).emit("userDisconnected", { id: socket.id, name: user.name });
            console.log('User disconnected:', user.name);
        }
    });

    socket.on("callUser", (data) => {
        const userToCall = users.find(user => user.name === data.userToCall);
        const roomName = `room-${data.from}-${userToCall.socketId}`;
        socket.join(roomName);
        console.log('====================================');
        console.log('Room: call', roomName);
        console.log('====================================');
        if (userToCall) {
            userToCall.room = roomName; // บันทึกห้องให้กับผู้ใช้ที่ถูกโทร
            io.to(userToCall.socketId).emit("callUser", { signal: data.signalData, from: data.from, name: data.name });
        }
        console.log('====================================');
        console.log('User:call', users);
        console.log('====================================');
    });

    socket.on("answerCall", (data) => {
        const roomName = `room-${data.to}-${data.from}`;
        console.log('====================================');
        console.log('Room: anw', roomName);
        console.log('====================================');
        socket.join(roomName);
        
        const user = users.find(user => user.socketId === data.to);
        if (user) {
            user.room = roomName; // บันทึกห้องให้กับผู้ใช้ที่รับสาย
        }
        console.log('====================================');
        console.log('User:anw', users);
        console.log('====================================');
        
        io.to(data.to).emit("callAccepted", { signal: data.signal, name: data.name });
    });

    socket.on("callEnded", () => {
        const rooms = Array.from(socket.rooms);
        if (rooms.length > 1) {
            const roomName = rooms[1];
            socket.to(roomName).emit("callEnded");
            socket.leave(roomName);
        }
    });
});

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
