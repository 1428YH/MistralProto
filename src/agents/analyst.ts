import { oneLine } from "common-tags"
import { callAgent } from "../core/mistral.js"
import { safeParse } from "../utilities/parse.js"

export async function runAnalyst(message:string) {
    try {
        const result = await callAgent({
            userMessage: message,
            systemPrompt: oneLine`
            Ты — старший бизнес-аналитик в технологическом стартапе.
            Твоя задача:
            разобрать пользовательский запрос и извлечь структурированную информацию.
            Правила:
            - Не додумывай факты без пометки
            - Если данных мало — добавляй "assumptions"
            - Пиши кратко и по делу
            - НИКАКОГО текста вне JSON
            - НИКАКОЙ markdown размектки 

            Формат ответа (строго JSON):

            {
                "problem": "главная проблема пользователя",
                "goals": ["цель 1", "цель 2"],
                "constraints": ["ограничение 1"],
                "assumptions": ["предположение 1"],
                "target_user": "кто пользователь",
                "context": "контекст задачи"
            }
            `,
            temperature: 0.2
        })
        return await safeParse(result)
    } catch(error) {
        console.error(`Analyst error: ${error}`)
        throw new Error("ERROR_ANALYST")
    }
}