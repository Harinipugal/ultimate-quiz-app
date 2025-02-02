// DOM Elements
const elements = {
    question: document.getElementById('question'),
    options: document.getElementById('options'),
    nextBtn: document.getElementById('next-btn'),
    feedback: document.getElementById('feedback'),
    scoreDisplay: document.getElementById('score'),
    timeDisplay: document.getElementById('time'),
    streakDisplay: document.getElementById('streak'),
    progressBarFill: document.querySelector('.progress-bar-fill'),
    quizBox: document.querySelector('.quiz-box'),
    resultContainer: document.querySelector('.result-container'),
    retryBtn: document.getElementById('retry-btn'),
    shareBtn: document.getElementById('share-btn'),
    scoreValue: document.getElementById('score-value'),
    timeValue: document.getElementById('time-value'),
    streakValue: document.getElementById('streak-value'),
    levelText: document.querySelector('.level-text'),
    xpFill: document.querySelector('.xp-fill'),
    questionNumber: document.querySelector('.question-number'),
    powerupBtns: {
        fiftyFifty: document.querySelector('.fifty-fifty'),
        timeFreeze: document.querySelector('.time-freeze'),
        hint: document.querySelector('.hint')
    },
    modal: {
        overlay: document.getElementById('modalOverlay'),
        container: document.getElementById('correctModal'),
        closeBtn: document.getElementById('modalClose')
    }
};

// Quiz state
let state = {
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    timeLeft: 30,
    timer: null,
    level: 1,
    xp: 0,
    powerups: {
        fiftyFifty: 2,
        timeFreeze: 1,
        hint: 3
    }
};

// Initialize quiz
async function initQuiz() {
    try {
        resetQuizState();
        await fetchQuestions();
        elements.resultContainer.style.display = 'none';
        elements.quizBox.style.display = 'block';
        startQuiz();
    } catch (error) {
        console.error('Failed to initialize quiz:', error);
        elements.feedback.textContent = 'Failed to load quiz. Please try again.';
    }
}

// Fetch questions from API
async function fetchQuestions() {
    try {
        const response = await fetch('https://opentdb.com/api.php?amount=10&type=multiple');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        if (data.response_code === 0) {
            state.questions = data.results.map(q => ({
                question: decodeHTML(q.question),
                options: shuffleArray([...q.incorrect_answers, q.correct_answer].map(decodeHTML)),
                correctAnswer: decodeHTML(q.correct_answer)
            }));
        } else {
            throw new Error('Failed to fetch questions');
        }
    } catch (error) {
        console.error('Error fetching questions:', error);
        throw error;
    }
}

// Start quiz
function startQuiz() {
    displayQuestion();
    startTimer();
    updateUI();
    updatePowerupUI();
}

// Display question
function displayQuestion() {
    const currentQuestion = state.questions[state.currentQuestionIndex];
    if (!currentQuestion) {
        console.error('No question found at index:', state.currentQuestionIndex);
        return;
    }

    elements.question.textContent = currentQuestion.question;
    elements.options.innerHTML = '';
    elements.questionNumber.textContent = `Question ${state.currentQuestionIndex + 1}/${state.questions.length}`;
    
    currentQuestion.options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option;
        button.onclick = () => checkAnswer(option);
        elements.options.appendChild(button);
    });
    
    elements.nextBtn.style.display = 'none';
    elements.progressBarFill.style.width = `${(state.currentQuestionIndex / state.questions.length) * 100}%`;
}

// Check answer
function checkAnswer(selectedAnswer) {
    const correctAnswer = state.questions[state.currentQuestionIndex].correctAnswer;
    const isCorrect = selectedAnswer === correctAnswer;
    
    const buttons = elements.options.getElementsByTagName('button');
    Array.from(buttons).forEach(button => {
        if (button.textContent === correctAnswer) {
            button.classList.add('correct');
        } else if (button.textContent === selectedAnswer && !isCorrect) {
            button.classList.add('incorrect');
        }
        button.disabled = true;
    });
    
    if (isCorrect) {
        handleCorrectAnswer();
    } else {
        handleIncorrectAnswer();
    }
    
    elements.nextBtn.style.display = 'block';
    updateUI();
}

// Handle correct answer
function handleCorrectAnswer() {
    state.streak++;
    state.bestStreak = Math.max(state.streak, state.bestStreak);
    state.score += calculatePoints();
    state.xp += 20;
    
    elements.feedback.textContent = 'Correct! ';
    elements.feedback.className = 'feedback correct';
    
    // Show the modal
    showCorrectAnswerModal();
    
    if (state.xp >= 100) {
        levelUp();
    }
    
    checkAchievements();
}

// Handle incorrect answer
function handleIncorrectAnswer() {
    state.streak = 0;
    elements.feedback.textContent = `Wrong! The correct answer was: ${state.questions[state.currentQuestionIndex].correctAnswer}`;
    elements.feedback.className = 'feedback incorrect';
}

// Calculate points
function calculatePoints() {
    let points = 10;
    points += Math.floor(state.timeLeft * 0.5);
    points += Math.floor(state.streak * 2);
    return points;
}

// Level up
function levelUp() {
    state.level++;
    state.xp = 0;
    elements.levelText.textContent = `Level ${state.level}`;
    showLevelUpAnimation();
    updateUI();
}

// Show level up animation
function showLevelUpAnimation() {
    const levelUpMessage = document.createElement('div');
    levelUpMessage.className = 'level-up-message';
    levelUpMessage.textContent = `Level ${state.level}! `;
    document.body.appendChild(levelUpMessage);
    
    setTimeout(() => {
        levelUpMessage.remove();
    }, 2000);
}

// Timer functions
function startTimer() {
    state.timeLeft = 30;
    updateTimer();
    clearInterval(state.timer);
    state.timer = setInterval(() => {
        state.timeLeft--;
        updateTimer();
        if (state.timeLeft <= 0) {
            handleTimeout();
        }
    }, 1000);
}

function updateTimer() {
    elements.timeDisplay.textContent = `${state.timeLeft}s`;
}

function handleTimeout() {
    clearInterval(state.timer);
    disableOptions();
    elements.feedback.textContent = 'Time\'s up! ';
    elements.feedback.className = 'feedback incorrect';
    elements.nextBtn.style.display = 'block';
}

// Power-up functions
function usePowerup(type) {
    if (state.powerups[type] > 0) {
        state.powerups[type]--;
        
        switch(type) {
            case 'fiftyFifty':
                useFiftyFifty();
                break;
            case 'timeFreeze':
                useTimeFreeze();
                break;
            case 'hint':
                useHint();
                break;
        }
        
        updatePowerupUI();
    }
}

function useFiftyFifty() {
    const correctAnswer = state.questions[state.currentQuestionIndex].correctAnswer;
    const buttons = elements.options.getElementsByTagName('button');
    const incorrectButtons = Array.from(buttons).filter(btn => btn.textContent !== correctAnswer);
    
    shuffleArray(incorrectButtons)
        .slice(0, 2)
        .forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        });
}

function useTimeFreeze() {
    clearInterval(state.timer);
    elements.timeDisplay.classList.add('frozen');
    
    setTimeout(() => {
        elements.timeDisplay.classList.remove('frozen');
        startTimer();
    }, 5000);
}

function useHint() {
    const correctAnswer = state.questions[state.currentQuestionIndex].correctAnswer;
    elements.feedback.textContent = `Hint: The answer starts with "${correctAnswer[0]}"`;
    elements.feedback.className = 'feedback hint';
}

// Next question
function nextQuestion() {
    state.currentQuestionIndex++;
    
    if (state.currentQuestionIndex < state.questions.length) {
        resetQuestionState();
        displayQuestion();
        startTimer();
    } else {
        endQuiz();
    }
}

// End quiz
function endQuiz() {
    clearInterval(state.timer);
    elements.quizBox.style.display = 'none';
    elements.resultContainer.style.display = 'block';
    
    elements.scoreValue.textContent = state.score;
    elements.timeValue.textContent = formatTime(30 - state.timeLeft);
    elements.streakValue.textContent = state.bestStreak;

    // Show final celebration based on performance
    let celebrationMessage = '';
    let celebrationIcon = '';
    
    if (state.score >= 1000) {
        celebrationMessage = 'Outstanding Performance! 🌟';
        celebrationIcon = '👑';
    } else if (state.score >= 750) {
        celebrationMessage = 'Excellent Work! ⭐';
        celebrationIcon = '🏆';
    } else if (state.score >= 500) {
        celebrationMessage = 'Great Job! 🎉';
        celebrationIcon = '🎯';
    } else {
        celebrationMessage = 'Well Done! 👏';
        celebrationIcon = '🎮';
    }

    showAchievement(celebrationMessage, `Final Score: ${state.score} points!`, celebrationIcon);
    createConfetti();
}

// Achievement functions
function checkAchievements() {
    if (state.streak === 3) {
        showAchievement('Hot Streak! 🔥', 'Three correct answers in a row! Keep going!', '🎯');
        createConfetti();
    }
    
    if (state.streak === 5) {
        showAchievement('Unstoppable! ⚡', 'Five correct answers in a row! You\'re amazing!', '🏆');
        createConfetti();
    }
    
    if (state.score >= 1000) {
        showAchievement('High Score! 🌟', 'Incredible score! You\'re a quiz master!', '👑');
        createConfetti();
    }

    // Perfect round achievement
    if (state.currentQuestionIndex === state.questions.length - 1 && state.streak === state.questions.length) {
        showAchievement('Perfect Round! 🎯', 'Wow! You got all questions right!', '🎮');
        createConfetti();
    }
}

function showAchievement(title, description, icon) {
    const achievement = document.createElement('div');
    achievement.className = 'achievement';
    achievement.innerHTML = `
        <div class="achievement-title">
            <span class="achievement-icon">${icon}</span>
            ${title}
        </div>
        <div class="achievement-description">${description}</div>
    `;
    document.body.appendChild(achievement);
    
    setTimeout(() => {
        achievement.remove();
    }, 3000);
}

function createConfetti() {
    const colors = ['#6366f1', '#818cf8', '#f59e0b', '#22c55e', '#ec4899'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animation = `confettiFall ${1 + Math.random() * 2}s linear forwards`;
        document.body.appendChild(confetti);
        
        setTimeout(() => {
            confetti.remove();
        }, 3000);
    }
}

// Show correct answer modal
function showCorrectAnswerModal() {
    elements.modal.overlay.classList.add('show');
    elements.modal.container.classList.add('show');
    createConfetti();
}

// Hide correct answer modal
function hideCorrectAnswerModal() {
    elements.modal.overlay.classList.remove('show');
    elements.modal.container.classList.remove('show');
}

// Helper functions
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function decodeHTML(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function disableOptions() {
    const buttons = elements.options.getElementsByTagName('button');
    Array.from(buttons).forEach(button => button.disabled = true);
}

// Reset functions
function resetQuizState() {
    state.currentQuestionIndex = 0;
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.level = 1;
    state.xp = 0;
    state.powerups = {
        fiftyFifty: 2,
        timeFreeze: 1,
        hint: 3
    };
    clearInterval(state.timer);
}

function resetQuestionState() {
    elements.feedback.textContent = '';
    elements.feedback.className = 'feedback';
    elements.nextBtn.style.display = 'none';
    updateUI();
}

// Update UI
function updateUI() {
    elements.scoreDisplay.textContent = state.score;
    elements.streakDisplay.textContent = state.streak;
    elements.xpFill.style.width = `${state.xp}%`;
    elements.levelText.textContent = `Level ${state.level}`;
}

function updatePowerupUI() {
    Object.entries(state.powerups).forEach(([type, count]) => {
        const btn = elements.powerupBtns[type];
        if (btn) {
            const countElement = btn.querySelector('.powerup-count');
            if (countElement) {
                countElement.textContent = count;
            }
            btn.disabled = count === 0;
        }
    });
}

// Event Listeners
elements.nextBtn.addEventListener('click', nextQuestion);
elements.retryBtn.addEventListener('click', () => {
    elements.resultContainer.style.display = 'none';
    elements.quizBox.style.display = 'block';
    initQuiz();
});

elements.shareBtn.addEventListener('click', () => {
    const text = `I scored ${state.score} points in Kakarot's Quiz App! Can you beat my score? `;
    if (navigator.share) {
        navigator.share({
            title: "Kakarot's Quiz Score",
            text: text,
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(text)
            .then(() => alert('Score copied to clipboard!'))
            .catch(console.error);
    }
});

// Power-up event listeners
Object.entries(elements.powerupBtns).forEach(([type, btn]) => {
    btn.addEventListener('click', () => usePowerup(type));
});

elements.modal.closeBtn.addEventListener('click', () => {
    hideCorrectAnswerModal();
    elements.nextBtn.click(); // Automatically move to next question
});

elements.modal.overlay.addEventListener('click', () => {
    hideCorrectAnswerModal();
    elements.nextBtn.click(); // Automatically move to next question
});

// Start the quiz
document.addEventListener('DOMContentLoaded', () => {
    elements.quizBox.style.display = 'block';
    initQuiz();
});
