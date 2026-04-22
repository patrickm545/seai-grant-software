import { openai } from './openai';
import type { LeadFormInput, EligibilityAnalysis } from './types';
import { runRulesBasedEligibility } from './eligibility';

export async function generateEligibilityAnalysis(input: LeadFormInput): Promise<EligibilityAnalysis> {
  const fallback = runRulesBasedEligibility(input);

  if (!openai) return fallback;

  const prompt = `You are reviewing a homeowner lead for an Irish SEAI solar electricity grant workflow.
Return strict JSON with keys: likelyEligible(boolean), confidence(number 0-1), missingItems(string[]), risks(string[]), summary(string), nextStep(string), leadTemperature("HOT"|"WARM"|"COLD").
Make the summary homeowner-friendly and the nextStep installer-friendly.
Lead: ${JSON.stringify(input)}`;

  try {
    const response = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: prompt
    });

    const text = response.output_text.trim();
    const parsed = JSON.parse(text) as EligibilityAnalysis;
    return {
      ...fallback,
      ...parsed,
      leadTemperature: parsed.leadTemperature ?? fallback.leadTemperature
    };
  } catch {
    return fallback;
  }
}

export async function extractDocumentFields(args: {
  fileName: string;
  mimeType: string;
  textContent: string;
}) {
  const fallback = {
    fields: {},
    summary: 'No AI extraction available. Store raw extracted text and review manually.'
  };

  if (!openai) return fallback;

  const prompt = `Extract homeowner and property fields from this uploaded document. Return strict JSON with keys fields(object) and summary(string).\nFile: ${args.fileName}\nMime: ${args.mimeType}\nText:\n${args.textContent}`;

  try {
    const response = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: prompt
    });
    return JSON.parse(response.output_text.trim());
  } catch {
    return fallback;
  }
}
