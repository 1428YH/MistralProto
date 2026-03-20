import { oneLine } from "common-tags";
import { callAgent } from "../core/mistral.js";
import { safeParse } from "../utilities/parse.js";

export async function runHypothesizer(analyst: any) {
    try {
        const result = await callAgent({
            userMessage: JSON.stringify(analyst), 
            systemPrompt: oneLine`
            Ты — старший бизнес-аналитик в технологическом стартапе.

            Твоя задача:
            разобрать пользовательский запрос и извлечь структурированную информацию.

            Правила:
            - Не додумывай факты без пометки
            - Решения должны отличаться подходом
            - Учитывай ограничения из анализа
            - Баланс: реалистичность + креатив
            - НИКАКОГО текста вне JSON
            - НИКАКОЙ markdown размектки 

            Формат ответа (строго JSON):
            {
            "solutions": [
                {
                "name": "короткое название",
                "description": "идея решения",
                "approach": "как это работает",
                "pros": ["плюс"],
                "cons": ["минус"],
                "complexity": "low | medium | high"
                }
            ]
            }
            `,
            temperature: 0.4
        });

        return await safeParse(result);
    } catch(error) {
        console.error(`Hypothesizer error: ${error}`)
        throw new Error("ERROR_HYPOTHESIZER")
    }
}