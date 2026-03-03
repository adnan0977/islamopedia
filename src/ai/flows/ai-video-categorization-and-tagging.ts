'use server';
/**
 * @fileOverview An AI agent for automatically suggesting relevant categories and tags for videos.
 *
 * - aiVideoCategorizationAndTagging - A function that handles the video categorization and tagging process.
 * - AiVideoCategorizationAndTaggingInput - The input type for the aiVideoCategorizationAndTagging function.
 * - AiVideoCategorizationAndTaggingOutput - The return type for the aiVideoCategorizationAndTagging function.
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
  categories: z.array(z.string()).describe('A list of suggested categories for the video, e.g., "Education", "Vlogs", "Gaming", "Music", "Tutorials".'),
  tags: z.array(z.string()).describe('A list of suggested tags for the video, e.g., "programming", "tutorial", "javascript", "webdev", "travel", "vlog".'),
});
export type AiVideoCategorizationAndTaggingOutput = z.infer<typeof AiVideoCategorizationAndTaggingOutputSchema>;

export async function aiVideoCategorizationAndTagging(
  input: AiVideoCategorizationAndTaggingInput
): Promise<AiVideoCategorizationAndTaggingOutput> {
  return aiVideoCategorizationAndTaggingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeVideoPrompt',
  input: {schema: AiVideoCategorizationAndTaggingInputSchema},
  output: {schema: AiVideoCategorizationAndTaggingOutputSchema},
  prompt: `You are an expert video content analyst. Your task is to suggest relevant categories and tags for a video based on its title, description, and any provided keywords.

Video Title: {{{videoTitle}}}
Video Description: {{{videoDescription}}}

{{#if additionalKeywords}}
Additional Keywords: {{#each additionalKeywords}}{{{this}}}{{/each}}
{{/if}}

Please provide a list of suitable categories and tags that will make the video easily searchable and discoverable. Focus on keywords and phrases that accurately represent the video's content and target audience.`,
});

const aiVideoCategorizationAndTaggingFlow = ai.defineFlow(
  {
    name: 'aiVideoCategorizationAndTaggingFlow',
    inputSchema: AiVideoCategorizationAndTaggingInputSchema,
    outputSchema: AiVideoCategorizationAndTaggingOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
