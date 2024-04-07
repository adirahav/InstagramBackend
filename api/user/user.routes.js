import express from 'express'
import { getUsers, getUser, addUser, updateUser, removeUser, followUser, unfollowUser, 
    getNotifications, getSuggestions, getFollowings, getProfile, saveUnreadMessage, unsaveReadMessage } from './user.controller.js'
import { requireAdmin, requireAuth } from '../auth/auth.middleware.js'
import { requireYourself, requireNotYourself, updateLastSeen } from './user.middleware.js'

const router = express.Router()

router.get('/', /*requireAuth,*/ getUsers)                                                      // list
router.post('/', requireAuth, requireAdmin, addUser)                                            // create
router.put('/', requireAuth, requireYourself, updateLastSeen, updateUser)                       // update
router.get('/notifications', requireAuth, updateLastSeen, getNotifications) 
router.get('/suggestions', requireAuth, updateLastSeen, getSuggestions) 
router.get('/followings', requireAuth, updateLastSeen, getFollowings) 
router.get('/:userId', requireAuth, updateLastSeen, getUser)                                    // read
router.put('/:userId/follow', requireAuth, requireNotYourself, updateLastSeen, followUser)      
router.put('/:userId/unfollow', requireAuth, requireNotYourself, updateLastSeen, unfollowUser)  
router.delete('/:userId', requireAuth, requireAdmin, removeUser)                                // delete
router.get('/:username/profile', requireAuth, updateLastSeen, getProfile) 
router.get('/:username/profile/:type', requireAuth, updateLastSeen, getProfile) 
router.put('/saveUnreadMessage', requireAuth, saveUnreadMessage) 
router.put('/unsaveReadMessage', requireAuth, unsaveReadMessage) 

export const userRoutes = router