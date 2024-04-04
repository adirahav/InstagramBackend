import { loggerService } from '../../services/logger.service.js'
import { utilService } from '../../services/util.service.js'
import { conversationService } from './conversation.service.js'

const TAG = "conversation.controller"

export async function getConversation(req, res) {
    const { conversationId } = req.params
   
    try {
        const messages = await conversationService.getById(conversationId)
        res.send(messages)
    } catch(err) {
        loggerService.error(TAG, 'getConversation()', `Couldn't get conversation`, err)
        res.status(400).send(`Couldn't get conversation`)
    }
}

export async function addConversation(req, res) {
    const { from, to } = req.body

    try {
        const conversation = await conversationService.add(req.loggedinUser, from, to)
        res.send(conversation)
    } catch(err) {
        loggerService.error(TAG, 'addConversation()', `Couldn't add conversation`, err)
        res.status(400).send(`Couldn't add conversation`)
    }
}

export async function addMessage(req, res) {
    const { conversationId } = req.params
    const { from, to, txt } = req.body

    const messageToAdd = {
        id: utilService.makeId(),
        from,
        to,
        createdAt: new Date(),
        txt,
    }

    try {
        const addedMessage = await conversationService.addMessage(conversationId, messageToAdd)
        res.send(addedMessage)
    } catch(err) {
        loggerService.error(TAG, 'addMessage()', `Couldn't add message to conversation ${conversationId}`, err)
        res.status(400).send({ err: `Couldn't add message to conversation` })
    }
} 
