// OOP class + constructor implementations for quiz, including User, Question, and Quiz classes
class User {
    constructor(username) {
        this.username = username;
        this.currentScore = 0;
    }

    updateScore(points) {
        this.currentScore += points;
    }
}

class Question {
    constructor(questionText, questionOptions, correctAnswer, difficulty = 'medium') {
        this.questionText = questionText;
        this.options = questionOptions;
        this.correctOptionIndex = correctAnswer;
        this.difficulty = difficulty;
    }

    checkAnswer(userAnswer) {
        return userAnswer === this.correctOptionIndex;
    }

    // scoring based on question difficulty
    getDifficultyValue() {
        const difficultyValues = {
            easy: 100,
            medium: 200,
            hard: 300
        };
        return difficultyValues[this.difficulty];
    }
}

class Quiz {
    constructor(user, quizAPI) {
        this.user = user;
        this.quizAPI = quizAPI;
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.isCompleted = false;
        this.generator = null;
        this.currentQuestion = null;
        
        // bind methods to this instance to give access to class properties
        this.handleStartQuiz = this.handleStartQuiz.bind(this);
        this.handleAnswerSubmit = this.handleAnswerSubmit.bind(this);
    }

    addQuestion(question) {
        this.questions.push(question);
    }

    getCurrentQuestion() {
        return this.questions[this.currentQuestionIndex];
    }

    answerCurrentQuestion(userAnswer) {
        const currentQuestion = this.getCurrentQuestion();
        if (!currentQuestion) return false;
        
        const isCorrect = currentQuestion.checkAnswer(userAnswer);
        return isCorrect;
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            return true;
        } else {
            this.quizCompleted();
            return false;
        }
    }

    // shows user score or 0
    getScore() {
        return this.user ? this.user.currentScore : 0;
    }

    // checks if quiz is complete
    isQuizComplete() {
        return this.currentQuestionIndex >= this.questions.length - 1 || this.isCompleted;
    }

    // resetting quiz state
    resetQuiz() {
        this.currentQuestionIndex = 0;
        this.isCompleted = false;
        this.questions = [];
        this.generator = null;
        this.currentQuestion = null;
    }

    // completing quiz flag
    quizCompleted() {
        this.isCompleted = true;
    }
    
    initializeQuiz(questions) {
        // immediately excecutes setupQuestions with 'this' context to refer to the Quiz instance
        this.setupQuestions.call(this, questions);
    }

    updateScoreMultiplier(points, multiplier) {
        // Using apply to call updateScoreMultiplier with array of arguments
        console.log(`Updating score with points: ${points}, multiplier: ${multiplier}`);
        const totalPoints = points * multiplier;
        console.log(`Adding ${totalPoints} points to user score.`);
        const args = [totalPoints];
        this.user.updateScore.apply(this.user, args);
    }

    // starting quiz
    async handleStartQuiz() {
        try {
            console.log('Starting quiz for user:', this.user.username);
            const questions = await this.quizAPI.fetchQuestions();
            
            if (questions.length === 0) {
                console.error('No questions fetched from API');
                return;
            }
            
            this.initializeQuiz(questions);
            this.startQuestionFlow();
        } catch (error) {
            console.error('Error starting quiz:', error);
        }
    }
    
    // setting up questions in the quiz
    setupQuestions(questions) {
        questions.forEach(question => this.addQuestion(question));
        this.generator = questionGenerator(this.questions, this.user, this);
    }
    
    // starting the question flow using the generator
    startQuestionFlow() {
        const firstQuestion = this.generator.next();
        if (!firstQuestion.done) {
            this.currentQuestion = firstQuestion.value;
            this.displayQuestion(this.currentQuestion);
        }
    }
    
    // handling user answer submission when they select an option
    handleAnswerSubmit(userAnswer) {
        if (this.generator && this.currentQuestion) {
            const nextQuestion = this.generator.next(userAnswer);
            
            if (!nextQuestion.done) {
                this.currentQuestion = nextQuestion.value;
                this.displayQuestion(this.currentQuestion);
            } else {
                this.endQuiz(nextQuestion.value); // Final score
            }
        }
    }
    
    displayQuestion(question) {
        // Logging question details for debugging
        console.log('Question:', question.questionText);
        console.log('Difficulty:', question.difficulty);
        console.log('Options:', question.options);
        console.log('Correct Option Index:', question.correctOptionIndex);
        console.log('Current Score:', this.user.currentScore);
        
        // HTML question display
        const questionElement = document.querySelector('.question');
        if (questionElement) {
            questionElement.innerHTML = `
                <h2>${question.questionText}</h2>
                <div class="options">
                    ${question.options.map((option, index) =>
                        `<button class="main-btns option-btn" data-index="${index}">${option}</button>`
                    ).join('')}
                </div>
                <p class="score-display">Current Score: <strong>${this.user.currentScore}</strong></p>
            `;
            
            // option button event listeners
            const optionButtons = questionElement.querySelectorAll('.option-btn');
            optionButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const selectedIndex = parseInt(e.target.dataset.index);
                    this.handleAnswerSubmit(selectedIndex);
                });
            });
        }
    }
    
    endQuiz(finalScore) {
        this.quizCompleted(); // mark quiz as completed
        
        // Display final results in HTML
        const questionElement = document.querySelector('.question');
        if (questionElement) {
            questionElement.innerHTML = `
                <div class="quiz-complete">
                    <h2>Quiz Complete!</h2>
                    <h3>Well done, ${this.user.username}!</h3>
                    <p>Your final score: <strong>${finalScore}</strong></p>
                    <button id="restart-btn" class="main-btns">Start New Quiz</button>
                </div>
            `;
            
            // Add restart functionality
            const restartBtn = document.getElementById('restart-btn');
            if (restartBtn) {
                restartBtn.addEventListener('click', () => {
                    location.reload(); // Simple restart by reloading the page
                });
            }
        }
    }
}

// generator function for adaptive question selection based on user performance
function* questionGenerator(questions, user, quiz) {
    let currentDifficulty = 'medium'; // start with medium difficulty
    let consecutiveCorrect = 0; // consecutive right answer tracking
    let consecutiveWrong = 0; // consecutive wrong answer tracking
    let questionsAnswered = 0; // keeping track of number of questions answered

    // Ensure first question is medium difficulty
    let mediumQuestionIndex = questions.findIndex(q => q.difficulty === 'medium');
    if (mediumQuestionIndex !== -1 && mediumQuestionIndex !== 0) {
        // Move a medium question to the first position
        const [mediumQuestion] = questions.splice(mediumQuestionIndex, 1);
        questions.unshift(mediumQuestion);
    }

    for (let i = 0; i < 10; i++) {
        const question = questions[i];
        const userAnswer = yield question; // yield to get users answer
        questionsAnswered++; // increment questions answered

        // Check if the answer is correct
        const isCorrect = question.checkAnswer(userAnswer);

        if (isCorrect) {
            consecutiveCorrect++; // increment consecutive right
            consecutiveWrong = 0; // reset consecutive wrong
            console.log(`Correct answer! Consecutive correct: ${consecutiveCorrect}`);
            
            if (consecutiveCorrect >= 3) {
                console.log(`Applying 2x score multiplier for 3+ consecutive correct answers.`);
                quiz.updateScoreMultiplier(question.getDifficultyValue(), 2); // 2x multiplier for 3+ correct
            } else {
                console.log(`Applying 1x score multiplier for less than 3 consecutive correct answers.`);
                quiz.updateScoreMultiplier(question.getDifficultyValue(), 1); // Normal scoring
            }
            if (consecutiveCorrect % 2 === 0 && consecutiveCorrect > 0) {
                currentDifficulty = increaseDifficulty(currentDifficulty);
                console.log(`Increasing difficulty to ${currentDifficulty}`);
            }
            
        } else {
            consecutiveWrong++; // increase consecutive wrong
            consecutiveCorrect = 0; // Reset to avoid immediate further decreases
            
            // Decrease difficulty after 2 consecutive wrong answers
            if (consecutiveWrong >= 2) {
                currentDifficulty = decreaseDifficulty(currentDifficulty);
                console.log(`Decreasing difficulty to ${currentDifficulty}`);
                consecutiveWrong = 0; // Reset to avoid immediate further decreases
            }
        }
        
        // Single adjustment call after processing the answer
        questions = adjustQuestionOrder(questions, currentDifficulty, i);
    }
    console.log(`Quiz completed! Final score: ${user.currentScore} out of ${questionsAnswered} questions.`);
    return user.currentScore;
}


//helper functions for the question generator to increase question difficulty
function increaseDifficulty(currentDifficulty) {
    if (currentDifficulty === 'easy') return 'medium';
    if (currentDifficulty === 'medium') return 'hard';
    return 'hard';
}

function decreaseDifficulty(currentDifficulty) {
    if (currentDifficulty === 'hard') return 'medium';
    if (currentDifficulty === 'medium') return 'easy';
    return 'easy';
}

// Adjust question order to ensure next question matches target difficulty
function adjustQuestionOrder(questions, targetDifficulty, currentIndex) {
    for (let i = currentIndex + 1; i < questions.length; i++) {
        if (questions[i].difficulty === targetDifficulty) {
            const [targetQuestion] = questions.splice(i, 1);
            questions.splice(currentIndex + 1, 0, targetQuestion);
            return questions;
        }
    }
    console.log(`No ${targetDifficulty} questions left to reorder`);
    return questions;
}

// gets the questions from the API
class QuizAPI {
    constructor(baseURL) {
        this.baseURL = "https://opentdb.com/api.php?amount=50&type=multiple";
    }
    // async function to retrieve questions from the API
    async fetchQuestions() {
        try {
            const response = await fetch(this.baseURL);
            const data = await response.json();
            return data.results.map(item => {
                const options = [...item.incorrect_answers];
                const correctIndex = Math.floor(Math.random() * (options.length + 1));
                options.splice(correctIndex, 0, item.correct_answer);
                
                // Decode HTML entities in question text and options
                const decodedQuestion = decodeHtmlEntities(item.question);
                const decodedOptions = options.map(option => decodeHtmlEntities(option));
                return new Question(decodedQuestion, decodedOptions, correctIndex, item.difficulty);
            });
        } catch (error) {
            console.error("Error fetching questions:", error);
            return [];
        }
    }
}

// HTML entity decoding function for Open Trivia DB questions
function decodeHtmlEntities(text) {
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
}


// Get the start button and add event listener
const startBtn = document.getElementById('start-btn');
const usernameInput = document.getElementById('user-name');
const questionBox = document.getElementsByClassName('question-box');

if (startBtn) {
    startBtn.addEventListener('click', async (event) => {
        event.preventDefault(); // Prevent form submission
        
        // Get username from input, alert if empty
        const username = usernameInput.value.trim() || alert('Please enter your name to start the quiz.');

        if (!username) return; // Stop if no valid username

        startBtn.style.display = 'none'; // Hide start button after click
        usernameInput.style.display = 'none'; // Hide input field after click
        Array.from(questionBox).forEach(box => box.style.display = 'grid'); // Show question box after starting the quiz
        
        // Create instances when user clicks start
        const user = new User(username);
        const quizAPI = new QuizAPI();
        const quiz = new Quiz(user, quizAPI);
        
        // Start the quiz
        await quiz.handleStartQuiz();
    });
}
