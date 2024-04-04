
import { loggerService } from "../../services/logger.service.js"
import { conversationService } from "./conversation.service.js"

const TAG = "conversation.middleware"

export async function requireMember(req, res, next) {
    const conversationId = req.params?.conversationId
    const { from, to } = req.body

    const loggedinUser = req.loggedinUser //authService.validateToken(req.cookies.loginToken)
    
    if (conversationId) {
        const conversation = await conversationService.getById(conversationId)

        if (conversation.member1.username !== loggedinUser.username && conversation.member2.username !== loggedinUser.username) {
            loggerService.warn(TAG, `${loggedinUser.username} try to perform not your conversation action`)
            return res.status(403).send(`Not authorized`)
        }

        req.conversation = conversation
    }
    else {
        if (from !== loggedinUser.username && to !== loggedinUser.username) {
            loggerService.warn(TAG, `${loggedinUser.username} try to perform not your conversation action`)
            return res.status(403).send(`Not authorized`)
        }
    }
    
    req.loggedinUser = loggedinUser

    next()
}
