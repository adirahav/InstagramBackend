import axios from 'axios';
import { loggerService } from '../../services/logger.service.js'
import OpenAI from "openai"

export const openaiService = {
    generatedPost
}

const TAG = "openai.service"



async function _getOpenAPIAccessibleModels() {
 /*   try {
        const response = await axios.get('https://api.openai.com/v1/model', {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                //'OpenAI-Organization': 'org-4yV1JtmHjoU2WjkbqiMZbl3g'
            }
        });

        if (response.status === 200) {
            const accountInfo = response.data
            console.log('Account Information:', accountInfo)
            console.log('Models Accessible:', accountInfo.accessible_models)
        } else {
            console.error('Error retrieving account information:', response.statusText)
        }
    } catch (error) {
        console.error('Error fetching models:', error.message)
        throw error
    }*/
}

async function _getOpenAPICompletions() {
  /*   try {
        const response = await axios.get('https://api.openai.com/v1/engines/gpt-4-vision-preview/completions', {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                //'OpenAI-Organization': 'org-4yV1JtmHjoU2WjkbqiMZbl3g'
            }
        },
       {
         //   model: 'text-davinci-003',
            prompt: 'game',
            temperature: 0.7,
            max_tokens: 100
        })

        if (response.status === 200) {
            const data = response.data
            console.log('completions:', data)
        } else {
            console.error('Error retrieving account information:', response.statusText)
        }
    } catch (error) {
        console.error('Error fetching completions:', error.message)
        throw error
    }*/
}

async function generatedPost(subject) {

    try {
        const response = await axios({
            url: 'https://api.openai.com/v1/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                //'OpenAI-Organization': 'org-4yV1JtmHjoU2WjkbqiMZbl3g'
            },
            data: JSON.stringify({
                'model': 'gpt-3.5-turbo-0301',
                'prompt': subject,
                'temperature': 0.7,
                'max_tokens': 100,
                'top_p': 1,
                //'frequency_penalty': 0,
                //'presence_penalty': 0
            })
        })

        const result = await response.data
        return result

    } catch(err) {
        loggerService.warn(TAG, 'generatedPost()', `Dummy content creation due to disabling free tier open ai`, err)
        
        const dummyContent = [
            "👢🐱 Embark on an Adventure with Puss in Boots! 🌟\nStep into a world where bravery meets charm and adventure awaits at every turn—welcome to the enchanting tale of Puss in Boots! 🎩🐾 Whether he's strutting through the streets in his stylish boots or outwitting foes with his quick wit, this feline hero captures our hearts with his daring escapades and unwavering courage. 💫\nFrom the pages of fairy tales to the big screen, Puss in Boots has captivated audiences of all ages with his swashbuckling spirit and undeniable charm. 🎬📚 So let's raise a toast to this pint-sized hero who proves that even the smallest of us can achieve greatness with a little bit of courage and a whole lot of heart. 🎩🐱🌟",
            "👢🐱👢 Step into the Magic of Puss in Boots! ✨\nEmbark on a journey where every meow carries a hint of mystery and every glance sparkles with adventure. 🌟 Puss in Boots, the legendary cat with a heart of gold and boots of leather, invites you to join him on a whirlwind of escapades through enchanted lands and treacherous paths. 🎩🐾\nFrom cunning schemes to heartwarming friendships, this timeless tale reminds us that courage and kindness can conquer even the fiercest foes. 💖 So let's dust off our boots, unleash our inner swashbucklers, and follow Puss in Boots on a quest for glory, laughter, and a happily ever after! 📖✨",
            "🐱👢🐱 Whiskers at the Ready: Puss in Boots Chronicles Await! 📚✨\nIn a land where legends come alive, there's a cat who's more than meets the eye—Puss in Boots! 🎩 From the pages of folklore to the silver screen, this dashing feline steals the spotlight with his wit, charm, and impeccable sense of style. 🌟\nJoin us as we journey through realms of magic and mischief, where daring rescues and daring escapades await at every turn. 🏰 Whether he's outwitting ogres or winning hearts with his signature swagger, Puss in Boots reminds us that heroes come in all shapes and sizes. 🐾💫\nSo, let's dust off our imagination and embark on an adventure fit for the ages. Are you ready to follow in the pawprints of greatness? 📖👢",
            "🐱👢 Enchanting Tales Await: Dive into the World of Puss in Boots! 📚✨\nIn a realm where dreams dance and legends thrive, there's a feline friend who's always ready for a grand adventure—Puss in Boots! 🎩 From his mischievous grin to his trusty pair of boots, this beloved character enchants hearts young and old with his daring escapades and noble deeds. 🌟\nJoin us as we flip through the pages of timeless tales, where every twist and turn brings us closer to the magic of Puss in Boots. 📖 Whether he's outsmarting villains or lending a paw to those in need, his courage and charisma light up the pages like no other. 🐾💖\nSo, grab your imagination and embark on a journey filled with wonder and whimsy. Let's follow Puss in Boots as he pounces from one adventure to the next, leaving a trail of joy and inspiration in his wake. 🎨👢",
            "👢👢🐱 Embrace the Magic: Puss in Boots Chronicles Unfold! 📚✨\nVenture into a world where bravery reigns supreme and mischief lurks around every corner—the realm of Puss in Boots! 🎩 From humble beginnings to daring exploits, this whiskered wonder captivates hearts with his cunning wit and unwavering spirit. 🌟\nJoin us as we journey through tales spun with threads of adventure, friendship, and a sprinkle of fairy dust. 📖 With every turn of the page, Puss in Boots reminds us that heroes can emerge from the unlikeliest of places, and true courage knows no bounds. 🐾💫\nSo, let's lose ourselves in the enchantment of these timeless stories, where every adventure brings us closer to the magic within ourselves. Are you ready to don your boots and follow Puss in Boots on an epic quest? 📚👢"
        ]
        
        const randomNumber = Math.floor(Math.random() * dummyContent.length)
        
        const data = {
            "id": "cmpl-uqkvlQyYK7bGYrRHQ0eXlWi7",
            "object": "text_completion",
            "created": 1589478378,
            "model": "gpt-3.5-turbo-0301",
            "choices": [
              {
                "text": dummyContent[randomNumber],
                "index": 0,
                "logprobs": null,
                "finish_reason": "length"
              }
            ],
            "usage": {
              "prompt_tokens": 5,
              "completion_tokens": 7,
              "total_tokens": 12
            }
          }
        return data.choices[0]

        //loggerService.error(TAG, 'getGeneratedPost()', `Couldn't generated text for '${subject}'`, err)
        //res.status(400).send(`Couldn't generated text`)
    }
   
    /*
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY, 
    })

    try {
        const response = await openai.completions.create({
            model: 'gpt-3.5-turbo-0301',
            prompt: keywords,
            maxTokens: 1 // Adjust as needed
        })

        const response = await openai.completions.create({
            model: 'gpt-3.5-turbo-instruct',
            prompt: 'Write a tagline for an ice cream shop.'
        })

        console.log(response.data.choices[0].text); // Output the generated text
    } catch (error) {
        console.error('Error generating text:', error);
        throw error
    }
 return 'ok'*/
    /*
      const response = await openai.completions.create({
        model: 'gpt-3.5-turbo', // Specify the engine (you can choose other engines too)
        prompt: keywords,
        maxTokens: 100 // Adjust as needed
    })

    // Extract generated text from response
    const aiGeneratedText = response.data.choices[0].text

    return aiGeneratedText*/
   /* try {
        return {
            paging: paging && paging.pageNumber !== '' ? {
                    totalCount,
                    pageNumber: paging.pageNumber,
                    maxPages: Math.ceil(totalCount / paging.pagingSize)
                } : null,
            list: posts
        }
    } catch (err) {
        loggerService.error(TAG, 'generatedText()', `Had problems getting posts`, err)
        throw `Had problems getting posts`
    }*/
}
