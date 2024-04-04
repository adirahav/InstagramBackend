import express from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { updateLastSeen } from '../user/user.middleware.js'
import { addConversation, addMessage, getConversation } from './conversation.controller.js'
import { requireMember } from './conversation.middleware.js'

const router = express.Router()                                        
router.get('/:conversationId', requireAuth, requireMember, updateLastSeen, getConversation)         // read
router.post('/', requireAuth, requireMember, addConversation)                                       // create
router.put('/:conversationId/message', requireAuth, requireMember, updateLastSeen, addMessage)      // create comment

export const conversationRoutes = router
