import { loggerService } from '../../services/logger.service.js'
import { SOCKET_EMIT_NOTIFICATION_COMMENT_LIKED, SOCKET_EMIT_NOTIFICATION_POST_COMMENT_ADDED, SOCKET_EMIT_NOTIFICATION_POST_LIKED, SOCKET_EMIT_NOTIFICATION_POST_ADDED, socketService } from '../../services/socket.service.js'
import { utilService } from '../../services/util.service.js'
import { userService } from '../user/user.service.js'
import { postService } from './post.service.js'

const TAG = "post.controller"

// list
export async function getPosts(req, res) {
    const { variant, sortBy, sortDir, pageNumber, pagingSize } = req.query
    
    const filter = { variant: variant || 'recent_posts' }
    const sort = { sortBy, sortDir}
    const paging = { pageNumber, pagingSize }
     
    try {
        const posts = await postService.query(req.loggedinUser, filter, sort, paging)
        res.send(posts)
    } catch(err) {
        loggerService.error(TAG, 'getPosts()', `Couldn't get posts`, err)
        res.status(400).send(`Couldn't get posts`)
    }
}

// get list by explore
export async function explore(req, res) {
    const { sortBy, sortDir, pageNumber, pagingSize } = req.query
    
    const filter = {  }
    const sort = { sortBy, sortDir}
    const paging = { pageNumber, pagingSize }
     
    try {
        const posts = await postService.queryExplore(req.loggedinUser, filter, sort, paging)
        res.send(posts)
    } catch(err) {
        loggerService.error(TAG, 'getExplore()', `Couldn't get eplore posts`, err)
        res.status(400).send(`Couldn't get eplore posts`)
    }
}

// get list by tag
export async function geTagPosts(req, res) {
    const { tag } = req.params
    const { pageNumber, pagingSize } = req.query

    const filter = { tag }
    const sort = { }
    const paging = { pageNumber: pageNumber || 1, pagingSize: pagingSize || '' }

    try {
        const posts = await postService.queryByTag(filter, sort, paging)
        res.send(posts)
    } catch(err) {
        loggerService.error(TAG, 'getPosts()', `Couldn't get posts by tag`, err)
        res.status(400).send(`Couldn't get posts by tag`)
    }
}

// read
export async function getPost(req, res) {
    const { postId } = req.params
    
    try {
        const post = await postService.getById(postId)

        if (post) {
            res.send(post) 
        }
        else {
            res.status(400).send(`Couldn't get post`) 
        }

        
    } catch(err) {
        res.status(400).send(`Couldn't get post`)
    }  
}

// create
export async function addPost(req, res) {
    const { media, text } = req.body 
    
    const postToAdd = {
        createdBy: userService.getMiniUser(req.loggedinUser),
        ...(media !== null && { media: media.map(({ url, width, height, type }) => ({ url, width, height, type })) }),
        ...(text !== null && { text }),
        
    }
    
    try {
        const addedPost = await postService.add(postToAdd)
        res.send(addedPost)
    } catch(err) {
        loggerService.error(TAG, 'addPost()', `Couldn't add post ${postId}`, err)
        res.status(400).send({ err: `Couldn't add post` })
    }
} 

// update
export async function updatePost(req, res) {
    
    const { _id, media, text } = req.body 
    
    const postToUpdate = {
        _id,
        ...(media !== null && { media: media.map(({ url, type }) => ({ url, type })) }),
        ...(text !== null && { text }),
    }
   
    try {
        const updatedPost = await postService.update(postToUpdate)
        res.send(updatedPost)
    } catch(err) {
        loggerService.error(TAG, 'updatePost()', `Couldn't update post ${postId}`, err)
        res.status(400).send(`Couldn't update post`)
    }  
}

// delete
export async function removePost(req, res) {
    const { postId } = req.params

    try {
        await postService.remove(postId)
        res.send(`post ${postId} removed`)
    } catch(err) {
        loggerService.error(TAG, 'removePost()', `Couldn't remove post ${postId}`, err)
        res.status(400).send(`Couldn't remove post`)
    }   
}

// like post
export async function likePost(req, res) {
    const { postId } = req.params

    const likedBy = userService.getMiniUser(req.loggedinUser)

    try {
        await postService.like(postId, {...likedBy, createdAt: new Date()})
        loggerService.debug("AAA [controll]")
        _emitNotificationToPostOwner(SOCKET_EMIT_NOTIFICATION_POST_LIKED, postId)
        res.send(`post ${postId} liked`)
    } catch(err) {
        loggerService.error(TAG, 'likePost()', `Couldn't like post ${postId}`, err)
        res.status(400).send(`Couldn't like post`)
    } 
}

// unlike post
export async function unlikePost(req, res) {
    const { postId } = req.params

    const unlikedBy = userService.getMiniUser(req.loggedinUser)

    try {
        await postService.unlike(postId, unlikedBy)
        res.send(`post ${postId} unliked`)
    } catch(err) {
        loggerService.error(TAG, 'unlikePost()', `Couldn't unlike post ${postId}`, err)
        res.status(400).send(`Couldn't unlike post`)
    } 
}

// save post
export async function savePost(req, res) {
    const { postId } = req.params

    const savedBy = userService.getMiniUser(req.loggedinUser)

    try {
        await postService.save(postId, {...savedBy, createdAt: new Date()})
        res.send(`post ${postId} saved`)
    } catch(err) {
        loggerService.error(TAG, 'savePost()', `Couldn't save post ${postId}`, err)
        res.status(400).send(`Couldn't save post`)
    } 
}

// unsave post
export async function unsavePost(req, res) {
    const { postId } = req.params

    const unsavedBy = userService.getMiniUser(req.loggedinUser)

    try {
        await postService.unsave(postId, unsavedBy)
        res.send(`post ${postId} unsaved`)
    } catch(err) {
        loggerService.error(TAG, 'unsavePost()', `Couldn't unsave post ${postId}`, err)
        res.status(400).send(`Couldn't unsave post`)
    } 
}

// add comment
export async function addPostComment(req, res) {
    const { loggedinUser } = req
    const { postId } = req.params
    const { comment } = req.body

    try {
        const commentToAdd = {
            id: utilService.makeId(),
            createdBy:  userService.getMiniUser(loggedinUser),
            createdAt: new Date(),
            comment,
        }
        
        const addedComment = await postService.addComment(postId, commentToAdd)
        _emitNotificationToPostOwner(SOCKET_EMIT_NOTIFICATION_POST_COMMENT_ADDED, postId)
        res.json(addedComment)
    } catch (err) {
        loggerService.error(TAG, 'addPostComment()', `Couldn't add comment to post ${postId}`, err)
        res.status(400).send(`Couldn't add comment`)
    }    
}

// update comment
export async function updatePostComment(req, res) {
    const { postId, commentId } = req.params
    const { comment } = req.body

    try {
        const commentToUpdate = {
            comment,
        }
        
        const updatedComment = await postService.updateComment(postId, commentId, commentToUpdate)
        res.json(updatedComment)
    } catch (err) {
        loggerService.error(TAG, 'updatePostComment()', `Couldn't update comment ${commentId} of post ${postId}`, err)
        res.status(400).send(`Couldn't update comment`)
    }    
}

// delete comment
export async function removePostComment(req, res) {
    const { postId, commentId } = req.params
        
    try {
        const removedId = await postService.removeComment(postId, commentId)
        res.send(`comment ${removedId} removed`)
    } catch (err) {
        loggerService.error(TAG, 'removePostComment()', `Couldn't remove comment ${commentId} of post ${postId}`, err)
        res.status(400).send({ err: `Couldn't remove comment` })
    } 
}

// like comment
export async function likeComment(req, res) {
    const { postId, commentId } = req.params

    const likedBy = userService.getMiniUser(req.loggedinUser)

    try {
        await postService.likeComment(postId, commentId, likedBy)
        _emitNotificationToCommentOwner(SOCKET_EMIT_NOTIFICATION_COMMENT_LIKED, postId, commentId)
        res.send(`comment ${postId} liked`)
    } catch(err) {
        loggerService.error(TAG, 'likeComment()', `Couldn't like comment ${commentId} of post ${postId}`, err)
        res.status(400).send(`Couldn't like comment`)
    } 
}

// unlike comment
export async function unlikeComment(req, res) {
    const { postId, commentId } = req.params

    const unlikedBy = userService.getMiniUser(req.loggedinUser)

    try {
        await postService.unlikeComment(postId, commentId, unlikedBy)
        res.send(`comment ${postId} unliked`)
    } catch(err) {
        loggerService.error(TAG, 'unlikePost()', `Couldn't unlike comment ${commentId} of post ${postId}`, err)
        res.status(400).send(`Couldn't unlike comment`)
    } 
}

async function _emitNotificationToPostOwner(type, postId) {
    const post = await postService.getById(postId)
    const miniPost = postService.getMiniPost(post)
    loggerService.debug("BBB")
    socketService.emitToUser({type, data: miniPost, user: post.createdBy}) 
}

async function _emitNotificationToCommentOwner(type, postId, commentId) {
    const post = await postService.getById(postId)
    const comment = post.comments.find(comment => comment.id === commentId)
    const miniComment = postService.getMiniComment(comment)
    //socketService.emitToUser({type, data: miniComment, user: comment.createdBy}) // TODO  
}