
import { loggerService } from "../../services/logger.service.js"
import { postService } from "./post.service.js"

const TAG = "post.middleware"

export async function requireOwner(req, res, next) {
    const postId = req.params?.postId || req.body?._id 
    
    const loggedinUser = req.loggedinUser //authService.validateToken(req.cookies.loginToken)
    
    const post = await postService.getById(postId)
    
    if (loggedinUser._id !== post.createdBy._id && !loggedinUser.isAdmin) {
        loggerService.warn(TAG, `${loggedinUser.username} try to perform not your post action`)
        return res.status(403).send(`Not authorized`)
    }
    
    req.post = post
    req.loggedinUser = loggedinUser

    next()
}

export async function requireCommentOwner(req, res, next) {
    const { postId, commentId } = req.params
    const loggedinUser = req.loggedinUser
    
    const post = await postService.getById(postId)
    const comment = post.comments.find(comment => comment.id === commentId)
    
    if (loggedinUser._id !== comment.createdBy._id && !loggedinUser.isAdmin) {
        loggerService.warn(TAG, `${loggedinUser.username} try to perform not your comment action`)
        return res.status(403).send(`Not authorized`)
    }
    
    req.comment = comment
    req.loggedinUser = loggedinUser

    next()
}