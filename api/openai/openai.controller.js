import { loggerService } from '../../services/logger.service.js'

import { openaiService } from './openai.service.js'

const TAG = "openai.controller"

export async function getGeneratedPost(req, res) {
    const { subject } = req.query
    
    try {
        const generatedPost = await openaiService.generatedPost(subject)
        res.send(generatedPost)
    } catch(err) {
        loggerService.error(TAG, 'getGeneratedPost()', `Couldn't generated text for '${subject}'`, err)
        res.status(400).send(`Couldn't generated text`)
    }
    
}
