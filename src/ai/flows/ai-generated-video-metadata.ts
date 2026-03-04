
'use server';
/**
 * @fileOverview This file implements a Genkit flow for generating video titles and descriptions.
 *
 * - generateVideoMetadata - A function that handles the generation of video metadata.
 * - AIGeneratedVideoMetadataInput - The input type for the generateVideoMetadata function.
 * - AIGeneratedVideoMetadataOutput - The return type for the generateVideoMetadata function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const AIGeneratedVideoMetadataInputSchema = z.object({
  videoSummary: z.string().optional().describe('A summary or transcript of the video content.'),
  keywords: z.array(z.string()).optional().describe('Keywords related to the video content.'),
});
export type AIGeneratedVideoMetadataInput = z.infer<typeof AIGeneratedVideoMetadataInputSchema>;

const AIGeneratedVideoMetadataOutputSchema = z.object({
  titles: z.array(z.string()).describe('An array of suggested video titles.'),
  descriptions: z.array(z.string()).describe('An array of suggested video descriptions.'),
});
export type AIGeneratedVideoMetadataOutput = z.infer<typeof AIGeneratedVideoMetadataOutputSchema>;

export async function generateVideoMetadata(
  input: AIGeneratedVideoMetadataInput
): Promise<AIGeneratedVideoMetadataOutput> {
  return aiGeneratedVideoMetadataFlow(input);
}

const aiGeneratedVideoMetadataPrompt = ai.definePrompt({
  name: 'aiGeneratedVideoMetadataPrompt',
  model: googleAI.model('gemini-1.5-flash'),
  input: { schema: AIGeneratedVideoMetadataInputSchema },
  output: { schema: AIGeneratedVideoMetadataOutputSchema },
  prompt: `You are an expert YouTube content strategist. Generate several compelling title suggestions and description suggestions based on the content summary and keywords provided.

{{#if videoSummary}}
Video Content Summary:
{{{videoSummary}}}
{{/if}}

{{#if keywords}}
Key Themes/Keywords:
{{#each keywords}}
- {{{this}}}
{{/each}}
{{/if}}`,
});

const aiGeneratedVideoMetadataFlow = ai.defineFlow(
  {
    name: 'aiGeneratedVideoMetadataFlow',
    inputSchema: AIGeneratedVideoMetadataInputSchema,
    outputSchema: AIGeneratedVideoMetadataOutputSchema,
  },
  async (input) => {
    const { output } = await aiGeneratedVideoMetadataPrompt(input);
    if (!output) {
      throw new Error('Failed to generate video metadata.');
    }
    return output;
  }
);
