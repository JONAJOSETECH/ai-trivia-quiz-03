import React, { useState, useEffect, useCallback } from 'react';
import type { TriviaQuestion, AnswerKey, Difficulty } from './types';
import QuizCard from './components/QuizCard';
import Scoreboard from './components/Scoreboard';
import LoadingSpinner from './components/LoadingSpinner';
import DifficultySelector from './components/DifficultySelector';
import { playCorrectSound, playIncorrectSound, playClickSound } from './utils/soundEffects';

/**
 * Fetches a trivia question from the secure Vercel serverless function.
 * This function's logic was moved here to resolve a Vercel build issue.
 * @param difficulty The desired difficulty of the question.
 * @returns A promise that resolves to a TriviaQuestion object.
 */
async function generateTriviaQuestion(difficulty: Difficulty): Promise<TriviaQuestion> {
  try {
    const response = await fetch(`/api/generate-trivia?difficulty=${difficulty}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: 'Failed to fetch the question. The server might be unavailable.' 
      }));
      throw new Error(errorData.error || `Server error: ${response.statusText}`);
    }

    const questionData: TriviaQuestion = await response.json();

    if (
      typeof questionData.question === 'string' &&
      typeof questionData.options === 'object' &&
      questionData.options.A &&
      questionData.options.B &&
      questionData.options.C &&
      questionData.options.D &&
      ['A', 'B', 'C', 'D'].includes(questionData.correctAnswer)
    ) {
      return questionData;
    } else {
      throw new Error("The server returned data in an unexpected format.");
    }

  } catch (error) {
    console.error("Error fetching trivia question from API:", error);
    throw error;
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
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const fetchNewQuestion = useCallback(async () => {
    if (!isMuted) playClickSound();
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
      setError('Failed to generate a new question. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [difficulty, isMuted]);

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
      if (!isMuted) playCorrectSound();
    } else {
      if (!isMuted) playIncorrectSound();
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
    
    if (isLoading) {
      return <LoadingSpinner />;
    }

    if (error) {
      return (
        <div className="text-center text-red-300 bg-red-900/50 p-4 rounded-lg">
          <p className="font-semibold">An Error Occurred</p>
          <p>{error}</p>
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

  const MuteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );

  const UnmuteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9l4 4m0-4l-4 4" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-4 font-sans text-white">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">AI Trivia Quiz</h1>
          <p className="text-indigo-200 mt-2 text-lg">Powered by Gemini AI</p>
        </header>

        <main className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 md:p-8 relative min-h-[400px] flex flex-col justify-between">
          {difficulty && <Scoreboard score={score} />}
          
          <div className="flex-grow flex flex-col justify-center">
            {renderContent()}
          </div>
          
          {difficulty && (
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
          <div className="flex items-center justify-center space-x-4">
            {difficulty && (
              <button onClick={() => setDifficulty(null)} className="underline hover:text-white transition-colors">
                Change Difficulty
              </button>
            )}
             <button
              onClick={() => setIsMuted(prev => !prev)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
            >
              {isMuted ? <UnmuteIcon /> : <MuteIcon />}
            </button>
          </div>
          <p className="mt-2">&copy; {new Date().getFullYear()} AI Trivia Quiz. Endless fun, endless knowledge.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;