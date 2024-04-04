import { loggerService } from "../../services/logger.service.js";
import Cryptr from "cryptr"
import bcrypt from "bcrypt"
import { userService } from "../user/user.service.js";

const TAG = "auth.service"
const cryptr = new Cryptr(process.env.SECRET1 || "seceret-instagram-proj-1234") 

export const authService = {
    getLoginToken,
    validateToken,
    login,
    signup,
    hashPassword
}

function getLoginToken(user) {
    const str = JSON.stringify(user)
    const encryptedStr = cryptr.encrypt(str)
    return encryptedStr
}

function validateToken(token) {
    try {
        const json = cryptr.decrypt(token)
        const loggedinUser = JSON.parse(json)
        return loggedinUser

    } catch (err) {
        loggerService.error(TAG, 'validateToken()', `Invalid login token`, err)
    }
    return null
}

async function login(identifier, password) {
    try {
        const user = await userService.getByAccountIdentifier(identifier)
        if (!user) {
            throw {code:400, message: 'Unknown user'}
        }
        
        const match = await bcrypt.compare(password, user.password)
        if (!match) {
            throw {code:400, message: 'Invalid username or password'}
        }

        delete user.password
        
        return user
        
    } catch(err) {
        loggerService.error(TAG, 'login()', `Had problems login user ${identifier}`, err)
        throw err
    }
}

async function signup(user) {
    try {
        loggerService.debug(TAG, 'signup()', `signup with contact: ${user.contact}, username: ${user.username}, fullname: ${user.fullname}`)
    
        if (!user.contact || !user.username || !user.password || !user.fullname) {
            throw {code:400, message: 'Missing required signup information'}
        }

        const isUserContactExist = await userService.getByContact(user.contact.replace(/\D/g, ''))
        if (isUserContactExist) {
            throw {code:400, message: 'Contact already taken'}
        }

        const isUsernameExist = await userService.getByUsername(user.username)
        if (isUsernameExist) {
            throw {code:400, message: 'Username already taken'}
        }
        
        return userService.add(user)

    } catch(err) {
        loggerService.error(TAG, 'signup()', `Had problems signup ${username}`, err)
        loggerService.debug(TAG, 'signup()', `err: ${JSON.stringify(err)}`)
        throw err
    }
}

async function hashPassword(password) {
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)
    return hashedPassword
}
