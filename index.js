const express = require("express")
const http = require("http")
const app = express()
const server = http.createServer(app)
const io = require("socket.io")(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
})
const PORT = process.env.PORT || 5000;
let users = []
io.on("connection", (socket) => {
    socket.emit("me", socket.id)
    socket.on("username", (name,id) => {
        users.push({ id: id, name: name })
        io.emit("allUsers", users)
        console.log('====================================');
        console.log(users);
        console.log('====================================');
    })
    socket.on("disconnect", () => {
        socket.broadcast.emit("callEnded")
    })

    socket.on("callUser", (data) => {
        io.to(users.filter(user => user.name === data.userToCall).map(user => user.id)).emit("callUser", { signal: data.signalData, from: data.from, name: data.name })
        // io.to(data.userToCall).emit("callUser", { signal: data.signalData, from: data.from, name: data.name })
        
    })

    socket.on("answerCall", (data) => {
        io.to(data.to).emit("callAccepted", {signal: data.signal, name: data.name})
    })

    socket.on("callEnded", () => {
        socket.broadcast.emit("callEnded")
    })
})

server.listen(PORT, () => console.log(`Server is running on port ${PORT}`))
