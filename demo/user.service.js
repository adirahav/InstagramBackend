import { loggerService } from "../../services/logger.service.js"
import { dbService } from "../../services/db.service.js"
import mongoDB from 'mongodb'
import { postService } from "../post/post.service.js"

const TAG = "user.service"
let { ObjectId } = mongoDB
const collectionName = 'user'

export const userService = {
    getNotifications, 
}

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

        if (!loggedinUser.following || !loggedinUser.following.length) {
            let followingSuggestions = []
            users.forEach(user => {
                const { _id, username, profilePicture, following } = user
                followingSuggestions.push({
                    _id,
                    username,
                    profilePicture,
                    following
                })
            })

            const followingSuggestionsList = followingSuggestions
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

            const groupedData = Object.values(followingSuggestionsList.reduce((acc, suggestion) => {
                const key = suggestion._id
                    if (!acc[key]) {
                        acc[key] = { ...suggestion, followBy: [suggestion.followBy] }
                    } else {
                        acc[key].followBy.push(suggestion.followBy)
                    }
                    return acc
            }, {}))

            const filteredGroupedData = groupedData.filter(follower => String(follower._id) !== String(loggedinUser._id))

            const notifications = [...filteredGroupedData]
            const sorttedNotifications = notifications
                .sort((a, b) => new Date(b.notifyAt) - new Date(a.notifyAt))
            
            return sorttedNotifications

        }
        
        const loggedinUserFollowingIds = users
                    .find(user => user.username === loggedinUser.username)
                    .following?.map(follow => String(follow._id))
        
        let followingByFollowers = []
        users.forEach(user => {
            if (loggedinUserFollowingIds.includes(String(user._id))) {
                const { _id, username, profilePicture, following } = user
                followingByFollowers.push({
                    _id,
                    username,
                    profilePicture,
                    following
                })
            }
        })

        const followingByFollowersList = followingByFollowers
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

        const groupedFollowers = Object.values(followingByFollowersList.reduce((acc, follow) => {
            const key = follow._id
                if (!acc[key]) {
                    acc[key] = { ...follow, followBy: [follow.followBy] }
                } else {
                    acc[key].followBy.push(follow.followBy)
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
