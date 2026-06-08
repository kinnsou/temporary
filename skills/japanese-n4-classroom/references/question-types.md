# Japanese N4 Question Types

Design around Japanese learning behavior, not the old English quiz categories.

## Default Quiz Mix

- **Word meaning**: Show kana as primary, kanji as secondary, ask for Chinese meaning. Good for first exposure.
- **Reverse recall**: Show Chinese meaning and a short hint, ask for the correct Japanese reading/form. Keep choices close but fair.
- **Particle fill-in**: Hide one particle in a natural sentence. Explain why the answer works after submission.
- **Conjugation**: Ask for one verb/adjective transformation: ます形, 辞書形, て形, た形, ない形, or polite/plain conversion.
- **Sentence chunks**: Reorder chunks such as `きのう / 友だちと / 映画を / 見ました`; never split into individual kana/characters.
- **Grammar pattern**: Choose the best N4 pattern for the situation, for example `〜ことがある`, `〜ようになる`, `〜てしまう`, `〜ながら`.
- **Listening/readback**: Use `speechSynthesis` with `ja-JP` text; answer should not depend on perfect device voice availability.

## Item Selection Heuristics

- Daily new N4 items should appear first in quiz and flashcards.
- Particle items should not be converted into sentence-order questions unless they also define explicit `chunks`.
- Conjugation questions need explicit acceptable forms. Do not infer all Japanese conjugations from strings unless the build script has a tested conjugator.
- Grammar questions should include a Chinese situation prompt plus a Japanese example after answering.
- Distractors should be same category: particles with particles, verb forms with verb forms, grammar patterns with grammar patterns.

## Feedback Pattern

After answering, show:

- Correct answer.
- Chinese meaning.
- Example sentence with kana support.
- One short explanation for particles/grammar/conjugation.

Keep the explanation child-friendly and short. Avoid grammar textbook paragraphs inside the app.

## Recommended Early N4 Scope

Start small and prove the loop before adding hundreds of items:

- 40-60 N4 vocabulary/phrase items.
- 20 particle sentence items.
- 20 conjugation items.
- 20 grammar-pattern items.
- Daily release size: 5 new N4 items, unless Mark changes it.
