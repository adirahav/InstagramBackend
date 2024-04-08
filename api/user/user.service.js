import { loggerService } from "../../services/logger.service.js"
import { dbService } from "../../services/db.service.js"
import mongoDB from 'mongodb'
import { authService } from "../auth/auth.service.js"
import { postService } from "../post/post.service.js"
import { conversationService } from "../conversation/conversation.service.js"
import { socketService } from "../../services/socket.service.js"

const TAG = "user.service"
const MISSING_PROFILE_PICTURE_URL = "https://res.cloudinary.com/dn4zdrszh/image/upload/v1708020687/missing-avatar_sowwel.jpg"
let { ObjectId } = mongoDB
const collectionName = 'user'
const postCollectionName = 'post'

export const userService = {
    query,
    getById,
    getByContact,
    getByUsername,
    getByAccountIdentifier,
    remove,
    add,
    update,
    updateLastSeen,
    savePost,
    unsavePost,
    followUser,
    unfollowUser,
    getNotifications, 
    getSuggestions,
    getFollowings,
    getProfile,
    saveUnreadMessage,
    unsaveReadMessage,
    saveUnreadNotification,
    unsaveReadNotification,
    getMiniUser,
    getTokenUser
}

async function query() {
    
    try {
        const collection = await dbService.getCollection(collectionName)
        var users = await collection.find().toArray()
        users = users.map(user => {
            delete user.password
            user.createdAt = new ObjectId(user._id).getTimestamp()
            return user
        })
        return users
    } catch (err) {
        loggerService.error(TAG, 'query()', 'cannot find users', err)
        throw err
    }
}

async function getById(userId) {
    try {
        const collection = await dbService.getCollection(collectionName)
        const user = await collection.findOne({ _id: new ObjectId(userId) })
        delete user.password
        return user
    } catch (err) {
        loggerService.error(TAG, 'getById()', `Had problems getting user ${userId}`, err)
        throw `Had problems getting user ${userId}`
    }
}

async function getByContact(contact) {
    // ATTENTION: this function return password - the caller should remove it.
    try {
        const collection = await dbService.getCollection(collectionName)
        const user = await collection.findOne({ 'contact': contact })
        return user
    } catch (err) {
        loggerService.error(TAG, 'getByContact()', `Had problems getting user ${contact}`, err)
        throw `Had problems getting user ${contact}`
    }
}

async function getByUsername(username) {
    // ATTENTION: this function return password - the caller should remove it.
    try {
        const collection = await dbService.getCollection(collectionName)
        const user = await collection.findOne({ 'username': username })
        return user
    } catch (err) {
        loggerService.error(TAG, 'getByUsername()', `Had problems getting user ${username}`, err)
        throw `Had problems getting user ${username}`
    }
}

async function getByAccountIdentifier (identifier) {
    // ATTENTION: this function return password - the caller should remove it.
    try {
        const collection = await dbService.getCollection(collectionName)
        const user = await collection.findOne({ $or: [{ contact: identifier }, { username: identifier }] })
        return user
    } catch (err) {
        loggerService.error(TAG, 'getByAccountIdentifier()', `Had problems getting account ${identifier}`, err)
        throw `Had problems getting account ${identifier}`
    }
}

async function remove(userId) {
    try {
        const collection = await dbService.getCollection(collectionName)
        const result = await collection.deleteOne({ _id: new ObjectId(userId) })
        
        if (!result.acknowledged || result.deletedCount === 0) {
            loggerService.error(TAG, `Failed to remove user ${userId}`, result)
            throw `Failed to remove user ${userId}`
        }
    } catch (err) {
        loggerService.error(TAG, 'remove()', `Had problems removing user ${userId}`, err)
        throw `Had problems removing user ${userId}`
    }
}

async function add(user) {
    
    const userToAdd = {
        contact: user.contact,
        fullname: user.fullname,
        username: user.username,
        password: await authService.hashPassword(user.password),
        profilePicture: user.profilePicture ? user.profilePicture : MISSING_PROFILE_PICTURE_URL,
        isAdmin: false
    }
    
    try {
        const collection = await dbService.getCollection(collectionName)
        const result = await collection.insertOne(userToAdd)

        if (!result.acknowledged) {
            loggerService.error(TAG, 'add()', `Failed to insert user ${userToAdd.username}`, result)
            throw `Failed to insert user ${userToAdd.username}`
        }

        delete userToAdd.password

        return {...userToAdd, _id: result._id}
    } catch (err) {
        loggerService.error(TAG, 'add()', `Had problems add user ${user.username}`, err)
        throw `Had problems add user ${user.username}`
    }
}

async function update(user) {
    loggerService.debug(TAG, 'update()', `user ${JSON.stringify(user)}`)

    const currUser = await getById(user._id)
    const password = user.password ? await authService.hashPassword(user.password) : null
    /* userToUpdate = {
        _id: new ObjectId(user._id),
        ...(user.contact !== null && { contact: user.contact }),
        ...(user.fullname !== null && { fullname: user.fullname }),
        //...(user.username !== null && { username: user.username }),
        ...(password !== null && { password }),
        ...(user.profilePicture !== null && { profilePicture: user.profilePicture }),
        //isAdmin: false
    }*/

    const userToUpdate = {
        ...currUser,
        ...{
            _id: new ObjectId(user._id),
            ...(user.fullname !== null && { fullname: user.fullname }),
            //...(user.username !== null && { username: user.username }),
            ...(password !== null && { password }),
            ...(user.profilePicture !== null && { profilePicture: user.profilePicture }),
            //isAdmin: false
        }
    }
    
    try {
        const collection = await dbService.getCollection(collectionName)
        const result = await collection.updateOne(
                            { _id: new ObjectId(user._id) },     
                            { $set: {...currUser, ...userToUpdate} })

        //await collection.updateOne({ _id: new ObjectId(car._id) }, { $set: carToSave })
        
        loggerService.debug(TAG, 'update()', `result: ${JSON.stringify(result)}`)
        if (!result.acknowledged) {
            loggerService.error(TAG, 'update()', `Failed to update user ${user._id}`, result)
            throw `Failed to update user ${user._id}`
        }

        if (result.modifiedCount === 0) {
            loggerService.error(TAG, 'update()', `User ${user._id} not found`)
            throw `User ${user._id} not found`
        }
        
        return {...currUser, ...userToUpdate}

    } catch (err) {
        loggerService.error(TAG, 'update()', `cannot update user ${userToUpdate._id}`, err)
        throw `Had problems update user ${userToUpdate._id}`
    }
}

async function updateLastSeen(userId, lastSeen) {
    //loggerService.debug(TAG, 'updateLastSeen()', `user ${userId}`)

    try {
        const collection = await dbService.getCollection(collectionName)
        await collection.updateOne(
                            { _id: new ObjectId(userId) },     
                            { $set: { lastSeen } })
                            
        return lastSeen

    } catch (err) {
        loggerService.error(TAG, 'updateLastSeen()', `cannot update user last seen ${userId}`, err)
        //throw `Had problems update user last seen ${userId}`
    }
}

//#region == save post ================
async function savePost(post, userId) {
    try {
        const collection = await dbService.getCollection(collectionName)
        await collection.updateOne({ _id: new ObjectId(userId) }, { $addToSet: { savedPosts: post } })
        
        return { post, userId }
    } catch (err) {
        loggerService.error(TAG, 'save()', `Had problems save post ${post._id}`, err)
        throw `Had problems save post ${post._id}`
    }
}

async function unsavePost(post, userId) {
    try {
        const collection = await dbService.getCollection(collectionName)
        await collection.updateOne({ _id: new ObjectId(userId) }, { $pull: { savedPosts: post } })
        return { post, userId }
    } catch (err) {
        loggerService.error(TAG, 'unsave()', `Had problems unsave post ${post._id}`, err)
        throw `Had problems unsave post ${post._id}`
    }
}

//#endregion == save post ================

//#region == follow user ==============

async function followUser(userId, follower) {
    
    try {
        const collection = await dbService.getCollection(collectionName)
        await collection.updateOne({ _id: new ObjectId(userId) }, { $addToSet: { following: follower } })
        return { userId, follower }
    } catch (err) {
        loggerService.error(TAG, 'followUser()', `Had problems follow user ${follower._id}`, err)
        throw `Had problems follow user ${follower._id}`
    }
}

async function unfollowUser(userId, unfollower) {
    try {
        const collection = await dbService.getCollection(collectionName)
        await collection.updateOne({ _id: new ObjectId(userId) }, { $pull: { following: unfollower } })
        return { userId, unfollower }
    } catch (err) {
        loggerService.error(TAG, 'unfollowUser()', `Had problems unfollow user ${unfollower._Id}`, err)
        throw `Had problems unfollow user ${unfollower._Id}`
    }
}

//#endregion == follow user ==============

//#region == notifications ============

async function getNotifications(loggedinUser) {
    const MAX_NOTIFICATIONS = 12

    try {
        const latestLoggedinUserPost = await postService.queryLatestLikesAndComments(loggedinUser)

        const followNotifications = await _getFollowNotifications(loggedinUser)
        const newPostsNotifications = await _getNewPostsNotifications(loggedinUser)
        const newPostLikesNotifications = await _getNewPostLikesNotifications(loggedinUser, latestLoggedinUserPost)
        const newPostCommentsNotifications = await _getNewPostCommentsNotifications(loggedinUser, latestLoggedinUserPost)
        
        // combine all notification
        const notifications = [...followNotifications, ...newPostsNotifications, ...newPostLikesNotifications, ...newPostCommentsNotifications]
        const sorttedNotifications = notifications
            .sort((a, b) => new Date(b.notifyAt) - new Date(a.notifyAt))
            .slice(0, MAX_NOTIFICATIONS)

        return sorttedNotifications

    } catch (err) {
        loggerService.error(TAG, 'getNotifications()', `Had problems getting notifications for user ${loggedinUser.username}`, err)
        throw `Had problems getting notifications`
    }
}

async function _getFollowNotifications(loggedinUser) {

    try {
        const collection = await dbService.getCollection(collectionName)
        var users = await collection.find().toArray()

        if (!loggedinUser.following || loggedinUser.following.length === 0) {
            let followingSuggestions = []
            users.forEach(user => {
                followingSuggestions.push({
                        _id: user._id,
                        username: user.username,
                        profilePicture: user.profilePicture,
                        following: user.following})
                
            })

            const followingSuggestionsArray = followingSuggestions
                        .filter(user => user.following) 
                        .map(user => user.following.map(following => ({ 
                            type: 'follow', 
                            followBy: user.username, 
                            _id: following._id, 
                            username: following.username,
                            profilePicture: following.profilePicture,
                            following: false,
                            notifyAt: new ObjectId(following._id).getTimestamp() 
                        }))) 
                        .flat()

            const groupedData = Object.values(followingSuggestionsArray.reduce((acc, obj) => {
                const key = obj._id
                    if (!acc[key]) {
                        acc[key] = { ...obj, followBy: [obj.followBy] }
                    } else {
                        acc[key].followBy.push(obj.followBy)
                    }
                    return acc
            }, {}))

            const filteredGroupedData = groupedData.filter(follower => String(follower._id) !== String(loggedinUser._id))

            const notifications = [...filteredGroupedData]
            const sorttedNotifications = notifications
                .sort((a, b) => new Date(b.notifyAt) - new Date(a.notifyAt))
            
            return sorttedNotifications

        }
        
        const loggedinUserFollowingIds1 = ["65e8acd269e7ef4198ce9caa","65f760a626b84dab3018f709","65e9885d465f1e7de899e251"]
        const loggedinUserFollowingIds = users
                    .find(user => user.username === loggedinUser.username)
                    .following?.map(follow => String(follow._id))/*|| []*/
        
        let followingByFollowers = []
        users.forEach(user => {
        /* if (loggedinUserFollowingIds.length === 0) {
                followingByFollowers.push(user)
            } 
            else*/ if (loggedinUserFollowingIds.includes(String(user._id))) {
                followingByFollowers.push({
                    _id: user._id,
                    username: user.username,
                    profilePicture: user.profilePicture,
                    following: user.following})
            }
        })

        const followingByFollowersArray = followingByFollowers
                    .filter(user => user.following) 
                    .map(user => user.following.map(following => ({ 
                        type: 'follow', 
                        followBy: user.username, 
                        _id: following._id, 
                        username: following.username,
                        profilePicture: following.profilePicture,
                        following: false,
                        notifyAt: new ObjectId(following._id).getTimestamp() 
                    }))) 
                    .flat()

        const groupedFollowers = Object.values(followingByFollowersArray.reduce((acc, obj) => {
            const key = obj._id
                if (!acc[key]) {
                    acc[key] = { ...obj, followBy: [obj.followBy] }
                } else {
                    acc[key].followBy.push(obj.followBy)
                }
                return acc
        }, {}))

        const filteredGroupedFollowers = groupedFollowers.filter(follower => !loggedinUserFollowingIds.includes(String(follower._id)))

        return filteredGroupedFollowers
    } catch (err) {
        loggerService.error(TAG, '_getFollowNotifications()', `Had problems getting follow notifications for user ${loggedinUser.username}`, err)
        throw `Had problems getting follow notifications`
    }
}

async function _getNewPostsNotifications(loggedinUser) {
    try {
        const latestPosts = await postService.queryLatestPosted(loggedinUser)

        if (latestPosts.length === 0) {
            return []            
        }
    
        const uniqueUsernames = new Set()
        latestPosts.forEach(post => {
            uniqueUsernames.add(post.createdBy.username)
        })
        
        const lastPost = latestPosts[0]
    
        return [{
            type: "new_post",
            postedBy: Array.from(uniqueUsernames),
            _id: lastPost._id,
            username: lastPost.createdBy.username,
            media: lastPost.media[0],
            profilePicture: lastPost.createdBy.profilePicture,
            notifyAt: new ObjectId(lastPost._id).getTimestamp()
        }]
    } catch (err) {
        loggerService.error(TAG, '_getNewPostsNotifications()', `Had problems getting new post notifications for user ${loggedinUser.username}`, err)
        throw `Had problems getting new post notifications`
    }

    
}

async function _getNewPostLikesNotifications(loggedinUser, posts) {
    
    try {
        const groupedPostLiked = []
        for (const post of posts.likes) {
            
            const liked = post.likes.filter(like => like.username !== loggedinUser.username)
                                    .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))
            
            const postWithLikes = {
                type: "new_post_like",
                _id: post._id,
                username: liked[0].username,
                media: post.media[0],
                text: post.text.substring(0, 20) + '...',
                likes: [...new Set(liked.map(like => like.username))],
                profilePicture:  liked[0].profilePicture,
                notifyAt: liked[0].createdAt
                
            }

            groupedPostLiked.push(postWithLikes)
        }

        return groupedPostLiked
    } catch (err) {
        loggerService.error(TAG, '_getNewPostLikesNotifications()', `Had problems getting new post like notifications for user ${loggedinUser.username}`, err)
        throw `Had problems getting new post like notifications`
    }
}

async function _getNewPostCommentsNotifications(loggedinUser, posts) {
    
    try {
        const groupedPostCommented = []
        for (const post of posts.comments) {
            
            const commented = post.comments.filter(comment => comment.createdBy.username !== loggedinUser.username)
                                    .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))
            
            const postWithComments = {
                type: "new_post_comment",
                _id: post._id,
                username: commented[0].createdBy.username,
                media: post.media[0],
                text: commented[0].comment.substring(0, 20) + '...',
                comments: [...new Set(commented.map(comment => comment.createdBy.username))],
                profilePicture:  commented[0].createdBy.profilePicture,
                notifyAt: commented[0].createdAt
                
            }

            groupedPostCommented.push(postWithComments)
        }

        return groupedPostCommented
    } catch (err) {
        loggerService.error(TAG, '_getNewPostCommentsNotifications()', `Had problems getting new post comment notifications for user ${loggedinUser.username}`, err)
        throw `Had problems getting new post comment notifications`
    }
}

async function saveUnreadNotification(loggedinUser) {
    
    try {
        const collection = await dbService.getCollection(collectionName)
        
        await collection.updateOne(
            {
                username: loggedinUser.username,
            },
            {
                $set: { unreadNotification: true }
            }
        )
  
        return { unreadNotification: true }

    } catch (err) {
        loggerService.error(TAG, 'saveUnreadNotification()', `cannot update user has new notification`, err)
    }
}

async function unsaveReadNotification(loggedinUser) {
    try {
        const collection = await dbService.getCollection(collectionName)
        
        await collection.updateOne(
            {
                username: loggedinUser.username,
            },
            {
                $set: { unreadNotification: false }
            }
        )
  
        return { unreadNotification: false }

    } catch (err) {
        loggerService.error(TAG, 'unsaveReadMessage()', `cannot update user has read notification`, err)
    }
}

//#endregion == notifications ============

//#region == suggestions ==============

async function getSuggestions(loggedinUser) {
    const MAX_SUGGESTION = 5
    try {
        const collection = await dbService.getCollection(collectionName)
        var users = await collection.find().toArray()
        users = users.filter(user => {
            
            const matchNotMe = String(user._id) !== String(loggedinUser._id)
            const notAdmin = !user.isAdmin
            const notFollowing = !loggedinUser.following 
                              //|| !user.following 
                              || !loggedinUser.following.some(follow => String(follow._id) === String(user._id))

            return matchNotMe && notAdmin && notFollowing
            
        })
        
        users = users.map(user => { 
            return {
                type: user.following && user.following?.some(follow => String(follow._id) === String(loggedinUser._id)) ? 'followYou': 'suggestion',
                following: false,
                follower: getMiniUser(user), 
            }
        }).slice(0, MAX_SUGGESTION)
        
        return users
    } catch (err) {
        loggerService.error(TAG, 'getSuggestions()', `Had problems getting suggestions for user ${loggedinUser}`, err)
        throw 'Had problems getting suggestions'
    }
}

//#endregion == suggestions ==============

//#region == followings ===============

async function getFollowings(loggedinUser) {
    try {
        const moreConversationUsers = await conversationService.queryOfNotFollowing(loggedinUser._id, loggedinUser.following)
        
        var conversationUsers = loggedinUser.following || []
        
        for (const conversation of moreConversationUsers) {
            if (conversation.member1.username !== loggedinUser.username) {
                conversationUsers.push(conversation.member1)
            } else {
                conversationUsers.push(conversation.member2)
            }
        }

        const conversationUserIds = conversationUsers.map(user => new ObjectId(user._id))
        

        const criteria = _buildFollowingsCriteria(conversationUserIds)
        const pipeline = _buildFollowingsPipeline(loggedinUser.username, criteria)
        const collection = await dbService.getCollection(collectionName)
        
        var usersCursor = await collection.aggregate(pipeline)

        // sort
        pipeline.push({ $sort: { _id: -1 } })

        var users = await usersCursor.toArray()
        users = await Promise.all(users.map(async user => {
            user.conversationId = !user.hasOwnProperty('conversationId') 
                ? await conversationService.add(loggedinUser, loggedinUser.username, user.username)._id
                : user.conversationId

            const sockets = await socketService.getAllSockets()    
            user.isOnline = sockets.some(socket => socket.username === user.username)
            return user
        }))

        return users
    } catch (err) {
        loggerService.error(TAG, 'getFollowings()', `Had problems getting followings for user ${loggedinUser}`, err)
        throw 'Had problems getting followings'
    }
}

function _buildFollowingsCriteria(userIds) {
    const criteria = {}
    const userIdsCriteria = { _id: { $in: userIds }}
    criteria.userIds = userIdsCriteria
    return criteria
}

function _buildFollowingsPipeline(loggedinUsername, criteria) {
    var pipeline = []
        
    // match
    pipeline.push({ $match: criteria.userIds })
    
    // conversationId
    pipeline.push({
        $lookup: {
            from: 'conversation',
            let: { 
                username1: '$username',
                username2: loggedinUsername
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $or: [
                                { $and: [{ $eq: ['$member1.username', '$$username1'] }, { $eq: ['$member2.username', '$$username2'] }] },
                                { $and: [{ $eq: ['$member2.username', '$$username1'] }, { $eq: ['$member1.username', '$$username2'] }] }
                            ]
                        }
                    }
                }
            ],
            as: 'conversationId'
        }
    })
    
    // project
    pipeline.push({ 
        $project: {
            _id: true, 
            fullname: true,
            username: true,
            profilePicture: true,
            lastSeen: true,
            conversationId: { $arrayElemAt: ['$conversationId._id', 0] }
        } 
    })
    
    return pipeline
}


//#endregion == followings ===============

//#region == profile ==================

async function getProfile(loggedinUser, profileUsername) {
    try {
        const collection = await dbService.getCollection(collectionName)
        
        // user
        const userProfile = await collection.findOne({ username: profileUsername })
        const followersCount = await collection.countDocuments({"following._id": new ObjectId(userProfile._id)})

        const followingCount = userProfile.following ? userProfile.following.length : 0
        
        const canEdit = String(loggedinUser._id) === String(userProfile._id)
        
        var isFollowing = false            
        if (String(loggedinUser._id) !== String(userProfile._id)) {
            isFollowing = loggedinUser.following 
                ? loggedinUser.following.some(follow => String(follow._id) === String(userProfile._id))
                : null      
        }
          
        var canFollow = String(loggedinUser._id) !== String(userProfile._id) && !isFollowing
        
        // posts
        const posts = await postService.queryByCreatorId(userProfile._id)
        
        // reels
        const reels = []

        // saved
        const saved = await postService.querySavedPosts(userProfile) 
        
        // tagged
        const tagged = []
        
        delete userProfile.password
        delete userProfile.isAdmin
        delete userProfile.following
        delete userProfile.savedPosts

        return {
            user: userProfile,
            info: {
                followersCount,
                followingCount,
                canEdit,
                isFollowing,
                canFollow
            },
            posts,
            reels,
            saved,
            tagged
        }

    } catch (err) {
        loggerService.error(TAG, 'getProfile()', `Had problems getting user ${profileUsername}`, err)
        throw `Had problems getting user ${profileUsername}`
    }
}

//#endregion == profile ==================

//#region == messages =================

async function saveUnreadMessage(messageToSave) {
    
    try {
        const collection = await dbService.getCollection(collectionName)
        
        const words = messageToSave.txt.split(' ')
        const slicedText = words.slice(0, 4).join(' ')

        await collection.updateOne(
            {
                username: messageToSave.to,
                unreadMessages: {
                    $not: {
                        $elemMatch: {
                            from: messageToSave.from,
                            txt: { $ne: slicedText },                       // ignore
                            createdAt: { $ne: messageToSave.createdAt }     // ignore
                        }
                    }
                }
            },
            {
                $addToSet: { unreadMessages: {
                    from: messageToSave.from,
                    txt: slicedText,               
                    createdAt: messageToSave.createdAt,               
                } 
                }
            }
        )
  
        return messageToSave

    } catch (err) {
        loggerService.error(TAG, 'saveUnreadMessage()', `cannot update user has new message ${JSON.stringify(messageToSave)}`, err)
    }
}

async function unsaveReadMessage(messageToUnsave) {
    try {
        const collection = await dbService.getCollection(collectionName)
        
        await collection.updateOne(
            { username: messageToUnsave.to }, 
            { $pull: { "unreadMessages": { "from": messageToUnsave.from } } }
        )
  
        return messageToUnsave

    } catch (err) {
        loggerService.error(TAG, 'unsaveReadMessage()', `cannot update user has read message ${JSON.stringify(messageToUnsave)}`, err)
    }
}

//#endregion == messages =================

function getMiniUser(user) {
    const miniUser =  {
        _id: user._id,
        username: user.username,
        profilePicture: user.profilePicture
    }

    return miniUser
}

function getTokenUser(user) {
    const tokenUser = {
        _id: user._id, 
        contact: user.contact, 
        fullname: user.fullname, 
        username: user.username, 
        profilePicture: user.profilePicture, 
        isAdmin: user.isAdmin, 
        lastSeen: user.lastSeen
    }

    return tokenUser
}