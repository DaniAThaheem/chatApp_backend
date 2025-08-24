import dotenv from "dotenv"

dotenv.config(
    {path: ".env"}
)
import express from "express"
import http from "http"
import {Server} from "socket.io"
import cors from "cors"
import cookieParser from "cookie-parser"


const app = express()
const httpServer = http.createServer(app)
const io = new Server(httpServer, {
    pingTimeout:60000,
    cors:{
        origin:process.env.CORS_ORIGIN,
        credentials:true
    }
})

app.set("io", io)

app.use(cors(
    {
        origin:process.env.CORS_ORIGIN,
        credentials:true
    }
))
app.use(express.json(
    {
        limit: "16kb"
    }
))

app.use(express.urlencoded(
    {
        limit: "16kb",
        extended: true
    }
))

app.use(express.static("public"))

app.use(cookieParser())



import ChatRouter from "./routes/chat.routes.js"
import ChatMessageRouter from "./routes/message.routes.js"
import UserRouter from "./routes/user.routes.js"



app.use("/api/v1/chats", ChatRouter)
app.use("/api/v1/messages", ChatMessageRouter)
app.use("/api/v1/users", UserRouter)




export {httpServer}
