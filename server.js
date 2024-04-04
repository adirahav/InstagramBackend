import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import http from 'http'
import path from 'path'
import { loggerService } from './services/logger.service.js'
import { authRoutes } from './api/auth/auth.routes.js'
import { userRoutes } from './api/user/user.routes.js'
import { postRoutes } from './api/post/post.routes.js'
import { openaiRoutes } from './api/openai/openai.routes.js'
import { conversationRoutes } from './api/conversation/conversation.routes.js'
import { setupSocketAPI } from './services/socket.service.js'
import dotenv from 'dotenv'

const TAG = "server"
const app = express()
  
// ======================
// configurations
// ======================
app.use(express.json())
app.use(cookieParser())

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve('public')))
} else {
    const corsOptions = {
        origin: ['http://127.0.0.1:5173', 'http://localhost:5173'],
        credentials: true
    }
    app.use(cors(corsOptions))
}

// ======================
// end points
// ======================
app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/post', postRoutes)
app.use('/api/openai', openaiRoutes)
app.use('/api/conversation', conversationRoutes)


// ======================
// sockets
// ======================
const server = http.createServer(app)
setupSocketAPI(server)

// ======================
// frontend end point
// ======================
app.get('/**', (req, res) => {
    res.sendFile(path.resolve('public/index.html'))
})

// ======================
// run server
// ======================
dotenv.config()
const PORT = process.env.PORT || 3031

app.listen(PORT, () => {
    loggerService.info(TAG, 'listen()', `Up and running on port ${PORT}`)
})

