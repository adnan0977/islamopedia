'use server';
/**
 * @fileOverview A Genkit flow to provide historical context and revelation stories for Quranic Surahs.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const SurahContextInputSchema = z.object({
  surahNumber: z.number().describe('The number of the surah (1-114).'),
  surahName: z.string().describe('The name of the surah in English.'),
});
export type SurahContextInput = z.infer<typeof SurahContextInputSchema>;

const SurahContextOutputSchema = z.object({
  revelationStory: z.string().describe('A detailed narrative of the context and story behind the revelation of this surah (Asbab al-Nuzul).'),
  keyThemes: z.array(z.string()).describe('A list of primary themes discussed in this surah.'),
  historicalPeriod: z.string().describe('The specific historical period or event during which this surah was revealed.'),
});
export type SurahContextOutput = z.infer<typeof SurahContextOutputSchema>;

export async function getSurahContext(input: SurahContextInput): Promise<SurahContextOutput> {
  return quranContextFlow(input);
}

const quranContextPrompt = ai.definePrompt({
  name: 'quranContextPrompt',
  model: googleAI.model('gemini-1.5-flash'),
  input: { schema: SurahContextInputSchema },
  output: { schema: SurahContextOutputSchema },
  prompt: `You are an expert Islamic historian and scholar of Quranic sciences (Ulum al-Quran). 
Provide the historical context and the story behind the revelation (Asbab al-Nuzul) for Surah {{{surahName}}} (Surah number {{{surahNumber}}}).

Focus on:
1. The circumstances in the life of Prophet Muhammad (PBUH) or the Sahaba that led to the revelation.
2. The specific challenges or questions the surah addressed.
3. The spiritual significance of the timing of this revelation.

Ensure the narrative is engaging, respectful, and academically sound.`,
});

const quranContextFlow = ai.defineFlow(
  {
    name: 'quranContextFlow',
    inputSchema: SurahContextInputSchema,
    outputSchema: SurahContextOutputSchema,
  },
  async (input) => {
    const { output } = await quranContextPrompt(input);
    if (!output) {
      throw new Error('Failed to generate surah context.');
    }
    return output;
  }
);
