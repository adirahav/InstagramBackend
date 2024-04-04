import { conversationService } from '../api/conversation/conversation.service.js'
import { loggerService } from './logger.service.js'
import { Server } from 'socket.io'
import { utilService } from './util.service.js'
import { userService } from '../api/user/user.service.js'

var TAG = "socket.service"
var gIo = null

// auth
const SOCKET_AUTH_EVENT_LOGIN = 'set-user-socket'
const SOCKET_AUTH_EVENT_LOGOUT = 'unset-user-socket'

// chat
const SOCKET_CHAT_NEW_PRIVATE_MESSAGE = 'chat-new-private-message'
const SOCKET_CHAT_SET_ONLINE = 'chat-set-online'

// notification
export const SOCKET_EMIT_NOTIFICATION_POST_LIKED = 'notification-post-liked'
export const SOCKET_EMIT_NOTIFICATION_POST_COMMENT_ADDED = 'notification-post-comment-added'
export const SOCKET_EMIT_NOTIFICATION_COMMENT_LIKED = 'notification-comment-liked'
export const SOCKET_EMIT_NOTIFICATION_POST_ADDED = 'notification-post-added'

export const socketService = {
    setupSocketAPI,     // set up the sockets service and define the API
    emitTo,             // emit to everyone / everyone in a specific room (label)
    emitToUser,         // emit to a specific user (if currently active in system)
    broadcast,          // Send to all sockets BUT not the current socket - if found (otherwise broadcast to a room / to all)
    getAllSockets,
}

export function setupSocketAPI(server) {
    
    gIo = new Server(server, {
        cors: {
            origin: '*',
        }
    })
    
    gIo.on('connection', socket => {
        loggerService.info(TAG, 'io.on.connection', `New connected socket [id: ${socket.id}`)
        
        socket.on('disconnect', socket => {
            loggerService.info(TAG, 'socket.on.disconnect', `Socket disconnected [userId: ${socket.userId}]`)
        })
    
        socket.on("connect_error", (err) => {
            console.error(`connect_error due to ${err.message}`)
          })

        socket.on(SOCKET_CHAT_NEW_PRIVATE_MESSAGE, async message => {
            loggerService.info(TAG, 'socket.on.SOCKET_CHAT_NEW_PRIVATE_MESSAGE', `New chat message from socket [id: ${socket.id}], emitting to user ${JSON.stringify(message)}`)
                
            const toSocket = await _getUserSocket(message.to)
            
            if (toSocket) {
                toSocket.emit(SOCKET_CHAT_NEW_PRIVATE_MESSAGE, message)
            }
            
            try {
                const messageToAdd = {
                    ...message,
                    id: utilService.makeId()
                }
                await conversationService.addMessage(message.conversationId, messageToAdd)
            }
            catch (err) {
                loggerService.error(TAG, 'socket.on.SOCKET_CHAT_NEW_PRIVATE_MESSAGE', `cannot add message to conversation ${message.conversationId}`, err)
                throw `cannot add message to conversation ${message.conversationId}`
            }
        })
        
        socket.on(SOCKET_AUTH_EVENT_LOGIN, user => {
            loggerService.info(TAG, 'socket.on.SOCKET_AUTH_EVENT_LOGIN', `Setting socket.userId = ${user._id} ; socket.username = ${user.username} for socket [id: ${socket.id}]`)
            socket["userId"] = user._id
            socket["username"] = user.username
            socket["fullname"] = user.fullname
            
            // SEND 'ONLINE' NOTIFICATION TO ALL MEMEBERS BUT THE USER
            socket.broadcast.emit(SOCKET_CHAT_SET_ONLINE, { notification: true, username: socket.username, isOnline: true }) 

            checkIfHasNewNotification(user._id)
            
        })

        socket.on(SOCKET_AUTH_EVENT_LOGOUT, () => {
            loggerService.info(TAG, 'socket.on.SOCKET_AUTH_EVENT_LOGOUT', `Removing socket.userId = ${user._id} ; socket.username = ${user.username} for socket [id: ${socket.id}]`)
            socket.broadcast.emit(SOCKET_CHAT_SET_ONLINE, { notification: true, username: socket.username, isOnline: false }) 
            delete socket.userId
        })

    })
}

async function checkIfHasNewNotification(userId) {
    const loggedinUser = await userService.getById(userId)
    if (loggedinUser.newNotification) {
        emitToUser({ 
            type: loggedinUser.newNotification.type, 
            data: loggedinUser.newNotification.data, 
            user: loggedinUser
        })
        await userService.updateHasNewNotification(loggedinUser._id, null)
    }
}

function emitTo({ type, data, label }) {
    if (label) gIo.to('watching:' + label.toString()).emit(type, data)
    else gIo.emit(type, data)
}

async function emitToUser({ type, data, user }) {
    
    const socket = await _getUserSocket(user.username)

    if (socket) {
        loggerService.info(TAG, 'emitToUser()', `Emiting event: ${type} to user: ${user.username} socket [id: ${socket.id}]`)
        socket.emit(type, data)
    } else {
        loggerService.info(TAG, 'emitToUser()', `No active socket for user: ${user.username}`)
        await userService.updateHasNewNotification(user._id, { type, data })
    }
}

// If possible, send to all sockets BUT not the current socket 
async function broadcast({ type, data, userId }) {
    userId = userId.toString()
    loggerService.info(TAG, 'broadcast()', `Broadcasting event: ${type}`)
    const excludedSocket = await _getUserSocket(userId)

    if (excludedSocket) {
        loggerService.info(TAG, 'broadcast()', `Broadcast to all excluding user: ${userId}`)
        excludedSocket.broadcast.emit(type, data)
    } else {
        loggerService.info(TAG, 'broadcast()', `Emit to all`)
        gIo.emit(type, data)
    }
}

async function _getUserSocket(username) {
    const sockets = await getAllSockets()
   
    const socket = sockets.find(s => {
        return String(s.username) === String(username)
    })
    
    return socket
}
async function getAllSockets() {
    // return all Socket instances
    const sockets = await gIo.fetchSockets()
    return sockets
}

async function _printSockets() {
    const sockets = await getAllSockets()
    loggerService.info(TAG, `Sockets: (count: ${sockets.length}):`)
    sockets.forEach(_printSocket)
}

function _printSocket(socket) {
    loggerService.info(TAG, `Socket - socketId: ${socket.id} ; userId: ${socket.userId} ; username: ${socket.username}`)
}