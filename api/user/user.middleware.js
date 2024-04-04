
import { loggerService } from "../../services/logger.service.js"
import { authService } from "../auth/auth.service.js"
import { userService } from "./user.service.js"

const TAG = "user.middleware"

export function requireYourself(req, res, next) {
    const userId = req.params.userId || req.body._id
    const loggedinUser = req.loggedinUser //|| authService.validateToken(req.cookies.loginToken)
    
    if (loggedinUser._id !== userId && !loggedinUser.isAdmin) {
        loggerService.warn(TAG, "requireYourself()", `${loggedinUser.username} try to perform not your user action`)
        return res.status(403).send(`Not authorized`)
    }
    
    req.loggedinUser = loggedinUser

    next()
}

export function requireNotYourself(req, res, next) {
    const userId = req.params.userId || req.body._id
    const loggedinUser = req.loggedinUser //|| authService.validateToken(req.cookies.loginToken)
    
    if (loggedinUser._id === userId) {
        loggerService.warn(TAG, "requireNotYourself()", `${loggedinUser.username} try to perform not allow action on himself`)
        return res.status(403).send(`Not authorized`)
    }
    
    req.loggedinUser = loggedinUser

    next()
}

export async function updateLastSeen(req, res, next) {
    const loggedinUser = authService.validateToken(req.cookies.loginToken)//req.loggedinUser
    
    if (!loggedinUser) {
        return res.status(403).send(`Not authenticated`)
    }

    const lastSeen = new Date()
    await userService.updateLastSeen(loggedinUser._id, lastSeen)

    const userToSaveInToken = userService.getTokenUser(loggedinUser)               
    userToSaveInToken.lastSeen  = lastSeen
    const loginToken = authService.getLoginToken(userToSaveInToken)
    res.cookie('loginToken', loginToken, { sameSite: 'None', secure: true })

    next()
}