
'use server';
/**
 * @fileOverview This file implements a Genkit flow that generates a daily selection of important Quranic verses
 * along with their Arabic text, English translation, and a reason for their importance, chosen by an AI.
 *
 * - aiTodaysAyats - A function to get the AI-selected important Quranic verses for the day.
 * - AiTodaysAyatsInput - The input type for the aiTodaysAyats function.
 * - AiTodaysAyatsOutput - The return type for the aiTodaysAyats function.
 */

import {ai} from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import {z} from 'genkit';

const AiTodaysAyatsInputSchema = z.object({
  currentDate: z
    .string()
    .describe(
      'The current date in YYYY-MM-DD format. The AI can use this for context when selecting verses.'
    )
    .optional(),
});
export type AiTodaysAyatsInput = z.infer<typeof AiTodaysAyatsInputSchema>;

const AyatSchema = z.object({
  surahNumber: z.number().describe('The surah number (chapter) of the ayat.'),
  ayatNumber: z.number().describe('The ayat number (verse) within the surah.'),
  text: z.string().describe('The Arabic text of the ayat.'),
  translation: z.string().describe('An English translation of the ayat.'),
  importanceReason: z
    .string()
    .describe(
      'A brief explanation from the AI why this ayat is considered important for the day.'
    ),
});

const AiTodaysAyatsOutputSchema = z.object({
  ayats: z
    .array(AyatSchema)
    .describe('A list of important Quranic verses for the day.'),
});
export type AiTodaysAyatsOutput = z.infer<typeof AiTodaysAyatsOutputSchema>;

export async function aiTodaysAyats(
  input: AiTodaysAyatsInput
): Promise<AiTodaysAyatsOutput> {
  return aiTodaysAyatsFlow(input);
}

const aiTodaysAyatsPrompt = ai.definePrompt({
  name: 'aiTodaysAyatsPrompt',
  model: googleAI.model('gemini-1.5-flash'),
  input: {schema: AiTodaysAyatsInputSchema},
  output: {schema: AiTodaysAyatsOutputSchema},
  prompt: `You are an AI assistant specialized in Islamic knowledge and the Quran. Your task is to select 3-5 Quranic verses that are particularly important or reflective for a user to contemplate today.

For each verse, provide:
1.  The Surah number.
2.  The Ayat number.
3.  The Arabic text of the verse.
4.  A concise English translation.
5.  A brief, insightful reason why this verse is important for daily reflection, especially considering the general challenges and opportunities people face today.

Assume the current date is {{{currentDate}}} (if provided), and use this as a general context for selecting universally relevant verses, not based on any specific real-world events. If no date is provided, just pick universally important verses.

The output must be a JSON object containing an array of these verse objects. Do not include any other text besides the JSON.`,
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
