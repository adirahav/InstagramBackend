import express from 'express'
import { signup, login, logout } from './auth.controller.js'

const router = express.Router()

router.post('/signup', signup)                
router.post('/login', /*updateLastSeen,*/ login)                
router.post('/logout', logout)                

export const authRoutes = router