import { loggerService } from '../../services/logger.service.js'
import { utilService } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import mongoDB from 'mongodb'

export const postService = {
    query,
    queryLatestPosted,
    queryLatestLikesAndComments,
    queryExplore,
    queryByCreatorId,
    queryByTagged,
    queryByTag,
    querySavedPosts,
    getById,
    add,
    update,
    remove,
    like,
    unlike,
    save,
    unsave,
    addComment,
    updateComment,
    removeComment,
    likeComment,
    unlikeComment,
    getMiniPost,
    getMiniComment
}

const TAG = "post.service"
const DEFAULT_PAGE_SIZE = 2
let { ObjectId } = mongoDB
const collectionName = 'post'

async function query(loggedinUser, filterBy, sortBy, pagingBy) {
    const sevenDaysAgoObjectId = new ObjectId(Math.floor(Date.now() / 1000 - 7 * 24 * 60 * 60).toString(16) + '0000000000000000');
    
    const loggedinUserFollowingUsername = loggedinUser.following?.map(follow => follow.username) || []                
    //loggedinUserFollowingUsername = loggedinUser.following?.map(follow => String(follow._id)) || []                
    //const loggedinUserFollowingUsername = loggedinUser.following?.map(follow => follow._id) || []  

    const sort = { 
        sortBy: sortBy.sortBy || '', 
        sortDir: sortBy.sortDir || '1', // 1: asc | -1: description
    }
    
    const paging = pagingBy && { 
        pageNumber: pagingBy.pageNumber || '',
        pagingSize: pagingBy.pagingSize || DEFAULT_PAGE_SIZE
    } || null

    async function _createPostArray(type, filter) {
        const criteria = _buildQueryCriteria(filter)
        const pipeline = _buildQueryPipeline(criteria)
        const collection = await dbService.getCollection(collectionName)
        const cursor = await collection.aggregate(pipeline)
    
        if (sort.sortBy) {
            if (sort.sortBy === 'createdAt') {
                cursor.sort({ _id: +sort.sortDir })
            } else {
                cursor.sort(sort.sortBy, sort.sortDir)
            }
        }
    
        var posts = await cursor.toArray()
        
        posts = posts.map(post => {
            post.createdAt = new ObjectId(post._id).getTimestamp()
            post.type = type
            if (type === "suggested") {
                post.createdBy.following = false
            }
            
            return post
        })

        return posts
    }

    var totalCount
    if (filterBy.variant === "past_posts") {
        var posts = await _createPostArray('old', { createdByUsernames: loggedinUserFollowingUsername, before: sevenDaysAgoObjectId })
        totalCount = posts.length
    }
    else {
        // ------------------------------
        // new
        // ------------------------------
        
        const newPosts = await _createPostArray('new', { createdByUsernames: loggedinUserFollowingUsername, since: sevenDaysAgoObjectId })
        
        // ------------------------------
        // old
        // ------------------------------

        var oldPosts = await _createPostArray('old', { createdByUsernames: loggedinUserFollowingUsername, before: sevenDaysAgoObjectId })
        
        if (oldPosts.length > 0) {
            oldPosts = [{
                "type": "old_preview"
            }]    
        }
        else {
            oldPosts = []
        }
        
        // ------------------------------
        // suggested
        // ------------------------------

        const suggestedPosts = await _createPostArray('suggested', { notCreatedByUsernames: [...loggedinUserFollowingUsername, loggedinUser.username] })
        
        if (suggestedPosts.length > 0) {
            suggestedPosts[0].isFirst = true
        }
        
        // ------------------------------
        // combine
        // ------------------------------
        
        var posts = [...newPosts, ...oldPosts, ...suggestedPosts]

        totalCount = newPosts.length + oldPosts.length + suggestedPosts.length
    }
    
    if (paging && paging.pageNumber) {
        
        const startIdx = (+paging.pageNumber - 1) * paging.pagingSize
        const endIdx = startIdx + (+paging.pagingSize)
        
        posts = posts.slice(startIdx, endIdx)
    }

    try {
        return {
            paging: paging && paging.pageNumber !== '' ? {
                    totalCount,
                    pageNumber: paging.pageNumber,
                    maxPages: Math.ceil(totalCount / paging.pagingSize),
                } : null,
            list: posts
        }
    } catch (err) {
        loggerService.error(TAG, 'query()', `Had problems getting posts`, err)
        throw `Had problems getting posts`
    }
}

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

async function queryExplore(loggedinUser, sortBy, pagingBy) {
    const loggedinUserFollowingIds = loggedinUser.following?.map(follow => String(follow._id)) || []                
    
    const sort = { 
        sortBy: sortBy.sortBy || '', 
        sortDir: sortBy.sortDir || '1', // 1: asc | -1: description
    }
    
    const paging = pagingBy && { 
        pageNumber: pagingBy.pageNumber || '',
        pagingSize: pagingBy.pagingSize || DEFAULT_PAGE_SIZE
    } || null

    async function _createPostArray(type, filter) {
        const criteria = _buildQueryCriteria(filter)
        const pipeline = _buildQueryPipeline(criteria)

        pipeline.push({ $addFields: { random: { $rand: {} } }})
        pipeline.push({ $sort: { random: 1 } })
          
        const collection = await dbService.getCollection(collectionName)
        const cursor = await collection.aggregate(pipeline)  
    
        var posts = await cursor.toArray()
        
        posts = posts.map(post => {
            post.createdAt = new ObjectId(post._id).getTimestamp()
            post.type = type
            return post
        })

        return posts
    }

    var totalCount
    var explorePosts = await _createPostArray('suggested', { notCreatedByIds: [...loggedinUserFollowingIds, String(loggedinUser._id)] })
    if (explorePosts.length > 0) {
        explorePosts[0].isFirst = true
    }
    
    totalCount = explorePosts.length
    
    if (paging && paging.pageNumber) {
        
        const startIdx = (+paging.pageNumber - 1) * paging.pagingSize
        const endIdx = startIdx + (+paging.pagingSize)
        
        explorePosts = explorePosts.slice(startIdx, endIdx)
    }

    try {
        return {
            paging: paging && paging.pageNumber !== '' ? {
                    totalCount,
                    pageNumber: paging.pageNumber,
                    maxPages: Math.ceil(totalCount / paging.pagingSize),
                } : null,
            list: explorePosts
        }
    } catch (err) {
        loggerService.error(TAG, 'queryExplore()', `Had problems getting explore posts`, err)
        throw `Had problems getting explore posts`
    }
}

async function queryByTag(filterBy, sortBy, pagingBy) {
    
    const filter = { 
        createdBy: filterBy.createdBy || '',
        savedPosts: filterBy.savedPosts || '',
        tag: filterBy.tag || ''
    }
    
    const sort = { 
        sortBy: sortBy.sortBy || '', 
        sortDir: sortBy.sortDir || '1', // 1: asc | -1: description
    }
    
    const paging = pagingBy && { 
        pageNumber: pagingBy.pageNumber || '',
        pagingSize: pagingBy.pagingSize || DEFAULT_PAGE_SIZE
    } || null
    
    const criteria = _buildQueryCriteria(filter)
    const pipeline = _buildQueryPipeline(criteria)
    
    
    try {
        const collection = await dbService.getCollection(collectionName)
        const postsCursor = await collection.aggregate(pipeline)
        
        if (sort.sortBy) {
            if (sort.sortBy === 'createdAt') {
                postsCursor.sort({ _id: +sort.sortDir })
               /* 
                //postsCursor.sort('_id.timestamp', sort.sortDir)
                //postsCursor.sort({ '_id.timestamp': sort.sortDir })*/
            } else {
                postsCursor.sort(sort.sortBy, sort.sortDir)
            }
        }
        
        var totalCount
        if (paging && paging.pageNumber) {
            totalCount = await collection.countDocuments(criteria)
            const startIdx = (+paging.pageNumber - 1) * paging.pagingSize
            postsCursor.skip(startIdx).limit(+paging.pagingSize)
        }

        var posts = await postsCursor.toArray()
        
        posts = posts.map(post => {
            post.createdAt = new ObjectId(post._id).getTimestamp()
            return post
        })

        return {
            paging: paging && paging.pageNumber !== '' ? {
                    totalCount,
                    pageNumber: paging.pageNumber,
                    maxPages: Math.ceil(totalCount / paging.pagingSize),
                } : null,
            list: posts
        }
    } catch (err) {
        loggerService.error(TAG, 'query()', `Had problems getting posts`, err)
        throw `Had problems getting posts`
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
       //criteria["createdBy._id"] = { $in:["65e8cc537183cee6408356b8","65e8acd269e7ef4198ce9caa","65f97822ae8c9625dc0ef339","65f62d337651fac755a305ee","65fadf85dfd71b0edf61776a","65fae067dfd71b0edf61776b","65f8abdeef23ab6f715d305a","65fae3c8dbaabbad9f98c4be","65fae2d4dbaabbad9f98c4bd"] }
    }

    if (filterBy.notCreatedByUsernames) {
        criteria["createdBy.username"] = { $nin: filterBy.notCreatedByUsernames }
        //const exclude = ["65e8cc537183cee6408356b8","65e8acd269e7ef4198ce9caa","65f97822ae8c9625dc0ef339","65f62d337651fac755a305ee","65fadf85dfd71b0edf61776a","65fae067dfd71b0edf61776b","65f8abdeef23ab6f715d305a","65fae3c8dbaabbad9f98c4be",new ObjectId("65fae2d4dbaabbad9f98c4bd"),new ObjectId("65e9885d465f1e7de899e251")]
        //criteria["createdBy._id"] = { $nin: exclude }
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

async function queryByTagged(username) {
    
    try {
        const regexUsername = new RegExp(`@${username}(?: |$)`, 'i')
        
        const collection = await dbService.getCollection(collectionName)
        const posts = await collection
            .find({ $or: [
                        { 'text':  { $regex: regexUsername } }, 
                        { 'comments.comment':  { $regex: regexUsername } }
                    ] })
            .sort({ _id: -1 })
            .toArray()
        
        return posts
    } catch (err) {
        loggerService.error(TAG, 'queryByCreatorId()', `Had problems getting user posts`, err)
        throw `Had problems getting user posts`
    }
}

async function querySavedPosts(savedBy) {
    
    try {
        const collection = await dbService.getCollection(collectionName)
        const posts = await collection
            .find({ "saves.username": savedBy.username })
            .sort({ _id: -1 })
            .toArray()
            
        return posts
    } catch (err) {
        loggerService.error(TAG, 'querySavedPosts()', `Had problems getting saved posts`, err)
        throw `Had problems getting saved posts`
    }
}


async function getById(postId) {
    try {
        const collection = await dbService.getCollection(collectionName)
        const post = await collection.findOne({ _id: new ObjectId(postId) })

        if (!post) {
            throw `Couldn't get post ${postId}` 
        }

        post.createdAt = new ObjectId(post._id).getTimestamp()
        
        return post
        
    } catch (err) {
        loggerService.error(TAG, 'getById()', `Had problems getting post ${postId}`, err)
        throw `Had problems getting post ${postId}`
    }
}

async function add(postToAdd) {
    
    try {
        const collection = await dbService.getCollection(collectionName)
        const result = await collection.insertOne(postToAdd)

        if (!result.acknowledged) {
            loggerService.error(TAG, 'add()', `Failed to insert post ${postToAdd.name}`, result)
            throw `Failed to insert post ${postToAdd.name}`
        }
        return {...postToAdd, _id: result.insertedId}
    } catch (err) {
        loggerService.error(TAG, 'add()', `Had problems add post ${postToAdd.name}`, err)
        throw `Had problems add post ${postToAdd.name}`
    }
}

async function update(postToUpdate) {
    const _id = postToUpdate._id
    delete postToUpdate._id

    try {
        const collection = await dbService.getCollection(collectionName)
        const result = await collection.updateOne(
                            { _id: new ObjectId(_id) },     
                            { $set: postToUpdate })
        
        if (!result.acknowledged) {
            loggerService.error(TAG, 'update()', `Failed to update post ${_id}`, result)
            throw `Failed to update post ${_id}`
        }

        return postToUpdate

    } catch (err) {
        loggerService.error(TAG, 'update()', `cannot update post ${_id}`, err)
        throw `Had problems update post ${_id}`
    }
}

async function remove(postId) {
    try {
        const collection = await dbService.getCollection(collectionName)
        const result = await collection.deleteOne({ _id: new ObjectId(postId) })
        
        if (!result.acknowledged || result.deletedCount === 0) {
            loggerService.error(TAG, `Failed to remove post ${postId}`, result)
            throw `Failed to remove post ${postId}`
        }
    } catch (err) {
        loggerService.error(TAG, 'remove()', `Had problems removing post ${postId}`, err)
        throw `Had problems removing post ${postId}`
    }
}

//#region == likes ====================
async function like(postId, likedBy) {
    try {
        const collection = await dbService.getCollection(collectionName)
        await collection.updateOne(
            {
              _id: new ObjectId(postId),
              likes: { $not: { $elemMatch: { username: likedBy.username, createdAt: { $ne: likedBy.createdAt } } } } // ignore createdAt
            },
            {
              $addToSet: { likes: likedBy }
            }
        )
        return { postId, likedBy }
    } catch (err) {
        loggerService.error(TAG, 'like()', `Had problems like post ${postId}`, err)
        throw `Had problems like post ${postId}`
    }
}

async function unlike(postId, unlikedBy) {
    try {
        const collection = await dbService.getCollection(collectionName)
        await collection.updateOne({ _id: new ObjectId(postId) }, { $pull: { likes: unlikedBy } })
        return { postId, unlikedBy }
    } catch (err) {
        loggerService.error(TAG, 'unlike()', `Had problems unlike post ${postId}`, err)
        throw `Had problems unlike post ${postId}`
    }
}
//#endregion == likes ====================

//#region == saved ====================
async function save(postId, savedBy) {
    try {
        const collection = await dbService.getCollection(collectionName)
        await collection.updateOne(
            {
              _id: new ObjectId(postId),
              saves: { $not: { $elemMatch: { username: savedBy.username, createdAt: { $ne: savedBy.createdAt } } } } // ignore createdAt
            },
            {
              $addToSet: { saves: savedBy }
            }
        )

        return { postId, savedBy }
    } catch (err) {
        loggerService.error(TAG, 'save()', `Had problems save post ${postId}`, err)
        throw `Had problems save post ${postId}`
    }
}

async function unsave(postId, unsavedBy) {
    try {
        const collection = await dbService.getCollection(collectionName)
        await collection.updateOne({ _id: new ObjectId(postId) }, { $pull: { saves: unsavedBy } })
        return { postId, unsavedBy }
    } catch (err) {
        loggerService.error(TAG, 'unsave()', `Had problems unsave post ${postId}`, err)
        throw `Had problems unsave post ${postId}`
    }
}
//#endregion == saved ====================

//#region == comments =================
async function addComment(postId, comment) {
    try {
        const collection = await dbService.getCollection(collectionName)
        await collection.updateOne({ _id: new ObjectId(postId) }, { $push: { comments: comment } })
        return comment
    } catch (err) {
        loggerService.error(TAG, 'addComment()', `cannot add comment to post ${postId}`, err)
        throw `cannot add comment to post ${postId}`
    }
}

async function updateComment(postId, commentId, commentToUpdate) {
    
    try {
        const collection = await dbService.getCollection(collectionName)
        const result = await collection.updateOne(
            { _id: new ObjectId(postId), 'comments.id': commentId },
            { $set: { 'comments.$.comment': commentToUpdate.comment } }
        )
            
        if (!result.acknowledged) {
            loggerService.error(TAG, 'updateComment()', `Failed to update comment ${commentToUpdate.id} to post ${postId}`, result)
            throw `Failed to update comment ${commentToUpdate.id} to post ${postId}`
        }

        return commentToUpdate
    } catch (err) {
        loggerService.error(TAG, 'updateComment()', `cannot update comment ${commentToUpdate.id} to post ${postId}`, err)
        throw `cannot update comment ${commentToUpdate.id} to post ${postId}`
    }
}

async function removeComment(postId, commentId) {
    try {
        const collection = await dbService.getCollection(collectionName)
        await collection.updateOne({ _id: new ObjectId(postId) }, { $pull: { comments: { id: commentId } } })
        return commentId
    } catch (err) {
        loggerService.error(TAG, 'removeComment()', `cannot remove comment ${commentId} of post ${postId}`, err)
        throw 'removeComment()', `cannot remove comment ${commentId} of post ${postId}`
    }
}

async function likeComment(postId, commentId, likedBy) {
    try {
        const collection = await dbService.getCollection(collectionName)
        await collection.updateOne(
            { _id: new ObjectId(postId), 'comments.id': commentId },
            { $addToSet: { 'comments.$.likes': likedBy } }
        )

        return { postId, commentId, likedBy }    
        
    } catch (err) {
        loggerService.error(TAG, 'likeComment()', `Had problems like comment ${commentId} of post ${postId}`, err)
        throw `Had problems like post ${commentId} of post ${postId}`
    }
}

async function unlikeComment(postId, commentId, unlikedBy) {
    try {
        const collection = await dbService.getCollection(collectionName)
        await collection.updateOne(
            { _id: new ObjectId(postId), 'comments.id': commentId },
            { $pull: { 'comments.$.likes': unlikedBy } }
        )
    } catch (err) {
        loggerService.error(TAG, 'unlikeComment()', `Had problems unlike comment ${commentId} of post ${postId}`, err)
        throw `Had problems unlike post ${commentId} of post ${postId}`
    }
}

//#endregion == comments =================

function getMiniPost(post, showProfile=false) {
    const miniPost =  {
        _id: post._id,
        ...(showProfile && { createdBy: post.createdBy }),
        media: post.media,
        text: post.text
    }

    return miniPost
}

function getMiniComment(comment) {
    const miniComment =  {
        id: comment.id,
        createdBy: comment.createdBy,
        comment: comment.comment
    }

    return miniComment
}
