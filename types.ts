
export type AnswerKey = 'A' | 'B' | 'C' | 'D';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface TriviaQuestion {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: AnswerKey;
}
