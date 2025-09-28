import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

// --- FROM types.ts ---
type AnswerKey = 'A' | 'B' | 'C' | 'D';
type Difficulty = 'Easy' | 'Medium' | 'Hard';
interface TriviaQuestion {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: AnswerKey;
}

// --- FROM components/QuizCard.tsx ---
interface QuizCardProps {
  question: TriviaQuestion;
  onAnswerSelect: (answer: AnswerKey) => void;
  selectedAnswer: AnswerKey | null;
  isAnswered: boolean;
}
const QuizCard: React.FC<QuizCardProps> = ({ question, onAnswerSelect, selectedAnswer, isAnswered }) => {
  const { question: questionText, options, correctAnswer } = question;
  const getButtonClass = (optionKey: AnswerKey): string => {
    const baseClass = "w-full text-left p-4 my-2 rounded-lg border-2 transition-all duration-300 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent";
    
    if (!isAnswered) {
      return `${baseClass} bg-white/20 border-transparent hover:bg-white/30 hover:scale-105`;
    }

    const isCorrect = optionKey === correctAnswer;
    const isSelected = optionKey === selectedAnswer;

    if (isCorrect) {
      // The correct answer button pulses to draw attention to it.
      return `${baseClass} bg-green-500 border-green-400 scale-105 shadow-lg ring-2 ring-white animate-correct-pulse`;
    }
    
    if (isSelected && !isCorrect) {
      // The incorrectly selected answer shakes.
      return `${baseClass} bg-red-500 border-red-400 animate-incorrect-shake`;
    }
    
    // Other incorrect answers fade out.
    return `${baseClass} bg-white/10 border-transparent opacity-60`;
  };
  return (
    <div className="flex flex-col flex-grow">
      <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-center text-shadow">
        {questionText}
      </h2>
      <div className="flex-grow flex flex-col justify-center">
        {(Object.keys(options) as AnswerKey[]).map(key => (
          <button
            key={key}
            onClick={() => onAnswerSelect(key)}
            disabled={isAnswered}
            className={getButtonClass(key)}
          >
            <span className="font-bold mr-3">{key}.</span> {options[key]}
          </button>
        ))}
      </div>
       {isAnswered && (
          <div className="mt-4 text-center text-lg font-bold">
            {selectedAnswer === correctAnswer ? (
              <p className="text-green-300">🎉 Correct! 🎉</p>
            ) : (
              <p className="text-red-300">Sorry, that's not right. The correct answer was {correctAnswer}.</p>
            )}
          </div>
        )}
    </div>
  );
};


// --- FROM components/Scoreboard.tsx ---
interface ScoreboardProps {
  score: number;
}
const Scoreboard: React.FC<ScoreboardProps> = ({ score }) => {
  return (
    <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full text-lg font-bold">
      Score: <span className="text-yellow-300">{score}</span>
    </div>
  );
};

// --- FROM components/LoadingSpinner.tsx ---
const LoadingSpinner: React.FC = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-2xl z-10">
      <div className="w-16 h-16 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
    </div>
  );
};


// --- FROM components/DifficultySelector.tsx ---
interface DifficultySelectorProps {
  onSelectDifficulty: (difficulty: Difficulty) => void;
}
const DifficultySelector: React.FC<DifficultySelectorProps> = ({ onSelectDifficulty }) => {
  const difficulties: Difficulty[] = ['Easy', 'Medium', 'Hard'];
  const colors = {
    Easy: 'bg-green-500 hover:bg-green-600 focus:ring-green-400',
    Medium: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400',
    Hard: 'bg-red-500 hover:bg-red-600 focus:ring-red-400',
  }
  return (
    <div className="text-center flex flex-col items-center justify-center h-full animate-fade-in">
      <h2 className="text-3xl font-bold mb-6">Select a Difficulty</h2>
      <div className="flex flex-col md:flex-row gap-4 w-full max-w-md">
        {difficulties.map((level) => (
          <button
            key={level}
            onClick={() => onSelectDifficulty(level)}
            className={`w-full px-8 py-4 text-white font-bold rounded-full shadow-lg transform transition-all duration-200 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-transparent ${colors[level]}`}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
};


/**
 * Generates a trivia question by calling the Google Gemini API directly from the client.
 */
async function generateTriviaQuestion(difficulty: Difficulty): Promise<TriviaQuestion> {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API key is not configured. This app cannot function without it.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const triviaQuestionSchema = {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING, description: "The trivia question text." },
        options: {
          type: Type.OBJECT,
          properties: {
            A: { type: Type.STRING },
            B: { type: Type.STRING },
            C: { type: Type.STRING },
            D: { type: Type.STRING },
          },
          required: ["A", "B", "C", "D"]
        },
        correctAnswer: { type: Type.STRING, description: "Must be 'A', 'B', 'C', or 'D'." }
      },
      required: ["question", "options", "correctAnswer"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a random, ${difficulty} level, challenging but fun trivia question with four multiple-choice options (A, B, C, D) and specify the correct answer key. The topic can be anything from science, history, pop culture, or geography.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: triviaQuestionSchema,
      },
    });

    const jsonText = response.text.trim();
    const questionData = JSON.parse(jsonText);

    if (
      typeof questionData.question === 'string' &&
      typeof questionData.options === 'object' &&
      questionData.options.A &&
      questionData.options.B &&
      questionData.options.C &&
      questionData.options.D &&
      ['A', 'B', 'C', 'D'].includes(questionData.correctAnswer)
    ) {
      return questionData as TriviaQuestion;
    } else {
      throw new Error("The AI returned data in an unexpected format. Please try again.");
    }
  } catch (error) {
    console.error("Error generating trivia question from Gemini API:", error);
    // Create user-friendly error messages
    if (error instanceof Error) {
        if (error.message.includes('API key not valid')) {
            throw new Error('The API key is invalid. Please check your configuration.');
        }
        if (error.message.includes('Quota')) {
            throw new Error('API quota exceeded. Please try again later or check your billing.');
        }
        // Re-throw other meaningful errors
        throw error;
    }
    
    // Generic fallback
    throw new Error('An unexpected error occurred while generating the question.');
  }
}

const App: React.FC = () => {
  const [question, setQuestion] = useState<TriviaQuestion | null>(null);
  const [score, setScore] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerKey | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);

  const fetchNewQuestion = useCallback(async () => {
    if (!difficulty) return;

    setIsLoading(true);
    setError(null);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setQuestion(null);
    try {
      const newQuestion = await generateTriviaQuestion(difficulty);
      setQuestion(newQuestion);
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'An unknown error occurred. Please try again.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [difficulty]);

  useEffect(() => {
    if (difficulty) {
      fetchNewQuestion();
    }
  }, [difficulty, fetchNewQuestion]);

  const handleAnswerSelect = (answer: AnswerKey) => {
    if (isAnswered) return;

    setSelectedAnswer(answer);
    setIsAnswered(true);
    if (answer === question?.correctAnswer) {
      setScore(prevScore => prevScore + 1);
    }
  };
  
  const handleDifficultySelect = (selectedDifficulty: Difficulty) => {
    setScore(0);
    setDifficulty(selectedDifficulty);
  };

  const renderContent = () => {
    if (!difficulty) {
      return <DifficultySelector onSelectDifficulty={handleDifficultySelect} />;
    }
    
    if (isLoading && !question) {
      return <LoadingSpinner />;
    }

    if (error) {
      return (
        <div className="text-center text-red-300 bg-red-900/50 p-6 rounded-lg animate-fade-in flex flex-col items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center bg-red-500/50 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="font-bold text-lg">Oops! Something went wrong.</p>
          <p className="text-base text-red-200">{error}</p>
          <button
            onClick={fetchNewQuestion}
            disabled={isLoading}
            className="mt-2 px-6 py-2 bg-white text-indigo-600 font-bold rounded-full shadow-md hover:bg-indigo-100 transform transition-transform duration-200 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Retrying...' : 'Try Again'}
          </button>
        </div>
      );
    }

    if (question) {
      return (
        <QuizCard
          question={question}
          onAnswerSelect={handleAnswerSelect}
          selectedAnswer={selectedAnswer}
          isAnswered={isAnswered}
        />
      );
    }

    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-4 font-sans text-white">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">AI Trivia Quiz</h1>
          <p className="text-indigo-200 mt-2 text-lg">Powered by Gemini AI</p>
        </header>

        <main className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 md:p-8 relative min-h-[400px] flex flex-col justify-between">
          {isLoading && question && <LoadingSpinner />}
          {difficulty && <Scoreboard score={score} />}
          
          <div className="flex-grow flex flex-col justify-center">
            {renderContent()}
          </div>
          
          {difficulty && !error && (
            <div className="mt-6 text-center">
              <button
                onClick={fetchNewQuestion}
                disabled={isLoading}
                className="w-full md:w-auto px-8 py-3 bg-white text-indigo-600 font-bold rounded-full shadow-lg hover:bg-indigo-100 transform transition-transform duration-200 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
              >
                {isLoading ? 'Generating...' : 'Next Question'}
              </button>
            </div>
          )}
        </main>
        <footer className="text-center mt-8 text-indigo-200/80 text-sm">
          <div className="flex items-center justify-center">
            {difficulty && (
              <button onClick={() => setDifficulty(null)} className="underline hover:text-white transition-colors">
                Change Difficulty
              </button>
            )}
          </div>
          <p className="mt-2">&copy; {new Date().getFullYear()} AI Trivia Quiz. Endless fun, endless knowledge.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;