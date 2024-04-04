import express from 'express'
import { getPosts, explore, geTagPosts, getPost, addPost, updatePost, removePost, likePost, unlikePost,
    savePost, unsavePost, addPostComment, updatePostComment, likeComment, unlikeComment } from './post.controller.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requireOwner, requireCommentOwner } from './post.middleware.js'
import { updateLastSeen } from '../user/user.middleware.js'

const router = express.Router()

router.get('/', requireAuth, updateLastSeen, getPosts)                                          // list
router.get('/explore', requireAuth, updateLastSeen, explore)                                    // explore post list
router.get('/:tag/tag', requireAuth, updateLastSeen, geTagPosts)                                // tag post list
router.get('/:postId', updateLastSeen, getPost)                                                 // read
router.post('/', requireAuth, updateLastSeen, addPost)                                          // create
router.put('/', requireAuth, requireOwner, updateLastSeen, updatePost)                          // update
router.delete('/:postId', requireAuth, requireOwner, updateLastSeen, removePost)                // delete
router.put('/:postId/like', requireAuth, updateLastSeen, likePost)                              // like
router.put('/:postId/unlike', requireAuth, updateLastSeen, unlikePost)                          // unlike
router.put('/:postId/save', requireAuth, updateLastSeen, savePost)                              // save
router.put('/:postId/unsave', requireAuth, updateLastSeen, unsavePost)                          // unsave

router.put('/:postId/comment', requireAuth, updateLastSeen, addPostComment)                                         // create comment
router.put('/:postId/comment/:commentId', requireAuth, requireCommentOwner, updateLastSeen, updatePostComment)      // update comment
router.delete('/:postId/comment/:commentId', requireAuth, requireCommentOwner, updateLastSeen, )                    // delete comment
router.put('/:postId/comment/:commentId/like', requireAuth, updateLastSeen, likeComment)                            // like comment
router.put('/:postId/comment/:commentId/unlike', requireAuth, updateLastSeen, unlikeComment)                        // unlike comment

export const postRoutes = router
