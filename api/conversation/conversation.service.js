import { loggerService } from '../../services/logger.service.js'
import { dbService } from '../../services/db.service.js'
import mongoDB from 'mongodb'
import { userService } from '../user/user.service.js'

export const conversationService = {
    queryOfNotFollowing,
    getById,
    add,
    addMessage
}

const TAG = "conversation.service"
let { ObjectId } = mongoDB
const collectionName = 'conversation'

async function queryOfNotFollowing(memberId, excludeMembersIds) {
    try {
        if (!excludeMembersIds) {
            return []
        }

        const collection = await dbService.getCollection(collectionName)
        
        const conversations = await collection.find({$and: [
            {$or: [
                {$and: [
                    {'member1._id': new ObjectId(memberId)}, {'member1._id': { $nin: excludeMembersIds }}
                ]},
                {$and: [
                    {'member2._id': new ObjectId(memberId)}, {'member2._id': { $nin: excludeMembersIds }}
                ]},
                
            ]},
            { messages: { $exists: true, $not: { $size: 0 } } }
        ]}).toArray()
    
        return conversations
        
    } catch (err) {
        loggerService.error(TAG, 'queryOfNotFollowing()', `Had problems getting ${memberId} conversations`, err)
        throw `Had problems getting ${memberId} conversation`
    }
}

//#region == get conversation =========

async function getById(conversationId) {
    try {

        /*const filter = { _id: new ObjectId(conversationId) }

        const criteria = _buildQueryCriteria(filter)
        const pipeline = _buildQueryPipeline(criteria)

        try {
            const collection = await dbService.getCollection(collectionName)
            const postsCursor = await collection.aggregate(pipeline)
            
            if (sort.sortBy) {
                if (sort.sortBy === 'createdAt') {
                    postsCursor.sort({ _id: +sort.sortDir })

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
                        maxPages: Math.ceil(totalCount / paging.pagingSize)
                    } : null,
                list: posts
            }
        } catch (err) {
            loggerService.error(TAG, 'query()', `Had problems getting posts`, err)
            throw `Had problems getting posts`
        }*/

        const collection = await dbService.getCollection(collectionName)
        const conversation = await collection.findOne({ _id: new ObjectId(conversationId) })

        if (!conversation) {
            throw `Couldn't get conversation ${conversationId}` 
        }

        return conversation
        
    } catch (err) {
        loggerService.error(TAG, 'getById()', `Had problems getting conversation ${conversationId}`, err)
        throw `Had problems getting conversation ${conversationId}`
    }
}
/*
function _buildQueryCriteria(filterBy) {
    const criteria = {}

    if (filterBy.createdBy) {
        
        criteria["createdBy._id"] = filterBy.createdBy
    }   // {"createdBy._id":"65d64acd8ec5dd8a35dd99f2"}

    loggerService.debug(TAG, "buildCriteria()", JSON.stringify(criteria))
    return criteria
}
*/
function _buildQueryPipeline1(criteria) {
    var pipeline = []
    
    // match
    pipeline.push({ $match: criteria })


    /*pipeline.push({
        $lookup: {
            localField: '_id',
            from: 'user',
            foreignField: 'savedPosts',
            as: 'isSaved'
        }
    })*/
/*
    pipeline.push({
        $lookup: {
          from: 'user',
          let: { postId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$$postId', '$savedPosts._id'] }
              }
            },
            {
              $project: {
                _id: 1,
                isSaved: true
              }
            }
          ],
          as: 'isSaved'
        }
      })
      
      pipeline.push({
        $addFields: {
          isSaved: {
            $cond: {
              if: { $gt: [{ $size: '$isSaved' }, 0] },
              then: true,
              else: false
            }
          }
        }
      })
    */

    // project
    pipeline.push({ 
        $project: {
            _id: true, 
            createdBy: true, 
            media: true, 
            text: true, 
            likes: true, 
            saves: true
        }
    })
    
    return pipeline
}

//#endregion == get conversation =========

//#region == add conversation =========

async function add(loggedinUser, username1, username2) {
    
    try {
        if (!username1 || !username2) {
            throw {code:400, message: 'Missing required conversation information'}
        }

        const member1 = (loggedinUser.username === username1) ? loggedinUser : await userService.getByUsername(username1)
        const member2 = (loggedinUser.username === username2) ? loggedinUser : await userService.getByUsername(username2)

        const conversationToAdd = {
            member1: userService.getMiniUser(member1),
            member2: userService.getMiniUser(member2)
        }
        
        const collection = await dbService.getCollection(collectionName)

        const conversationExist = await collection.findOne({
                $or: [
                    {$and: [{'member1.username': username1},{'member2.username': username2}]}, 
                    {$and: [{'member1.username': username2},{'member2.username': username1}]}
                ]
            })

        if (conversationExist) {
            loggerService.warn(TAG, 'add()', `Conversation between ${username1} and ${username2} is already exist`)
            return {conversationExist}
        }

        const result = await collection.insertOne(conversationToAdd)

        if (!result.acknowledged) {
            loggerService.error(TAG, 'add()', `Failed to insert conversation between ${username1} and ${username2}`, result)
            throw `Failed to insert conversation between ${username1} and ${username2}`
        }
        return {...conversationToAdd, _id: result.insertedId}
    } catch (err) {
        loggerService.error(TAG, 'add()', `Had problems add conversation between ${username1} and ${username2}`, err)
        throw `Had problems add conversation between ${username1} and ${username2}`
    }
}

//#endregion == add conversation =========


async function addMessage(conversationId, message) {
    try {
        const collection = await dbService.getCollection(collectionName)
        await collection.updateOne({ _id: new ObjectId(conversationId) }, { $push: { messages: message } })
        return message
    } catch (err) {
        loggerService.error(TAG, 'addMessage()', `cannot add message to conversation ${conversationId}`, err)
        throw `cannot add message to conversation ${conversationId}`
    }
}
