import { type JobContext, ServerOptions, cli, defineAgent, voice } from '@livekit/agents';
import * as anam from '@livekit/agents-plugin-anam';
import * as openai from '@livekit/agents-plugin-openai';
import { BackgroundVoiceCancellation } from '@livekit/noise-cancellation-node';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: '.env.local' });

class Assistant extends voice.Agent {
  constructor() {
    super({
      instructions: `You are a helpful voice AI assistant.
      You eagerly assist users with their questions by providing information from your extensive knowledge.
      Your responses are concise, to the point, and without any complex formatting or punctuation including emojis, asterisks, or other symbols.
      You are curious, friendly, and have a sense of humor.`,
    });
  }
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    // Join the room and connect to the user
    await ctx.connect();
    console.log(`Starting agent session in room: ${ctx.room.name}`);

    // Set up a voice AI session using OpenAI Realtime model
    const session = new voice.AgentSession({
      // Using OpenAI Realtime API for voice AI
      // See https://docs.livekit.io/agents/models/realtime/
      llm: new openai.realtime.RealtimeModel({ voice: 'alloy' }),
    });

    // Start the session, which initializes the voice pipeline and warms up the models
    await session.start({
      agent: new Assistant(),
      room: ctx.room,
      inputOptions: {
        // LiveKit Cloud enhanced noise cancellation
        // - If self-hosting, omit this parameter
        // - For telephony applications, use `BackgroundVoiceCancellationTelephony` for best results
        noiseCancellation: BackgroundVoiceCancellation(),
      },
    });

    // Start the Anam avatar session
    const avatarId = process.env.ANAM_AVATAR_ID;
    if (!avatarId) {
      console.warn(
        'ANAM_AVATAR_ID is not set. Avatar session will not start. Set ANAM_AVATAR_ID in your .env.local file.',
      );
      return;
    }

    const avatarSession = new anam.AvatarSession({
      personaConfig: {
        name: 'Cara',
        avatarId,
      },
      // ANAM_API_KEY and ANAM_API_URL are read from environment by default
    });

    await avatarSession.start(session, ctx.room);

    console.log('Agent and avatar session started');
  },
});

cli.runApp(new ServerOptions({ agent: fileURLToPath(import.meta.url) }));
