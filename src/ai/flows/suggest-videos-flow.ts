
'use server';
/**
 * @fileOverview This file implements a Genkit flow for suggesting related videos.
 *
 * - suggestVideos - A function that handles the video suggestion process.
 * - SuggestVideosInput - The input type for the suggestVideos function.
 * - SuggestVideosOutput - The return type for the suggestVideos function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const VideoMinimalSchema = z.object({
  id: z.string(),
  title: z.string(),
  speakerIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

const SuggestVideosInputSchema = z.object({
  currentVideo: VideoMinimalSchema,
  availableVideos: z.array(VideoMinimalSchema),
});
export type SuggestVideosInput = z.infer<typeof SuggestVideosInputSchema>;

const SuggestVideosOutputSchema = z.object({
  suggestedVideoIds: z.array(z.string()).describe('An array of video IDs suggested as related.'),
  reasoning: z.string().describe('AI reasoning for these suggestions.'),
});
export type SuggestVideosOutput = z.infer<typeof SuggestVideosOutputSchema>;

export async function suggestVideos(
  input: SuggestVideosInput
): Promise<SuggestVideosOutput> {
  return suggestVideosFlow(input);
}

const suggestVideosPrompt = ai.definePrompt({
  name: 'suggestVideosPrompt',
  model: googleAI.model('gemini-1.5-flash'),
  input: { schema: SuggestVideosInputSchema },
  output: { schema: SuggestVideosOutputSchema },
  prompt: `You are a YouTube recommendation algorithm. Your goal is to suggest relevant videos based on the video a user is currently watching.

Current Video:
- Title: {{{currentVideo.title}}}
- Scholars: {{#each currentVideo.speakerIds}}{{{this}}}, {{/each}}
- Tags: {{#each currentVideo.tags}}{{{this}}}, {{/each}}

Candidate Videos:
{{#each availableVideos}}
- ID: {{{this.id}}} | Title: {{{this.title}}} | Scholars: {{#each this.speakerIds}}{{{this}}}, {{/each}}
{{/each}}

Select the 5 most relevant videos. Prioritize videos by the same scholar or with similar themes/tags.`,
});

const suggestVideosFlow = ai.defineFlow(
  {
    name: 'suggestVideosFlow',
    inputSchema: SuggestVideosInputSchema,
    outputSchema: SuggestVideosOutputSchema,
  },
  async (input) => {
    const { output } = await suggestVideosPrompt(input);
    if (!output) {
      throw new Error('Failed to generate video suggestions.');
    }
    return output;
  }
);
