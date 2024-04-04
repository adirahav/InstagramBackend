import { loggerService } from '../../services/logger.service.js'
import { dbService } from '../../services/db.service.js'
import mongoDB from 'mongodb'

export const postService = {
    queryLatestPosted,
    queryLatestLikesAndComments,
}

const TAG = "post.service"
let { ObjectId } = mongoDB
const collectionName = 'post'

async function queryLatestPosted(loggedinUser) {
    const weekAgoObjectId = new ObjectId(Math.floor(Date.now() / 1000 - 7 * 24 * 60 * 60).toString(16) + '0000000000000000');
    
    const loggedinUserFollowingUsername = loggedinUser.following?.map(follow => follow.username) || []                
    
    const filter = { createdByUsernames: loggedinUserFollowingUsername, since: weekAgoObjectId }
    const criteria = _buildQueryCriteria(filter)
    const pipeline = _buildQueryPipeline(criteria)
    const collection = await dbService.getCollection(collectionName)
    const cursor = await collection.aggregate(pipeline)

    cursor.sort({ _id: -1 })

    const posts = await cursor.toArray()
    
    try {
        return posts
    } catch (err) {
        loggerService.error(TAG, 'queryLatestPosted()', `Had problems getting latest posts`, err)
        throw `Had problems getting latest posts`
    }
}

async function queryLatestLikesAndComments(loggedinUser) {

    const weekAgo = 7 * 24 * 60 * 60 * 1000

    try {
        const loggedinUserPosts = await queryByCreatorId(loggedinUser._id)
    
        const latestLiked = loggedinUserPosts.filter(post => {
            if (post.likes && post.likes.length > 0) {
                for (const like of post.likes) {
                    const likeCreatedAt = new Date(like.createdAt)
                    const currentDate = new Date()
                    const timeDifference = currentDate - likeCreatedAt
                    
                    if (timeDifference <= weekAgo) {
                        return true
                    }
                }
            }
            
            return false
        })

        const latestCommented = loggedinUserPosts.filter(post => {
            if (post.comments && post.comments.length > 0) {
                for (const comment of post.comments) {
                    const commentCreatedAt = new Date(comment.createdAt)
                    const currentDate = new Date()
                    const timeDifference = currentDate - commentCreatedAt
                    
                    if (timeDifference <= weekAgo) {
                        return true
                    }
                }
            }
            
            return false
        })
        
        return {
            likes: latestLiked,
            comments: latestCommented
        }
    } catch (err) {
        loggerService.error(TAG, 'queryLatestLikesAndComments()', `Had problems getting latest likes`, err)
        throw `Had problems getting latest likes`
    }
}

function _buildQueryCriteria(filterBy) {
    const criteria = {}

    if (filterBy.createdBy) {
        criteria["createdBy._id"] = filterBy.createdBy
    } 

    if (filterBy.tag) {
        criteria.text = { $regex: `\\b${filterBy.tag}\\b`, $options: "i" }
    } 

    if (filterBy.createdByUsernames) {
        criteria["createdBy.username"] = { $in: filterBy.createdByUsernames }
    }

    if (filterBy.notCreatedByUsernames) {
        criteria["createdBy.username"] = { $nin: filterBy.notCreatedByUsernames }
    }
    
    if (filterBy.since) {
        criteria["_id"] = { $gte: filterBy.since }
    }

    if (filterBy.before) {
        criteria["_id"] = { $lt: filterBy.before }
    }

    return criteria
}

function _buildQueryPipeline(criteria) {
    var pipeline = []
    
    // match
    pipeline.push({ $match: criteria })

    // project
    pipeline.push({ 
        $project: {
            _id: true, 
            createdBy: true, 
            media: true, 
            text: true, 
            likes: true, 
            comments: true,
            saves: true
        }
    })
    
    return pipeline
}

async function queryByCreatorId(creatorId) {
    
    try {
        const collection = await dbService.getCollection(collectionName)
        const posts = await collection
            .find({ $or: [{ 'createdBy._id': String(creatorId)}, { 'createdBy._id': new ObjectId(creatorId)}] })
            .sort({ _id: -1 })
            .toArray()
        
        return posts
    } catch (err) {
        loggerService.error(TAG, 'queryByCreatorId()', `Had problems getting user posts`, err)
        throw `Had problems getting user posts`
    }
}
