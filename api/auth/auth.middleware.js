import { authService } from "./auth.service.js"
import { loggerService } from "../../services/logger.service.js"
import { dbService } from "../../services/db.service.js"
import { ObjectId } from "mongodb"

const TAG = "auth.middleware"

export async function requireAuth(req, res, next) {
        
    const loggedinUser = authService.validateToken(req.cookies.loginToken)
    
    if (!loggedinUser) {
        return res.status(401).send(`Not authenticated`)
    }
    
    const collectionName = 'user'
    const collection = await dbService.getCollection(collectionName)
    const loggedinUserFromDB = await collection.findOne({'_id': new ObjectId(loggedinUser._id)})
    
    req.loggedinUser = loggedinUserFromDB

    next()
}

export function requireAdmin(req, res, next) {
    const loggedinUser = req.loggedinUser //|| authService.validateToken(req.cookies.loginToken)
    
    if (!loggedinUser.isAdmin) {
        loggerService.warn(TAG, `${loggedinUser.username} try to perform an admin action`)
        return res.status(403).send(`Not authorized`)
    }
    
    req.loggedinUser = loggedinUser

    next()
}