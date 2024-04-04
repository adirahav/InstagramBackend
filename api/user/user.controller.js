import { loggerService } from '../../services/logger.service.js'
import { authService } from '../auth/auth.service.js'
import { postService } from '../post/post.service.js'
import { userService } from './user.service.js'

const TAG = "user.controller"

// list
export async function getUsers(req, res) {
    try {
        const users = await userService.query()
        res.send(users)
    } catch(err) {
        loggerService.error(TAG, `Couldn't get users`, err)
        res.status(400).send(`Couldn't get users`)
    }
}

// read
export async function getUser(req, res) {
    const { userId } = req.params
    
    try {
        const user = await userService.getById(userId)
        res.send(user)
    } catch(err) {
        loggerService.error(TAG, `Couldn't get user`, err)
        res.status(400).send(`Couldn't get user`)
    }  
}

// create
export async function addUser(req, res) {
    const { fullname, username, password, profilePicture } = req.body 
    
    const userToAdd = { fullname, username, password, profilePicture }

    try {
        const savedUser = await userService.add(userToAdd)
        res.send(savedUser)
    } catch(err) {
        loggerService.error(TAG, 'addUser()', `Couldn't add user`, err)
        res.status(400).send(`Couldn't add user`)
    }  
}

// update
export async function updateUser(req, res) {
    const { _id, contact, fullname, username, password, profilePicture } = req.body 
    
    const userToUpdate = { _id, contact, fullname, username, password, profilePicture }

    try {
        const savedUser = await userService.update(userToUpdate)

        const loginToken = authService.getLoginToken(savedUser)
        res.cookie('loginToken', loginToken, { sameSite: 'None', secure: true })

        res.send(savedUser)
    } catch(err) {
        loggerService.error(TAG, 'updateUser()', `Couldn't update user`, err)
        res.status(400).send(`Couldn't update user`)
    }  
}

// delete
export async function removeUser(req, res) {
    const { userId } = req.params

    try {
        await userService.remove(userId)
        res.send(`user ${userId} removed`)
    } catch(err) {
        loggerService.error(TAG, `Couldn't remove user`, err)
        res.status(400).send(`Couldn't remove user`)
    }   
}

// follow user
export async function followUser(req, res) {
    const { userId } = req.params
    
    try {
        const user = await userService.getById(userId)
        const miniUser = userService.getMiniUser(user)

        const updatedUser = await userService.followUser(req.loggedinUser._id, miniUser)
        
        //const userInToken = userService.getTokenUser(updatedUser)
        

        
        //if (!updateLoggedinUser.following) {
        //    updateLoggedinUser.following = [miniUser]
        //} else {
        //    const isAlreadyFollowing = updateLoggedinUser.following.some(user => String(user._id) === String(miniUser._id))
           
        //    if (!isAlreadyFollowing) {
        //        updateLoggedinUser.following.push(miniUser)
        //    }
        //}
       
        //const loginToken = authService.getLoginToken(updateLoggedinUser)
        //res.cookie('loginToken', loginToken, { sameSite: 'None', secure: true })

        res.send(`following ${userId}`)
    } catch(err) {
        loggerService.error(TAG, 'followUser()', `Couldn't follow user ${userId}`, err)
        res.status(400).send(`Couldn't follow user`)
    } 
}

// unfollowUser
export async function unfollowUser(req, res) {
    const { userId } = req.params

    try {
        const user = await userService.getById(userId)
        const miniUser = userService.getMiniUser(user)

        const updatedUser = await userService.unfollowUser(req.loggedinUser._id, miniUser)

        //var updateLoggedinUser = req.loggedinUser
        //updateLoggedinUser.following = updateLoggedinUser.following.filter(user => String(user._id) !== String(userId))

        //const loginToken = authService.getLoginToken(updateLoggedinUser)
        //res.cookie('loginToken', loginToken, { sameSite: 'None', secure: true })

        res.send(`unfollowing ${userId}`)
    } catch(err) {
        loggerService.error(TAG, 'unfollowUser()', `Couldn't unfollow user ${userId}`, err)
        res.status(400).send(`Couldn't unfollow user`)
    } 
}

export async function getNotifications(req, res) {
    try {
        const user = await userService.getNotifications(req.loggedinUser)
        res.send(user)
    } catch(err) {
        loggerService.error(TAG, 'getNotifications()', `Couldn't get user notifications`, err)
        res.status(400).send(`Couldn't get user notifications`)
    }  
}
    
export async function getSuggestions(req, res) {
    try {
        const user = await userService.getSuggestions(req.loggedinUser)
        res.send(user)
    } catch(err) {
        loggerService.error(TAG, 'getSuggestions()', `Couldn't get user suggestions`, err)
        res.status(400).send(`Couldn't get user suggestions`)
    }  
}

export async function getFollowings(req, res) {
    try {
        const user = await userService.getFollowings(req.loggedinUser)
        res.send(user)
    } catch(err) {
        loggerService.error(TAG, 'getFollowings()', `Couldn't get user followings`, err)
        res.status(400).send(`Couldn't get user followings`)
    }  
}

export async function getProfile(req, res) {
    const { username, type } = req.params
    
    try {
        const user = await userService.getProfile(req.loggedinUser, username, type)
        res.send(user)
    } catch(err) {
        loggerService.error(TAG, 'getProfile()', `Couldn't get user profile`, err)
        res.status(400).send(`Couldn't get user profile`)
    }  
}
