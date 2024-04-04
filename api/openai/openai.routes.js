import express from 'express'
import { getGeneratedPost } from './openai.controller.js'
import { requireAuth } from '../auth/auth.middleware.js'

const router = express.Router()

router.get('/generatePost', requireAuth, getGeneratedPost)    

export const openaiRoutes = router
