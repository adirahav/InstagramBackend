import { loggerService } from '../../services/logger.service.js'
import { userService } from '../user/user.service.js'
import { authService } from './auth.service.js'

const TAG = "auth.controller"

export async function signup(req, res) {
    try {
        const credentials = req.body
        //loggerService.debug(TAG, 'signup()', `credentials: ${JSON.stringify(credentials)}`)  //never log passwords

        const account = await authService.signup(credentials)
        //loggerService.debug(TAG, 'signup()', `account: ${JSON.stringify(account)}`)
        
        await login({body: {identifier: credentials.username, password: credentials.password}}, res)
    } catch(err) {
        loggerService.error(TAG, 'signup()', `Failed to signup`, err)
        res.status(400).send(`Failed to signup: ${err.message}`)
    }
}

export async function login(req, res) {
    const { identifier, password } = req.body
    
    try {    
        const user = await authService.login(identifier, password)  // identifier: username / email / phone
        const userToSaveInToken = userService.getTokenUser(user) 
        
        loggerService.info(TAG, 'login()', `User login: `, userToSaveInToken)  

        const loginToken = authService.getLoginToken(userToSaveInToken)
        res.cookie('loginToken', loginToken, { sameSite: 'None', secure: true })
        res.json(user)
    } catch(err) {
        loggerService.error(TAG, 'login()', `Failed to login`, err)
        res.status(err.code).send(`Failed to login: ${err.message}`)
    } 
}


export function logout(req, res) {
    try {
        res.clearCookie('loginToken')
        res.send({ msg: 'Logged out successfully' })
    } catch (err) {
        loggerService.error(TAG, 'logout()', `Failed to logout`, err)
        res.status(err.code).send(`Failed to logout: ${err.message}`)
    }
}