import os
import logging
from dotenv import load_dotenv
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from slack_sdk.errors import SlackApiError
import openai
from typing import Dict, Any

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize OpenAI
openai.api_key = os.environ.get("OPENAI_API_KEY")

# Initialize Slack app
app = App(
    token=os.environ.get("SLACK_BOT_TOKEN"),
    signing_secret=os.environ.get("SLACK_SIGNING_SECRET")
)

class ForgeAI:
    """AI Agent for Slack interactions"""
    
    def __init__(self):
        self.system_prompt = """You are ForgeAI, an AI assistant for the billionforgeai.space team. You are helpful, 
        intelligent, and have a friendly personality. You can help with:
        - Answering questions about development
        - Code assistance and debugging
        - Project management tasks
        - General knowledge questions
        - Brainstorming and problem-solving
        
        Always be concise but thorough in your responses. Use Slack markdown formatting when appropriate."""
    
    def generate_response(self, user_message: str, user_id: str = None, context: str = None) -> str:
        """Generate AI response using OpenAI"""
        try:
            messages = [
                {"role": "system", "content": self.system_prompt}
            ]
            
            if context:
                messages.append({"role": "system", "content": f"Context: {context}"})
            
            messages.append({"role": "user", "content": user_message})
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=1000,
                temperature=0.7,
                user=user_id
            )
            
            return response.choices[0].message.content.strip()
        
        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            return "I'm having trouble processing your request right now. Please try again later."

# Initialize AI agent
forge_ai = ForgeAI()

@app.event("app_home_opened")
def handle_app_home_opened(client, event, logger):
    """Handle when users open the app home"""
    try:
        client.views_publish(
            user_id=event["user"],
            view={
                "type": "home",
                "callback_id": "home_view",
                "blocks": [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": "🤖 Welcome to ForgeAI Assistant"
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*Hello! I'm ForgeAI, your AI assistant.*\n\nHere's how you can interact with me:\n\n• **Direct Message**: Send me a DM for private conversations\n• **Mention**: Tag me with `@ForgeAI` in any channel\n• **Slash Command**: Use `/ask-forgeai` followed by your question\n\nI can help with development questions, code review, project planning, and general assistance!"
                        }
                    },
                    {
                        "type": "divider"
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "🚀 *Ready to help with your development journey!*"
                        }
                    }
                ]
            }
        )
    except SlackApiError as e:
        logger.error(f"Error publishing home view: {e}")

@app.event("app_mention")
def handle_app_mention(event, say, client, logger):
    """Handle when the bot is mentioned in a channel"""
    try:
        # Get the message text without the mention
        text = event.get("text", "")
        # Remove the bot mention from the text
        clean_text = text.split(">", 1)[-1].strip() if ">" in text else text
        
        if not clean_text:
            say("Hi! How can I help you today?", thread_ts=event.get("ts"))
            return
        
        # Show typing indicator
        say("🤔 Let me think about that...", thread_ts=event.get("ts"))
        
        # Generate AI response
        user_id = event.get("user")
        response = forge_ai.generate_response(clean_text, user_id)
        
        # Reply in thread
        say(response, thread_ts=event.get("ts"))
        
    except Exception as e:
        logger.error(f"Error handling app mention: {e}")
        say("Sorry, I encountered an error. Please try again.", thread_ts=event.get("ts"))

@app.event("message")
def handle_direct_message(event, say, client, logger):
    """Handle direct messages to the bot"""
    # Only respond to DMs, not channel messages
    if event.get("channel_type") != "im":
        return
    
    # Ignore messages from bots
    if event.get("subtype") == "bot_message":
        return
    
    try:
        text = event.get("text", "")
        user_id = event.get("user")
        
        if not text:
            say("Hi! How can I help you today?")
            return
        
        # Show typing indicator
        say("🤔 Processing your message...")
        
        # Fetch recent conversation history for context
        try:
            history = client.conversations_history(
                channel=event["channel"],
                limit=5,
                oldest=str(float(event["ts"]) - 3600)  # Last hour
            )
            
            context_messages = []
            for msg in history.get("messages", []):
                if msg.get("user") == user_id and "text" in msg:
                    context_messages.append(f"User: {msg['text']}")
                elif msg.get("user") != user_id and "text" in msg:
                    context_messages.append(f"Assistant: {msg['text']}")
            
            context = "\n".join(context_messages[-3:]) if context_messages else None
            
        except Exception as e:
            logger.warning(f"Could not fetch conversation history: {e}")
            context = None
        
        # Generate AI response
        response = forge_ai.generate_response(text, user_id, context or "")
        say(response)
        
    except Exception as e:
        logger.error(f"Error handling direct message: {e}")
        say("Sorry, I encountered an error. Please try again.")

@app.command("/ask-forgeai")
def handle_ask_command(ack, respond, command, logger):
    """Handle the /ask-forgeai slash command"""
    ack()
    
    try:
        text = command.get("text", "").strip()
        user_id = command.get("user_id")
        
        if not text:
            respond("Please provide a question or message after the command. Example: `/ask-forgeai How do I debug Python code?`")
            return
        
        # Generate AI response
        response = forge_ai.generate_response(text, user_id)
        
        # Respond with the AI-generated answer
        respond({
            "response_type": "ephemeral",  # Only visible to the user
            "text": f"🤖 *ForgeAI Response:*\n\n{response}"
        })
        
    except Exception as e:
        logger.error(f"Error handling ask command: {e}")
        respond("Sorry, I encountered an error. Please try again.")

@app.error
def global_error_handler(error, body, logger):
    """Global error handler"""
    logger.error(f"Error: {error}")
    logger.error(f"Request body: {body}")

if __name__ == "__main__":
    # Check required environment variables
    required_vars = ["SLACK_BOT_TOKEN", "SLACK_APP_TOKEN", "OPENAI_API_KEY"]
    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        logger.error("Please check your .env file and ensure all required variables are set.")
        exit(1)
    
    # Start the app
    handler = SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"])
    logger.info("🚀 ForgeAI Slack Bot is starting...")
    handler.start()