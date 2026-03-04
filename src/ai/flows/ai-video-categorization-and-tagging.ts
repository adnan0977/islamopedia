
'use server';
/**
 * @fileOverview An AI agent for automatically suggesting relevant categories and tags for videos.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiVideoCategorizationAndTaggingInputSchema = z.object({
  videoTitle: z.string().describe('The title of the video.'),
  videoDescription: z.string().describe('A detailed description of the video content.'),
  additionalKeywords: z.array(z.string()).optional().describe('Any additional keywords or themes related to the video content.'),
});
export type AiVideoCategorizationAndTaggingInput = z.infer<typeof AiVideoCategorizationAndTaggingInputSchema>;

const AiVideoCategorizationAndTaggingOutputSchema = z.object({
  categories: z.array(z.string()).describe('A list of suggested categories for the video.'),
  tags: z.array(z.string()).describe('A list of suggested tags for the video.'),
});
export type AiVideoCategorizationAndTaggingOutput = z.infer<typeof AiVideoCategorizationAndTaggingOutputSchema>;

export async function aiVideoCategorizationAndTagging(
  input: AiVideoCategorizationAndTaggingInput
): Promise<AiVideoCategorizationAndTaggingOutput> {
  return aiVideoCategorizationAndTaggingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeVideoPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: {schema: AiVideoCategorizationAndTaggingInputSchema},
  output: {schema: AiVideoCategorizationAndTaggingOutputSchema},
  prompt: `You are an expert video content analyst. suggest relevant categories and tags for a video based on its title and description.

Video Title: {{{videoTitle}}}
Video Description: {{{videoDescription}}}

{{#if additionalKeywords}}
Additional Keywords: {{#each additionalKeywords}}{{{this}}}{{/each}}
{{/if}}`,
});

const aiVideoCategorizationAndTaggingFlow = ai.defineFlow(
  {
    name: 'aiVideoCategorizationAndTaggingFlow',
    inputSchema: AiVideoCategorizationAndTaggingInputSchema,
    outputSchema: AiVideoCategorizationAndTaggingOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to categorize video.');
    }
    return output;
  }
);
