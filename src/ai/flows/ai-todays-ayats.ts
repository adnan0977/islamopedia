
'use server';
/**
 * @fileOverview This file implements a Genkit flow that generates a daily selection of important Quranic verses
 * along with their Arabic text, English translation, and a reason for their importance, chosen by an AI.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const AiTodaysAyatsInputSchema = z.object({
  currentDate: z
    .string()
    .describe('The current date in YYYY-MM-DD format.')
    .optional(),
});
export type AiTodaysAyatsInput = z.infer<typeof AiTodaysAyatsInputSchema>;

const AyatSchema = z.object({
  surahNumber: z.number().describe('The surah number of the ayat.'),
  ayatNumber: z.number().describe('The ayat number within the surah.'),
  text: z.string().describe('The Arabic text of the ayat.'),
  translation: z.string().describe('An English translation of the ayat.'),
  importanceReason: z.string().describe('AI reason for importance.'),
});

const AiTodaysAyatsOutputSchema = z.object({
  ayats: z.array(AyatSchema).describe('A list of important Quranic verses for the day.'),
});
export type AiTodaysAyatsOutput = z.infer<typeof AiTodaysAyatsOutputSchema>;

export async function aiTodaysAyats(input: AiTodaysAyatsInput): Promise<AiTodaysAyatsOutput> {
  return aiTodaysAyatsFlow(input);
}

const aiTodaysAyatsPrompt = ai.definePrompt({
  name: 'aiTodaysAyatsPrompt',
  model: googleAI.model('gemini-1.5-flash'),
  input: {schema: AiTodaysAyatsInputSchema},
  output: {schema: AiTodaysAyatsOutputSchema},
  prompt: `You are an AI assistant specialized in Islamic knowledge. Select 3-5 Quranic verses for reflection today.
Date: {{{currentDate}}}.
Provide Arabic text, translation, and a reason for daily reflection.`,
});

const aiTodaysAyatsFlow = ai.defineFlow(
  {
    name: 'aiTodaysAyatsFlow',
    inputSchema: AiTodaysAyatsInputSchema,
    outputSchema: AiTodaysAyatsOutputSchema,
  },
  async input => {
    const {output} = await aiTodaysAyatsPrompt(input);
    if (!output) {
      throw new Error('Failed to generate today\'s ayats.');
    }
    return output;
  }
);
