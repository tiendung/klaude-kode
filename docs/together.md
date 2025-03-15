curl -X POST "https://api.together.xyz/v1/chat/completions" \
  -H "Authorization: Bearer $TOGETHER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-ai/DeepSeek-R1",
    "messages": [
        {
                "role": "user",
                "content": "3 + 3 = ?"
        },
        {
                "role": "assistant",
                "content": "<think>\nAlright, let‛s tackle this problem: 3 + 3. Hmm, okay, so addition. I remember that addition is combining two numbers to get a total sum. Let me think. If I have 3 apples and someone gives me 3 more apples, how many apples do I have in total?\n\nMaybe I can count on my fingers. Let‛s see, hold up three fingers on one hand: 1, 2, 3. Then three more on the other hand: 4, 5, 6. So that‛s six fingers altogether. So 3 plus 3 should be 6?\n\nWait, but let me make sure. Maybe I can visualize it. If I have three circles: ○○○ and then add another three circles: ○○○, putting them together, how many circles are there? Let‛s count: 1, 2, 3, 4, 5, 6. Yep, six circles. That checks out.\n\nAlternatively, using a number line. Start at 3, then move 3 steps forward. So from 0, 1, 2, 3. Starting at 3, adding 3 would be: 3 → 4 (1), 5 (2), 6 (3). So landing on 6. That seems right.\n\nAnother way, using basic addition facts. I know that 2 + 2 is 4, and 3 is one more than 2. So if 2 + 2 = 4, then 3 + 3 would be 4 + 2 = 6? Wait, no, maybe that‛s complicating it. Let me think. If each 3 is one more than 2, then adding two 3s would be like adding two 2s and then adding 2 more. So 2 + 2 = 4, then 4 + 2 = 6. That works.\n\nOr maybe breaking it down: 3 + 3 = (3 + 2) + 1 = 5 + 1 = 6. But that seems unnecessary. Maybe simpler to just remember that 3 + 3 is a double. Doubles in addition are usually numbers added to themselves. So 3 doubled is 6. Yeah, that‛s another way to see it.\n\nLet me check with subtraction. If 6 - 3 should be 3, right? So if I take away 3 from"
        }
],
    "max_tokens": 512,
    "temperature": 0.6,
    "top_p": 0.95,
    "top_k": 50,
    "repetition_penalty": 1,
    "stop": ["<｜end▁of▁sentence｜>"],
    "stream": true
  }'